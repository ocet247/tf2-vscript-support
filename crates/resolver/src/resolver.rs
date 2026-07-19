use la_arena::Idx;
use rustc_hash::{FxHashMap, FxHashSet};
use sq_3_parser::{
    AstNode, SyntaxKind, SyntaxNode, SyntaxNodePtr, SyntaxToken, TextRange, TextSize,
    ast::{
        self, ArrayLiteralExpression, BaseExpression, BinaryExpression, BinaryOperator,
        BlockStatement, BreakStatement, CallExpression, ClassExpression, ClassStatement,
        CloneExpression, ConditionalExpression, ConstStatement, ContinueStatement,
        DeleteExpression, DoWhileStatement, DocComment, DocType, ElementAccessExpression,
        EnumStatement, Expr, ExpressionStatement, ExpressionWrapper, ForEachStatement,
        ForInitialiserKind, ForStatement, FunctionBody, FunctionExpression, FunctionStatement,
        HasBody, HasDoc, HasDocDescription, HasDocName, HasDocType, HasDocTypes, HasName,
        HasOperand, IfStatement, IsClass, IsClassMember, IsFunction, LambdaExpression,
        LiteralExpression, LiteralExpressionKind, LocalFunctionDeclaration,
        LocalVariableDeclaration, Member, MemberAccessExpression, MemberName, Name, Parameter,
        ParenthesisedExpression, PostfixUpdateExpression, PostfixUpdateOperator,
        PrefixUnaryExpression, PrefixUnaryOperator, PrefixUpdateExpression, PrefixUpdateOperator,
        Property, QualifiedName, RawCallExpression, ResumeExpression, ReturnStatement,
        RootAccessExpression, SourceFile, Stmt, StringNameKind, SwitchClause, SwitchStatement,
        TableLiteralExpression, Tag, ThisExpression, ThrowStatement, TryStatement,
        TypeOfExpression, VarTag, VariableDeclaration, WhileStatement, YieldStatement,
    },
};
use string_literals::CLASSNAMES_TO_CLASSES;

use crate::{
    Diagnostic, DiagnosticSeverity, ExpressionKind, File, FindSymbol, FunctionIdResolution,
    ImportMembers, NullableExprKind, Source, SourceSymbol, TypeWithRange, UnreachableCode,
    UnusedVariables, VScriptDatabase,
    arena::{
        ArenaAlloc, ArenaId, ArrayData, ArrayId, ClassData, ClassId, Container, EnumData, EnumId,
        FunctionData, FunctionFlags, FunctionId, ImportTarget, Inherits, ParamsState, Scope,
        ScopeId, SourceArena, StringLiteralData, StringLiteralId, SymbolId, TableData, TableId,
        TypeConversionError, TypeState,
    },
    db::NativeFunction,
    symbol::{
        LocalKind, Primitive, StringKind, Symbol, SymbolFlags, SymbolKind, SymbolTable,
        ToPrimitiveError, Type, TypeFlags, Union, insert_symbol, merge_types,
    },
};

macro_rules! dispatch_union {
    // For methods returning Option<T>
    ($self:ident, $operand:expr, $error_keyword:expr, $single_method:ident $(, $extra:expr)*) => {{
        match &$operand.kind {
            Type::Enum(_) => {
                $self.no_support("enum", $error_keyword, $operand.range);
                None
            }
            Type::Primitive(prim) => $self.$single_method( prim.clone(), $operand.range, $($extra,)* true),
            Type::Union(union) =>  {
                let mut merged: Option<Type> = None;
                for prim in union.primitives.iter() {
                    if let Some(result) = $self.$single_method(
                        prim.clone(),
                        $operand.range,
                        $($extra,)*
                        false,
                    ) {
                        merged = Some(match merged {
                            None => result,
                            Some(existing) => merge_types(&existing, &result),
                        });
                    }
                }
                if merged.is_none() && !union.flags.intersects(TypeFlags::ANY) {
                    $self.no_support(&$self.type_to_str(&$operand.kind), $error_keyword, $operand.range);
                }
                merged
            }
        }
    }};
}

#[derive(Debug, Clone)]
enum AssignmentLeftHandSide {
    CanCreate {
        parent: Type,
        expr_range: TextRange,
        new_key: Box<str>,
        name_range: TextRange,
    },
    // Parent doesn't exist for locals
    Exists {
        parent: Option<Type>,
        expr_range: TextRange,
        symbol: SymbolId,
        name_range: TextRange,
    },
    NonStringName {
        parent: Type,
        expr_range: TextRange,
        name: TypeWithRange,
    },
    Invalid(NullableExprKind),
}

const fn to_operand_and_arguments(
    parent: Type,
    expr_range: TextRange,
    name_range: TextRange,
    argument: TypeWithRange,
) -> (TypeWithRange, [TypeWithRange; 2]) {
    let operand = TypeWithRange {
        kind: parent,
        range: expr_range,
    };

    let arguments = [
        TypeWithRange {
            kind: Type::STRING,
            range: name_range,
        },
        argument,
    ];

    (operand, arguments)
}

fn lhs_container(lhs: Option<&AssignmentLeftHandSide>) -> Option<Container> {
    let parent = match lhs {
        Some(
            AssignmentLeftHandSide::CanCreate { parent, .. }
            | AssignmentLeftHandSide::NonStringName { parent, .. },
        ) => parent,
        Some(AssignmentLeftHandSide::Exists { parent, .. }) => parent.as_ref()?,
        Some(AssignmentLeftHandSide::Invalid(_)) | None => return None,
    };

    parent.find(|prim| Container::try_from(prim).ok())
}

impl From<&AssignmentLeftHandSide> for NullableExprKind {
    fn from(value: &AssignmentLeftHandSide) -> Self {
        match value {
            AssignmentLeftHandSide::Exists { symbol, .. } => Some(ExpressionKind::Symbol(*symbol)),
            AssignmentLeftHandSide::Invalid(key) => key.clone(),
            AssignmentLeftHandSide::CanCreate { .. }
            | AssignmentLeftHandSide::NonStringName { .. } => None,
        }
    }
}

fn get_name<T: HasName>(node: &T) -> Option<(TextRange, Box<str>)> {
    let name = node.name()?;
    let token = name.identifier()?;
    Some((token.text_range(), token.text().into()))
}

impl TryFrom<AssignmentLeftHandSide> for Type {
    type Error = ();
    fn try_from(value: AssignmentLeftHandSide) -> Result<Self, Self::Error> {
        match value {
            AssignmentLeftHandSide::CanCreate { parent, .. }
            | AssignmentLeftHandSide::NonStringName { parent, .. } => Ok(parent),
            AssignmentLeftHandSide::Exists { parent, .. } => parent.ok_or(()),
            AssignmentLeftHandSide::Invalid(_) => Err(()),
        }
    }
}

impl TryFrom<AssignmentLeftHandSide> for Container {
    type Error = TypeConversionError;

    fn try_from(value: AssignmentLeftHandSide) -> Result<Self, Self::Error> {
        let typ = Type::try_from(value).map_err(|()| TypeConversionError::WrongType)?;
        Self::try_from(&typ)
    }
}

struct DeferredFunctionTrace {
    node: Box<dyn IsFunction>,
    scope: ScopeId,
    raw_param_types: Vec<Option<TypeWithRange>>,
}

struct DeferredFunctionEntry {
    idx: Idx<FunctionData>,
    trace: DeferredFunctionTrace,
}

#[derive(Debug, Clone, Copy)]
enum CheckTypeSource {
    Variable,
    Parameter,
    VarArgs,
    Return,
    Throw,
    Yield,
}

#[derive(Debug, Clone, Copy)]
enum NewSlotResult {
    CanAdd(Container),
    Allowed,
    NotAllowed,
}

#[derive(Debug, Clone, Copy)]
enum FunctionContainerError {
    SingleName,
    FailedToResolve,
}

#[derive(Debug, Default)]
struct SymbolDocInfo {
    description: Option<String>,
    typ: Option<Type>,
    flags: SymbolFlags,
    range: TextRange,
}

pub struct Resolver<'db> {
    db: &'db dyn VScriptDatabase,
    file: File,

    imports: FxHashMap<ImportTarget, Vec<File>>,

    arena: SourceArena,
    source_table: Idx<TableData>,
    const_table: Idx<TableData>,
    root_table: Idx<TableData>,

    scope: ScopeId,

    /// The container new members will be added to. Note that this is different from
    /// container that we take symbols from. That one is stored on the scope and can
    /// be acquired via .`execution_container()`
    container: Container,

    can_break: bool,
    can_continue: bool,
    dead_code: bool,

    function: Option<Idx<FunctionData>>,
    /// Persists for the lifetime of the resolver — a function's trace gets checked
    /// out (removed) while its body is being resolved and checked back in when done.
    /// Never deleted, so a function can be re-resolved as many times as a call site
    /// genuinely widens one of its parameters.
    traces: FxHashMap<Idx<FunctionData>, DeferredFunctionTrace>,
    /// Whether a function's @doc tags have been folded into its param types yet.
    /// This must happen exactly once — see `resolve_deferred_function_entry`.
    resolved_once: FxHashSet<Idx<FunctionData>>,
    /// Insertion order, used only for the end-of-file backstop pass over functions
    /// that were never called from anywhere (dead code, or values only ever handed
    /// to an opaque native sink).
    pending_functions: Vec<Idx<FunctionData>>,

    range_to_expr: FxHashMap<TextRange, ExpressionKind>,
    range_to_symbol: FxHashMap<TextRange, SymbolId>,
    doc_to_symbol: FxHashMap<TextRange, SymbolId>,
    symbol_to_ranges: FxHashMap<SymbolId, Vec<TextRange>>,
    diagnostics: Vec<Diagnostic>,
}

impl Source for Resolver<'_> {
    fn file(&self) -> File {
        self.file
    }

    fn db(&self) -> &dyn VScriptDatabase {
        self.db
    }

    fn arena(&self) -> &SourceArena {
        &self.arena
    }

    fn imports(&self) -> &FxHashMap<ImportTarget, Vec<File>> {
        &self.imports
    }

    fn scope(&self, _: TextSize) -> ScopeId {
        self.scope
    }

    fn source_table(&self) -> TableId {
        TableId::new(self.file, self.source_table)
    }

    fn root_table(&self) -> TableId {
        TableId::new(self.file, self.root_table)
    }

    fn const_table(&self) -> TableId {
        TableId::new(self.file, self.const_table)
    }

    fn range_to_expr(&self) -> &FxHashMap<TextRange, ExpressionKind> {
        &self.range_to_expr
    }

    fn range_to_symbol(&self) -> &FxHashMap<TextRange, SymbolId> {
        &self.range_to_symbol
    }

    fn doc_to_symbol(&self) -> &FxHashMap<TextRange, SymbolId> {
        &self.doc_to_symbol
    }

    fn symbol_to_ranges(&self) -> &FxHashMap<SymbolId, Vec<TextRange>> {
        &self.symbol_to_ranges
    }

    fn get<T>(&self, id: T) -> &T::Data
    where
        T: ArenaId,
        SourceArena: std::ops::Index<Idx<T::Data>, Output = T::Data>,
    {
        // To avoid cycle, get the data from the current file from here
        if id.file() != self.file {
            return id.get_data(self.db);
        }

        &self.arena[id.idx()]
    }

    fn diagnostics(&self) -> &[Diagnostic] {
        &self.diagnostics
    }
}

impl<'db> Resolver<'db> {
    pub fn symbol_from_source_file(
        db: &'db dyn VScriptDatabase,
        file: File,
        node: &SourceFile,
    ) -> SourceSymbol {
        let mut arena = SourceArena::default();
        // Source table is not always the root table, it depends on which entity
        // was the script executed. script_execute and non-edict entities execute stuff
        // in the root while edict entities with 'vscripts' keyvalue will have their
        // script scope as the execution context
        // This should also drive whether 'self' is present in the scope
        // TODO: Get source file's jsdoc and determine
        let source_table = arena.alloc(TableData::default());
        let container = Container::Table(TableId::new(file, source_table));
        let root_table = arena.alloc(TableData::default());
        let const_table = arena.alloc(TableData::default());
        let scope = arena.alloc(Scope {
            range: node.syntax().text_range(),
            ..Default::default()
        });

        let mut imports = FxHashMap::default();
        let mut libs = Vec::new();
        if let Some(squirrel_lib) = db.squirrel_lib()
            && squirrel_lib != file
        {
            libs.push(squirrel_lib);
        }

        if let Some(vscript_lib) = db.vscript_lib()
            && vscript_lib != file
            && Some(file) != db.squirrel_lib()
        {
            libs.push(vscript_lib);
        }

        // Include by default for now
        if let Some(folded_lib) = db.folded_lib()
            && folded_lib != file
            && Some(file) != db.squirrel_lib()
            && Some(file) != db.vscript_lib()
        {
            libs.push(folded_lib);
        }

        if !libs.is_empty() {
            imports.insert(ImportTarget::Table(TableId::new(file, root_table)), libs);
        }

        let mut this = Self {
            db,
            file,
            imports,
            scope,
            container,
            can_break: false,
            can_continue: false,
            dead_code: false,
            arena,
            source_table,
            const_table,
            root_table,
            function: None,
            traces: FxHashMap::default(),
            resolved_once: FxHashSet::default(),
            pending_functions: Vec::new(),
            range_to_expr: FxHashMap::default(),
            range_to_symbol: FxHashMap::default(),
            doc_to_symbol: FxHashMap::default(),
            symbol_to_ranges: FxHashMap::default(),
            diagnostics: Vec::new(),
        };

        let mut is_native = false;
        if let Some(doc) = node.doc() {
            for tag in doc.tags() {
                match tag {
                    Tag::Native(_) => is_native = true,
                    Tag::Var(tag) => {
                        this.var_tag(&tag);
                    }
                    _ => {}
                }
            }
        }

        for stmt in node.statements() {
            this.collect_stmt(&stmt);
        }

        assert_eq!(this.arena[this.scope].parent, None);

        // Resolve remaining functions
        let offset = node.syntax().text_range().end() + TextSize::new(1);
        let mut function_i = 0;

        loop {
            while function_i < this.pending_functions.len()
                && this
                    .resolved_once
                    .contains(&this.pending_functions[function_i])
            {
                function_i += 1;
            }

            if function_i < this.pending_functions.len() {
                let idx = this.pending_functions[function_i];
                function_i += 1;
                if let Some(trace) = this.traces.remove(&idx) {
                    let entry = DeferredFunctionEntry { idx, trace };
                    this.resolve_function_doc(&entry, offset);
                    this.resolve_deferred_function_entry(entry);
                }
                continue;
            }

            break;
        }

        if !is_native && this.db.config().unused_variables != UnusedVariables::Off {
            this.unused_variables_diagnostics();
        }

        this.deprecated_diagnostics();

        SourceSymbol {
            imports: this.imports,
            arena: this.arena,
            const_table,
            root_table,
            source_table,
            range_to_expr: this.range_to_expr,
            range_to_symbol: this.range_to_symbol,
            doc_to_symbol: this.doc_to_symbol,
            symbol_to_ranges: this.symbol_to_ranges,
            diagnostics: this.diagnostics,
        }
    }

    pub fn get_mut<T>(&mut self, id: T) -> Option<&mut T::Data>
    where
        T: ArenaId,
        SourceArena: std::ops::IndexMut<Idx<T::Data>, Output = T::Data>,
    {
        if id.file() != self.file {
            return None;
        }

        Some(&mut self.arena[id.idx()])
    }

    fn new_reference(&mut self, range: TextRange, id: SymbolId) {
        self.range_to_symbol.insert(range, id);
        self.symbol_to_ranges
            .entry(id)
            .and_modify(|list| list.push(range))
            .or_insert_with(|| vec![range]);
    }

    fn symbol(&mut self, symbol: Symbol) -> SymbolId {
        let name_range = symbol.name_range;
        let id = SymbolId::new(self.file, self.arena.alloc(symbol));
        self.new_reference(name_range, id);
        id
    }

    #[allow(clippy::too_many_arguments)]
    fn symbol_with_info<T: HasDoc>(
        &mut self,
        node: &T,
        kind: SymbolKind,
        name: Box<str>,
        name_range: TextRange,
        extra_flags: SymbolFlags,
        fallback_type: Type,
        check_type: Option<(TypeWithRange, CheckTypeSource)>,
    ) -> SymbolId {
        let sym_node = SyntaxNodePtr::new(node.syntax());
        if let Some(info) = self.resolve_variable_doc(node, &name, name_range) {
            let typ = info.typ.as_ref().map_or(fallback_type, |doc_type| {
                check_type.map_or_else(
                    || doc_type.clone(),
                    |(expr_type, source)| {
                        self.check_type(doc_type, &expr_type.kind, source, expr_type.range)
                    },
                )
            });
            let id = self.symbol(Symbol {
                name: name.clone(),
                kind,
                name_range,
                node: sym_node,
                is_type_explicit: info.typ.is_some(),
                typ,
                description: info.description,
                flags: extra_flags | info.flags,
            });
            self.doc_to_symbol.insert(info.range, id);
            id
        } else {
            self.symbol(Symbol {
                name,
                kind,
                name_range,
                node: sym_node,
                is_type_explicit: false,
                typ: fallback_type,
                description: None,
                flags: extra_flags,
            })
        }
    }

    fn set_symbol(&mut self, typ: &Type, symbol: SymbolId) {
        if let Ok(id) = typ.to_class()
            && let Some(class) = self.get_mut(id)
            && class.symbol.is_none()
        {
            class.symbol = Some(symbol);
        }

        if let Ok(id) = typ.to_function()
            && let Some(function) = self.get_mut(id)
            && function.symbol.is_none()
        {
            function.symbol = Some(symbol);
        }
    }

    fn class(&mut self, class: &impl IsClass) -> ClassId {
        let expr = class.extends().and_then(|e| e.expression());

        let inherits = if let Some(expr) = expr {
            let typ = self.expr_to_type(&expr);
            match typ.to_class() {
                Ok(id) => Inherits::Yes(id),
                Err(ToPrimitiveError::WrongType) => {
                    self.diagnostics.push(Diagnostic {
                        message: format!(
                            "Trying to inherit from '{}'",
                            self.type_to_str_generic(&typ)
                        ),
                        range: expr.syntax().text_range(),
                        ..Default::default()
                    });
                    Inherits::YesButUnknown
                }
                Err(ToPrimitiveError::WrongTypeWithAny | ToPrimitiveError::NotSpecific) => {
                    Inherits::YesButUnknown
                }
            }
        } else {
            Inherits::No
        };

        ClassId::new(
            self.file,
            self.arena.alloc(ClassData {
                inherits,
                members: SymbolTable::default(),
                symbol: None,
            }),
        )
    }

    fn array(&mut self, kind: Type) -> ArrayId {
        ArrayId::new(self.file, self.arena.alloc(ArrayData { kind }))
    }

    fn string(&mut self, token_result: &(StringNameKind, SyntaxToken)) -> StringLiteralId {
        let (left_offset, right_offset, text) = match token_result.0 {
            StringNameKind::Normal => {
                let input = token_result.1.text();
                let (s, left) = input.strip_prefix('"').map_or((input, 0u32), |s| (s, 1));
                let (s, right) = s.strip_suffix('"').map_or((s, 0u32), |s| (s, 1));

                (left, right, s.to_owned())
            }
            StringNameKind::Verbatim => {
                let input = token_result.1.text();
                let (s, left) = input.strip_prefix("@\"").map_or((input, 0u32), |s| (s, 2));
                let (s, right) = s.strip_suffix('"').map_or((s, 0u32), |s| (s, 1));

                (
                    left,
                    right,
                    s.replace('\n', "\\n")
                        .replace('\r', "\\r")
                        .replace("\"\"", "\\\""),
                )
            }
        };

        let range = token_result.1.text_range();

        let unquoted_range = TextRange::new(
            range.start() + TextSize::new(left_offset),
            range.end() - TextSize::new(right_offset),
        );

        StringLiteralId::new(
            self.file,
            self.arena.alloc(StringLiteralData {
                text: text.into_boxed_str(),
                range,
                unquoted_range,
            }),
        )
    }

    fn current_scope(&mut self) -> &mut Scope {
        &mut self.arena[self.scope]
    }

    fn enter_scope(&mut self, range: TextRange) {
        self.scope = self.arena.alloc(Scope {
            parent: Some(self.scope),
            locals: SymbolTable::default(),
            range,
            function: self.function,
            flow_types: FxHashMap::default(),
        });
    }

    fn exit_scope(&mut self) {
        self.dead_code = false;
        self.scope = self.arena[self.scope]
            .parent
            .expect("We shouldn't use exit_scope without enter_scope first");
    }

    fn execution_container(&self) -> Container {
        self.function.map_or_else(
            || Container::Table(self.source_table()),
            |id| {
                let function = &self.arena[id];
                function.bindenv.unwrap_or(function.container)
            },
        )
    }

    fn add_current_container_member(&mut self, name: Box<str>, symbol: SymbolId) {
        self.add_container_member(self.container, name, symbol);
    }

    fn add_container_member(&mut self, container: Container, name: Box<str>, symbol: SymbolId) {
        match container {
            Container::Table(id) => {
                if let Some(t) = self.get_mut(id) {
                    insert_symbol(&mut t.members, name, symbol);
                }
            }
            Container::Class(id) | Container::Instance(id) => {
                if let Some(c) = self.get_mut(id) {
                    insert_symbol(&mut c.members, name, symbol);
                }
            }
            Container::Enum(id) => {
                if let Some(e) = self.get_mut(id) {
                    insert_symbol(&mut e.members, name, symbol);
                }
            }
        }
    }

    /// This is only a speculation, you can actually execute static member as an instance
    /// and the other way around. The best approximation is this though
    fn try_swap_to_instance(
        &mut self,
        member: &impl IsClassMember,
        method_id: Option<FunctionId>,
    ) -> bool {
        if let Container::Class(id) = self.container
            && member.static_keyword().is_none()
        {
            if let Some(func) = method_id.and_then(|id| self.get_mut(id)) {
                func.container = Container::Instance(id);
            }

            true
        } else {
            false
        }
    }

    fn no_member_error(&mut self, obj: &Type, member_name: &str, error_range: TextRange) {
        if obj.type_flags().intersects(TypeFlags::HAS_MEMBERS_OR_ANY) {
            return;
        }

        let message = if let Type::Enum(id) = obj
            && let Some(symbol) = self.get(*id).symbol
        {
            let name = &self.get(symbol).name;
            format!("enum '{name}' has no member named '{member_name}'")
        } else {
            format!(
                "'{}' has no member named '{}'",
                self.type_to_str_generic(obj),
                member_name
            )
        };

        self.diagnostics.push(Diagnostic {
            message,
            range: error_range,
            ..Default::default()
        });
    }

    fn resolve_name(&self, text: &str, offset: TextSize) -> Option<SymbolId> {
        let filter = |(name, id): (Box<str>, SymbolId)| (name.as_ref() == text).then_some(id);

        let locals = self.local_members(offset).into_iter().find_map(filter);

        let consts = || {
            self.members_of_table(
                self.const_table(),
                FindSymbol::OnlyBefore(offset),
                ImportMembers::Const,
                false,
            )
            .into_iter()
            .find_map(filter)
        };

        let members = || {
            self.members_of_container(
                self.execution_container(),
                FindSymbol::BeforeIfInExecutionRange(offset, self.scope),
                false,
            )
            .into_iter()
            .find_map(filter)
        };

        let root = || {
            self.members_of_table(
                self.root_table(),
                FindSymbol::BeforeIfInExecutionRange(offset, self.scope),
                ImportMembers::Root,
                false,
            )
            .into_iter()
            .find_map(filter)
        };

        locals.or_else(consts).or_else(members).or_else(root)
    }

    fn doc_type_single(&mut self, typ: &DocType, offset: TextSize) -> Option<Type> {
        Some(match typ {
            DocType::Name(name) => {
                let identifier = name.identifier()?;
                let text = identifier.text();
                let typ = match text {
                    "any" => Type::ANY,
                    "int" | "integer" => Type::INTEGER,
                    "float" => Type::FLOAT,
                    "string" => Type::STRING,
                    "bool" | "boolean" => Type::BOOL,
                    "null" => Type::NULL,
                    "instance" => Type::INSTANCE,
                    "array" => Type::ARRAY,
                    "table" => Type::TABLE,
                    "class" => Type::CLASS,
                    "function" => Type::FUNCTION,
                    "generator" => Type::GENERATOR,
                    "thread" => Type::THREAD,
                    "weakref" => Type::WEAKREF,
                    "this" => Type::THIS,
                    _ => {
                        if let Ok(kind) = text.parse::<StringKind>() {
                            Type::Primitive(Primitive::String {
                                kind,
                                literal: None,
                            })
                        } else {
                            let Some(id) = self.resolve_name(text, offset) else {
                                self.diagnostics.push(Diagnostic {
                                    message: format!(
                                        "Couldn't find type '{identifier}', defaulting to using 'any'"
                                    ),
                                    range: name.syntax().text_range(),
                                    severity: DiagnosticSeverity::Information,
                                });
                                return Some(Type::ANY);
                            };

                            let Ok(id) = &self.get(id).typ.to_class() else {
                                return Some(Type::ANY);
                            };

                            Type::Primitive(Primitive::Instance(Some(*id)))
                        }
                    }
                };

                if let Some(symbol) = self.type_to_symbol(&typ) {
                    self.new_reference(name.syntax().text_range(), symbol);
                }

                typ
            }
            DocType::Array(array) => {
                let typ = self.doc_type(array.types(), offset).unwrap_or(Type::ANY);
                Type::Primitive(Primitive::Array(Some(self.array(typ))))
            }
        })
    }

    fn doc_type(
        &mut self,
        mut types: impl Iterator<Item = DocType>,
        offset: TextSize,
    ) -> Option<Type> {
        let first = types.next()?;

        let mut last_type = self.doc_type_single(&first, offset);
        for typ in types {
            let Some(next_type) = self.doc_type_single(&typ, offset) else {
                continue;
            };

            if let Some(typ) = last_type {
                last_type = Some(merge_types(&typ, &next_type));
            } else {
                last_type = Some(next_type);
            }
        }

        last_type
    }

    fn check_primitive(
        &mut self,
        original: Primitive,
        other: Primitive,
        error_range: TextRange,
    ) -> Option<Primitive> {
        match (original, other) {
            (
                Primitive::String { kind, .. },
                Primitive::String {
                    literal: Some(literal),
                    ..
                },
            ) => {
                let text = &self.get(literal).text;

                let text = if kind.is_case_sensetive() {
                    text.to_string()
                } else {
                    text.to_lowercase()
                };

                match kind {
                    StringKind::Script => {
                        if let Err(message) = self.db().get_script(&text) {
                            self.diagnostics.push(Diagnostic {
                                message,
                                range: error_range,
                                severity: DiagnosticSeverity::Information,
                            });
                        }
                    }

                    StringKind::Classname => {
                        if let Some(message) = kind
                            .values()
                            .is_some_and(|values| !values.iter().any(|set| set.0.contains(&text)))
                            .then_some("Cannot use non-default classname")
                        {
                            self.diagnostics.push(Diagnostic {
                                message: message.to_owned(),
                                range: error_range,
                                severity: DiagnosticSeverity::Warning,
                            });
                        }
                    }
                    _ => {}
                }

                let prim = Primitive::String {
                    kind,
                    literal: Some(literal),
                };

                if literal.file() == self.file {
                    self.range_to_expr.insert(
                        self.get(literal).range,
                        ExpressionKind::Literal(Type::Primitive(prim)),
                    );
                }

                Some(prim)
            }
            (Primitive::Instance(Some(original_id)), Primitive::Instance(Some(other_id))) => {
                let mut class_id = Some(other_id);
                while let Some(id) = class_id {
                    if id == original_id {
                        return Some(original);
                    }
                    let class = self.get(id);
                    class_id = class.inherits.into();
                }

                // If we have a function that specifies return only as a mutual superclass
                // instance rather than union of all possible instances we assume the user knows
                // what they're doing by what normal language would describe as auto-casting
                // the polymorphic superclass instance into the required instance as long as the
                // class of the required instance has this superclass in it's inheritance tree
                // E.g.
                // ```
                // class A {}
                // class B extends A {}
                // /** @returns {A} */
                // local function get_class(get_b) { return get_b ? B() : A() }
                // /** @type {B} */
                // local b_holder = get_class(/* get_b: */ true)
                // ```
                //
                // However this can also lead to an incorrect behaviour, e.g
                // ```
                // /** @type {B} */
                // local b_holder = get_class(/* get_b: */ false)
                // ```
                // This will make `b_holder` actually hold A (so having no additional methods
                // that were defined in B) while having no error denoting this
                class_id = Some(original_id);
                while let Some(id) = class_id {
                    if id == other_id {
                        return Some(original);
                    }
                    let class = self.get(id);
                    class_id = class.inherits.into();
                }

                None
            }
            // We have doc type of table but only the value assigned can have the shape of the table
            // so to not lose this information we use the assigned value type
            //
            // We don't do this for class or instance because if a variable can take a type of multiple classes
            // then we're producing errors by taking id from the first assignment rather than sticking to
            // generic 'instance' or 'class' types
            // E.g.
            // ```tf2vscript
            // /** @type {instance} */
            // local a /*: CBaseEntity */ = CBaseEntity();
            // // error
            // a = regexp();
            // ```
            (Primitive::Table(None), Primitive::Table(Some(_)))
            | (Primitive::Class(None), Primitive::Class(Some(_)))
            | (Primitive::Array(None), Primitive::Array(Some(_)))
            | (Primitive::Function(None), Primitive::Function(Some(_)))
            | (Primitive::Generator(None), Primitive::Generator(Some(_)))
            | (Primitive::Thread(None), Primitive::Thread(Some(_)))
            | (Primitive::Integer(None), Primitive::Integer(Some(_)))
            | (Primitive::Float(None), Primitive::Float(Some(_)))
            | (Primitive::Bool(None), Primitive::Bool(Some(_))) => Some(other),
            //
            (Primitive::String { .. }, Primitive::String { .. })
            | (Primitive::Table(_), Primitive::Table(_))
            | (Primitive::Class(_), Primitive::Class(_))
            | (Primitive::Array(_), Primitive::Array(_))
            | (Primitive::Function(_), Primitive::Function(_))
            | (Primitive::Generator(_), Primitive::Generator(_))
            | (Primitive::Thread(_), Primitive::Thread(_))
            | (Primitive::Instance(_), Primitive::Instance(_))
            | (Primitive::Integer(_) | Primitive::Float(_), Primitive::Integer(_))
            | (Primitive::Float(_), Primitive::Float(_))
            | (Primitive::Bool(_), Primitive::Bool(_))
            | (Primitive::Weakref, Primitive::Weakref)
            | (Primitive::Null, Primitive::Null) => Some(original),
            (_, _) => None,
        }
    }

    fn check_type(
        &mut self,
        doc_type: &Type,
        other_type: &Type,
        source: CheckTypeSource,
        error_range: TextRange,
    ) -> Type {
        let message = |this: &Self| match source {
            CheckTypeSource::Variable => format!(
                "Trying to assign a variable of type '{}' to '{}'",
                this.type_to_str(doc_type),
                this.type_to_str(other_type)
            ),
            CheckTypeSource::VarArgs | CheckTypeSource::Parameter => format!(
                "Expected parameter of type '{}', but got '{}'",
                this.type_to_str(doc_type),
                this.type_to_str(other_type)
            ),
            CheckTypeSource::Return => format!(
                "Trying to return a value of type '{}' in a function with declared return type of '{}'",
                this.type_to_str(other_type),
                this.type_to_str(doc_type),
            ),
            CheckTypeSource::Throw => format!(
                "Trying to throw a value of type '{}' in a function with declared throw type of '{}'",
                this.type_to_str(other_type),
                this.type_to_str(doc_type),
            ),
            CheckTypeSource::Yield => format!(
                "Trying to yield a value of type '{}' in a function with declared yield type of '{}'",
                this.type_to_str(other_type),
                this.type_to_str(doc_type),
            ),
        };

        match (doc_type, other_type) {
            (Type::Union(doc), Type::Union(other)) => {
                let mut result = Vec::new();
                let mut matched = false;
                'inner: for left in doc.primitives.iter() {
                    for right in other.primitives.iter() {
                        if let Some(merged) = self.check_primitive(*left, *right, error_range) {
                            result.push(merged);
                            matched = true;
                            continue 'inner;
                        }
                    }
                    result.push(*left);
                }

                if !matched
                    && !doc.flags.intersects(TypeFlags::ANY)
                    && !other.flags.intersects(TypeFlags::ANY)
                {
                    self.diagnostics.push(Diagnostic {
                        message: message(self),
                        range: error_range,
                        severity: DiagnosticSeverity::Warning,
                    });
                }

                let flags = result
                    .iter()
                    .fold(TypeFlags::empty(), |f, p| f | p.type_flags());

                Type::Union(Union {
                    primitives: result.into(),
                    flags,
                })
            }

            (Type::Union(doc), Type::Primitive(other)) => {
                let mut result = Vec::new();
                let mut iter = doc.primitives.iter();
                while let Some(left) = iter.next() {
                    if let Some(merged) = self.check_primitive(*left, *other, error_range) {
                        result.push(merged);
                        result.extend(&mut iter);

                        return Type::Union(Union {
                            primitives: result.into(),
                            flags: doc.flags,
                        });
                    }

                    result.push(*left);
                }

                if !doc.flags.intersects(TypeFlags::ANY)
                    && !matches!(other, Primitive::Null | Primitive::Any)
                {
                    self.diagnostics.push(Diagnostic {
                        message: message(self),
                        range: error_range,
                        severity: DiagnosticSeverity::Warning,
                    });
                }

                doc_type.clone()
            }

            (Type::Primitive(doc), Type::Union(other)) => {
                for right in other.primitives.iter() {
                    if let Some(merged) = self.check_primitive(*doc, *right, error_range) {
                        return Type::Primitive(merged);
                    }
                }

                if *doc != Primitive::Any && !other.flags.intersects(TypeFlags::ANY) {
                    self.diagnostics.push(Diagnostic {
                        message: message(self),
                        range: error_range,
                        severity: DiagnosticSeverity::Warning,
                    });
                }

                doc_type.clone()
            }

            (Type::Primitive(doc), Type::Primitive(other)) => {
                if let Some(merged) = self.check_primitive(*doc, *other, error_range) {
                    Type::Primitive(merged)
                } else {
                    if *doc != Primitive::Any && !matches!(other, Primitive::Null | Primitive::Any)
                    {
                        self.diagnostics.push(Diagnostic {
                            message: message(self),
                            range: error_range,
                            severity: DiagnosticSeverity::Warning,
                        });
                    }
                    doc_type.clone()
                }
            }

            _ => doc_type.clone(),
        }
    }

    fn update_type(
        &mut self,
        current: &Type,
        is_type_explicit: bool,
        new: TypeWithRange,
        check: CheckTypeSource,
    ) -> Type {
        if is_type_explicit {
            self.check_type(current, &new.kind, check, new.range)
        } else {
            let flags = current.type_flags();
            if flags == TypeFlags::ANY_OR_NULL {
                new.kind.add_any()
            } else if flags == TypeFlags::NULL {
                new.kind
            } else {
                merge_types(current, &new.kind)
            }
        }
    }

    fn collect_params(
        &mut self,
        idx: Idx<FunctionData>,
        parameters: impl Iterator<Item = Parameter>,
    ) -> Vec<Option<TypeWithRange>> {
        let mut raw_param_types = Vec::new();
        let mut params_state = ParamsState::NoDefault;

        for (count, param) in parameters.enumerate() {
            match param {
                Parameter::Variable(var) => {
                    let Some((name_range, name)) = get_name(&var) else {
                        let Some(expr) = var.initialiser().and_then(|i| i.expression()) else {
                            continue;
                        };

                        self.collect_expr(&expr);
                        continue;
                    };

                    let Some(expr) = var.initialiser().and_then(|i| i.expression()) else {
                        match params_state {
                            ParamsState::Default(_) => {
                                self.diagnostics.push(Diagnostic {
                                    message: "Non-default parameter cannot be preceded by a default parameter".to_owned(),
                                    range: var.syntax().text_range(),
                                    ..Default::default()
                                });
                                params_state = ParamsState::NoDefault;
                            }
                            ParamsState::VarArgs(_, _) => {
                                self.diagnostics.push(Diagnostic {
                                    message: "Parameters cannot be preceded by varied arguments"
                                        .to_owned(),
                                    range: var.syntax().text_range(),
                                    ..Default::default()
                                });
                                params_state = ParamsState::NoDefault;
                            }
                            ParamsState::NoDefault => {}
                        }

                        let id = self.symbol_with_info(
                            &var,
                            SymbolKind::Local(LocalKind::Parameter),
                            name.clone(),
                            name_range,
                            SymbolFlags::default(),
                            Type::ANY,
                            None,
                        );

                        insert_symbol(&mut self.current_scope().locals, name, id);
                        self.arena[idx].params.push(id);
                        raw_param_types.push(None);
                        continue;
                    };

                    let expr_type = self.expr_to_type_with_range(&expr);
                    raw_param_types.push(Some(expr_type.clone()));

                    // We don't know for sure whether default value is of the only type the parameter
                    // can take. Even though we infer the parameter at the call site we're not guaranteed
                    // to consider all types at the first call. So Unknown is added unless the type is
                    // explicitly specified
                    // ```
                    // local function abc(wow = null) { if (wow) wow.AcceptInput(...) };
                    // abc(null) // This causes the function body to error
                    // abc(GetListenServerHost())
                    // ```
                    let typ = expr_type.kind.add_any();

                    let id = self.symbol_with_info(
                        &var,
                        SymbolKind::Local(LocalKind::Parameter),
                        name.clone(),
                        name_range,
                        SymbolFlags::default(),
                        typ,
                        Some((expr_type, CheckTypeSource::Parameter)),
                    );

                    insert_symbol(&mut self.current_scope().locals, name, id);
                    self.arena[idx].params.push(id);

                    match params_state {
                        ParamsState::NoDefault => {
                            params_state = ParamsState::Default(count);
                        }
                        ParamsState::Default(_) => {}
                        ParamsState::VarArgs(var_args_at, _) => {
                            self.diagnostics.push(Diagnostic {
                                message: "Parameters cannot be preceded by varied arguments"
                                    .to_owned(),
                                range: var.syntax().text_range(),
                                ..Default::default()
                            });
                            params_state = ParamsState::Default(var_args_at);
                        }
                    }
                }
                Parameter::Ellipsis(var_args) => match params_state {
                    ParamsState::NoDefault => {
                        let array = self.array(Type::ANY);
                        let symbol = self.symbol(Symbol {
                            name: "vargv".into(),
                            node: SyntaxNodePtr::new(var_args.syntax()),
                            typ: Type::Primitive(Primitive::Array(Some(array))),
                            kind: SymbolKind::Local(LocalKind::VariedArgs),
                            name_range: var_args.syntax().text_range(),
                            description: None,
                            flags: SymbolFlags::default(),
                            is_type_explicit: false,
                        });

                        insert_symbol(&mut self.current_scope().locals, "vargv".into(), symbol);
                        params_state = ParamsState::VarArgs(count, symbol);
                    }
                    ParamsState::Default(_) => {
                        self.diagnostics.push(Diagnostic {
                            message:
                                "Function with varied arguments cannot have default parameters"
                                    .to_owned(),
                            range: var_args.syntax().text_range(),
                            ..Default::default()
                        });
                    }
                    ParamsState::VarArgs(_, _) => {
                        self.diagnostics.push(Diagnostic {
                            message: "There can't be 2 varied arguments in a function signature"
                                .to_owned(),
                            range: var_args.syntax().text_range(),
                            ..Default::default()
                        });
                    }
                },
            }
        }

        self.arena[idx].params_state = params_state;
        raw_param_types
    }

    fn call_metamethod_primitive(
        &mut self,
        callable: Primitive,
        range: TextRange,
        metamethod: &str,
        arguments: &[TypeWithRange],
        error_keyword: Option<&str>,
    ) -> Option<Type> {
        match callable {
            Primitive::Table(id) => {
                let Some(id) = id else {
                    return Some(Type::ANY);
                };

                let table = self.get(id);
                let Some(delegate_idx) = table.delegate else {
                    if let Some(keyword) = error_keyword {
                        self.diagnostics.push(Diagnostic {
                            message: format!(
                                "'table' does not support {keyword}: no delegate assigned"
                            ),
                            range,
                            ..Default::default()
                        });
                    }
                    return None;
                };

                // possibly change error_range.start() to the real offset parameter?
                let Some(member) =
                    self.find_member(Container::Table(delegate_idx), metamethod, range.end())
                else {
                    if let Some(keyword) = error_keyword {
                        self.diagnostics.push(Diagnostic {
                            message: format!("'table' does not support {keyword}: delegate has no '{metamethod}' metamethod"),
                            range,
                            ..Default::default()
                        });
                    }
                    return None;
                };

                self.callable(
                    &Type::Primitive(callable),
                    &TypeWithRange {
                        kind: member.typ.clone(),
                        range,
                    },
                    arguments,
                )
            }
            Primitive::Instance(id) => {
                let Some(id) = id else {
                    return Some(Type::ANY);
                };

                let Some(member) =
                    self.find_member(Container::Instance(id), metamethod, range.start())
                else {
                    if let Some(keyword) = error_keyword {
                        let repr = self.primitive_to_str(&callable);
                        self.diagnostics.push(Diagnostic {
                            message: format!("'{repr}' does not support {keyword}: class has no '{metamethod}' metamethod"),
                            range,
                            ..Default::default()
                        });
                    }

                    return None;
                };

                self.callable(
                    &Type::Primitive(callable),
                    &TypeWithRange {
                        kind: member.typ.clone(),
                        range,
                    },
                    arguments,
                )
            }
            Primitive::Any => None,
            _ => {
                if let Some(keyword) = error_keyword {
                    self.no_support(self.primitive_to_str_generic(&callable), keyword, range);
                }
                None
            }
        }
    }

    fn call_metamethod(
        &mut self,
        operand: &TypeWithRange,
        metamethod: &str,
        arguments: &[TypeWithRange],
        // This is a bit misleading, it still errors on enums since they don't support any operations
        should_error: bool,
        error_keyword: &str,
    ) -> Option<Type> {
        match &operand.kind {
            Type::Enum(_) => {
                self.no_support("enum", error_keyword, operand.range);
                None
            }
            Type::Primitive(prim) => self.call_metamethod_primitive(
                *prim,
                operand.range,
                metamethod,
                arguments,
                should_error.then_some(error_keyword),
            ),
            Type::Union(union) => {
                for prim in union.primitives.iter() {
                    if let Some(result) = self.call_metamethod_primitive(
                        *prim,
                        operand.range,
                        metamethod,
                        arguments,
                        None,
                    ) {
                        return Some(result);
                    }
                }
                if should_error && !union.flags.intersects(TypeFlags::ANY) {
                    self.no_support(
                        &self.type_to_str_generic(&operand.kind),
                        error_keyword,
                        operand.range,
                    );
                }
                None
            }
        }
    }

    fn new_slot_primitive(
        &mut self,
        operand: Primitive,
        range: TextRange,
        arguments: &[TypeWithRange],
        should_error: bool,
    ) -> NewSlotResult {
        match operand {
            Primitive::Class(id) => {
                let Some(id) = id else {
                    return NewSlotResult::Allowed;
                };
                NewSlotResult::CanAdd(Container::Instance(id))
            }
            Primitive::Table(id) => {
                let Some(id) = id else {
                    return NewSlotResult::Allowed;
                };
                self.call_metamethod_primitive(operand, range, "_newslot", arguments, None);
                NewSlotResult::CanAdd(Container::Table(id))
            }
            _ => {
                if self
                    .call_metamethod_primitive(
                        operand,
                        range,
                        "_newslot",
                        arguments,
                        should_error.then_some("new slot operator"),
                    )
                    .is_none()
                {
                    return NewSlotResult::NotAllowed;
                }

                NewSlotResult::CanAdd(Container::try_from(operand).expect(
                    "Type that did not fail `_newslot` metamethod call has to be a container",
                ))
            }
        }
    }

    fn new_slot(&mut self, operand: &TypeWithRange, arguments: &[TypeWithRange]) -> NewSlotResult {
        match &operand.kind {
            Type::Enum(_) => {
                self.no_support("enum", "new slot operator", operand.range);
                NewSlotResult::NotAllowed
            }
            Type::Primitive(prim) => self.new_slot_primitive(*prim, operand.range, arguments, true),
            Type::Union(union) => {
                let mut allowed = false;
                for prim in union.primitives.iter() {
                    match self.new_slot_primitive(*prim, operand.range, arguments, false) {
                        NewSlotResult::Allowed => allowed = true,
                        NewSlotResult::CanAdd(id) => return NewSlotResult::CanAdd(id),
                        NewSlotResult::NotAllowed => {}
                    }
                }

                if allowed {
                    return NewSlotResult::Allowed;
                }

                if !union.flags.intersects(TypeFlags::ANY) {
                    self.no_support(
                        &self.type_to_str_generic(&operand.kind),
                        "new slot operator",
                        operand.range,
                    );
                }
                NewSlotResult::NotAllowed
            }
        }
    }

    fn delete_primitive(
        &mut self,
        operand: Primitive,
        range: TextRange,
        index: TypeWithRange,
        should_error: bool,
    ) -> Option<Type> {
        match operand {
            Primitive::Class(_) => Some(Type::default()),
            Primitive::Table(_) => Some(
                self.call_metamethod_primitive(operand, range, "_delslot", &[index], None)
                    .unwrap_or(Type::ANY),
            ),
            _ => self.call_metamethod_primitive(
                operand,
                range,
                "_delslot",
                &[index],
                should_error.then_some("delete operator"),
            ),
        }
    }

    fn delete(&mut self, operand: &TypeWithRange, index: &TypeWithRange) -> Option<Type> {
        dispatch_union!(
            self,
            operand,
            "delete operator",
            delete_primitive,
            index.clone()
        )
    }

    fn set_single(
        &mut self,
        operand: Primitive,
        range: TextRange,
        arguments: &[TypeWithRange],
        should_error: bool,
    ) -> Option<Type> {
        match operand {
            Primitive::Array(_) | Primitive::Class(_) => Some(arguments.last()?.kind.clone()),
            Primitive::Table(_) | Primitive::Instance(_) => Some(
                self.call_metamethod_primitive(operand, range, "_set", arguments, None)
                    .unwrap_or(arguments.last()?.kind.clone()),
            ),
            _ => self.call_metamethod_primitive(
                operand,
                range,
                "_set",
                arguments,
                should_error.then_some("equals operator"),
            ),
        }
    }

    fn set(&mut self, operand: &TypeWithRange, arguments: &[TypeWithRange]) -> Option<Type> {
        dispatch_union!(self, operand, "equals operator", set_single, arguments)
    }

    fn no_support(&mut self, repr: &str, keyword: &str, range: TextRange) {
        self.diagnostics.push(Diagnostic {
            message: format!("'{repr}' does not support {keyword}"),
            range,
            severity: DiagnosticSeverity::Error,
        });
    }

    fn arithmetic_primitive(
        &mut self,
        operand: Primitive,
        range: TextRange,
        with: &TypeWithRange,
        operator: BinaryOperator,
        should_error: bool,
    ) -> Option<Type> {
        let (metamethod, keyword) = match operator {
            BinaryOperator::Add | BinaryOperator::AddAssign => ("_add", "adding"),
            BinaryOperator::Subtract | BinaryOperator::SubtractAssign => ("_sub", "subtracting"),
            BinaryOperator::Multiply | BinaryOperator::MultiplyAssign => ("_mul", "multiplying"),
            BinaryOperator::Divide | BinaryOperator::DivideAssign => ("_div", "dividing"),
            BinaryOperator::Modulo | BinaryOperator::ModuloAssign => ("_modulo", "modulo"),
            _ => unreachable!(),
        };

        let operand_flags = operand.type_flags();
        let with_flags = with.kind.type_flags();

        if (operator == BinaryOperator::Add || operator == BinaryOperator::AddAssign)
            && (operand_flags.intersects(TypeFlags::STRING)
                || with_flags.intersects(TypeFlags::STRING))
        {
            let ret = Type::Primitive(Primitive::String {
                kind: StringKind::Arbitrary,
                literal: None,
            });
            if operand_flags == TypeFlags::STRING {
                return Some(ret);
            }
            return Some(ret.add_any());
        }

        if !operand_flags.intersects(TypeFlags::ARITHMETIC) {
            if should_error && !operand_flags.intersects(TypeFlags::ANY) {
                self.no_support(self.primitive_to_str_generic(&operand), keyword, range);
            }

            if !with_flags.intersects(TypeFlags::ARITHMETIC)
                && !with_flags.intersects(TypeFlags::ANY)
            {
                if should_error {
                    self.no_support(&self.type_to_str_generic(&with.kind), keyword, with.range);
                }
                return None;
            }
            // Stuff like
            // player: any
            // player.EyeAngles() * 30 will output integer
            // which is not correct and will lead us to error
            return Some(with.kind.add_any());
        }

        if operand_flags.intersects(TypeFlags::INTEGER) && with_flags.intersects(TypeFlags::INTEGER)
        {
            let ret = Type::Primitive(Primitive::Integer(None));
            if operand_flags == TypeFlags::INTEGER {
                return Some(ret);
            }
            return Some(ret.add_any());
        }

        if operand_flags.intersects(TypeFlags::NUMBER) && with_flags.intersects(TypeFlags::NUMBER) {
            let ret = Type::Primitive(Primitive::Float(None));
            if TypeFlags::NUMBER.contains(operand_flags) {
                return Some(ret);
            }
            return Some(ret.add_any());
        }

        if operand_flags.intersects(TypeFlags::TABLE_OR_INSTANCE) {
            self.call_metamethod_primitive(
                operand,
                range,
                metamethod,
                std::slice::from_ref(with),
                should_error.then_some(keyword),
            )
            .map(|t| {
                if TypeFlags::TABLE_OR_INSTANCE.contains(operand_flags) {
                    t
                } else {
                    t.add_any()
                }
            })
        } else {
            if should_error && !with_flags.intersects(TypeFlags::ANY) {
                self.no_support(
                    &format!(
                        "{}' and '{}",
                        &self.primitive_to_str_generic(&operand),
                        &self.type_to_str_generic(&with.kind)
                    ),
                    keyword,
                    with.range,
                );
            }
            Some(Type::Primitive(operand).add_any())
        }
    }

    fn arithmetic(
        &mut self,
        operand: &TypeWithRange,
        with: &TypeWithRange,
        operator: BinaryOperator,
    ) -> Option<Type> {
        dispatch_union!(
            self,
            operand,
            "arithmetic operations",
            arithmetic_primitive,
            with,
            operator
        )
    }

    fn iterable_primitive(
        &mut self,
        iterable: Primitive,
        range: TextRange,
        should_error: bool,
    ) -> Option<(Type, Type)> {
        match iterable {
            Primitive::Table(_) => {
                let arguments = [TypeWithRange {
                    kind: Type::NULL,
                    range,
                }];
                self.call_metamethod_primitive(iterable, range, "_nexti", &arguments, None);
                Some((Type::STRING.add_any(), Type::ANY))
            }
            Primitive::Array(kind) => {
                let typ = kind.map_or(Type::ANY, |id| self.get(id).kind.clone());
                Some((Type::INTEGER, typ))
            }
            Primitive::String { .. } => Some((Type::INTEGER, Type::INTEGER)),
            Primitive::Generator(id) => {
                let typ = id.map_or(Type::ANY, |id| match &self.get(id).yields {
                    TypeState::Absent => Type::ANY,
                    TypeState::Explicit(typ) | TypeState::NotExplicit(typ) => {
                        typ.this_to_concrete(&Type::ANY)
                    }
                });

                Some((Type::INTEGER, typ))
            }
            Primitive::Class(_) => Some((Type::STRING.add_any(), Type::ANY)),
            _ => {
                let arguments = [TypeWithRange {
                    kind: Type::NULL,
                    range,
                }];

                self.call_metamethod_primitive(
                    iterable,
                    range,
                    "_nexti",
                    &arguments,
                    should_error.then_some("iterating"),
                )
                .map(|typ| (Type::STRING.add_any(), typ))
            }
        }
    }

    fn iterable(&mut self, iterable: &TypeWithRange) -> Option<(Type, Type)> {
        match &iterable.kind {
            Type::Enum(_) => {
                self.no_support("enum", "iterating", iterable.range);
                None
            }
            Type::Primitive(prim) => self.iterable_primitive(*prim, iterable.range, true),
            Type::Union(union) => {
                let mut merged: Option<(Type, Type)> = None;
                for prim in union.primitives.iter() {
                    if let Some((k, v)) = self.iterable_primitive(*prim, iterable.range, false) {
                        merged = Some(match merged {
                            None => (k, v),
                            Some((ek, ev)) => (merge_types(&ek, &k), merge_types(&ev, &v)),
                        });
                    }
                }
                if merged.is_none() && !union.flags.intersects(TypeFlags::ANY) {
                    self.no_support(
                        &self.type_to_str_generic(&iterable.kind),
                        "iterating",
                        iterable.range,
                    );
                }
                merged
            }
        }
    }

    fn callable_primitive(
        &mut self,
        callable: Primitive,
        range: TextRange,
        context: &Type,
        arguments: &[TypeWithRange],
        should_error: bool,
    ) -> Option<Type> {
        match callable {
            Primitive::Function(id) => {
                let Some(id) = id else {
                    return Some(Type::ANY);
                };

                let idx = id.idx();
                let first_encounter = id.file() == self.file && !self.resolved_once.contains(&idx);

                // Doc tags must be folded in exactly once — see the comment on
                // `resolve_deferred_function_entry`.
                let mut data = if first_encounter {
                    self.deferred_entry(id)
                } else {
                    None
                };

                if let Some(ref d) = data {
                    self.resolve_function_doc(d, range.end());
                }

                let mut params_changed = false;
                for (count, argument) in arguments.iter().cloned().enumerate() {
                    let Some(&param) = self.get(id).params.get(count) else {
                        let ParamsState::VarArgs(_, vargv) = self.get(id).params_state else {
                            self.diagnostics.push(Diagnostic {
                                message: format!(
                                    "Passing {} parameters when only {} is possible",
                                    count + 1,
                                    self.get(id).params.len()
                                ),
                                range: argument.range,
                                ..Default::default()
                            });
                            continue;
                        };

                        let vargv_typ = self.get(vargv).typ.clone();

                        let Type::Primitive(Primitive::Array(Some(array_id))) = vargv_typ else {
                            continue;
                        };

                        let old = self.get(array_id).kind.clone();
                        let new_typ = self.update_type(
                            &old,
                            self.get(vargv).is_type_explicit,
                            argument,
                            CheckTypeSource::VarArgs,
                        );

                        if new_typ != old {
                            params_changed = true;
                        }

                        if let Some(array) = self.get_mut(array_id) {
                            array.kind = new_typ;
                        }
                        continue;
                    };

                    let old = self.get(param).typ.clone();
                    let new = self.update_type(
                        &old,
                        self.get(param).is_type_explicit,
                        argument,
                        CheckTypeSource::Parameter,
                    );

                    if new != old {
                        params_changed = true;
                    }

                    if let Some(param) = self.get_mut(param) {
                        param.typ = new;
                    }
                }

                // Wasn't the first time, but this call just taught us something
                // new about a parameter - go re-walk the body with it.
                if data.is_none() && !first_encounter && params_changed {
                    data = self.deferred_entry(id);
                }

                let least_params_required = match self.get(id).params_state {
                    ParamsState::NoDefault => self.get(id).params.len(),
                    ParamsState::Default(from) | ParamsState::VarArgs(from, _) => from,
                };

                if arguments.len() < least_params_required {
                    self.diagnostics.push(Diagnostic {
                        message: format!(
                            "Passing {} parameters when at least {} is required",
                            arguments.len(),
                            least_params_required
                        ),
                        range,
                        ..Default::default()
                    });
                }

                if let Some(data) = data {
                    self.resolve_deferred_function_entry(data);
                }

                if let Some(native) = self.db.check_native(id)
                    && let Some(override_return) = self.native_function(native, context, arguments)
                {
                    return Some(override_return);
                }

                Some(if self.get(id).yields == TypeState::Absent {
                    match &self.get(id).ret {
                        TypeState::Absent => Type::ANY,
                        TypeState::Explicit(typ) | TypeState::NotExplicit(typ) => {
                            typ.this_to_concrete(context)
                        }
                    }
                } else {
                    Type::Primitive(Primitive::Generator(Some(id)))
                })
            }
            Primitive::Class(id) => {
                let Some(id) = id else {
                    return Some(Type::INSTANCE);
                };

                if let Some(id) =
                    self.find_member_id(Container::Class(id), "constructor", range.start())
                {
                    self.symbol_to_ranges
                        .entry(id)
                        .and_modify(|list| list.push(range))
                        .or_insert_with(|| vec![range]);

                    self.callable(
                        context,
                        &TypeWithRange {
                            kind: self.get(id).typ.clone(),
                            range,
                        },
                        arguments,
                    );
                } else if !arguments.is_empty() {
                    self.diagnostics.push(Diagnostic {
                        message: "Default constructor should have no parameters".to_owned(),
                        range,
                        ..Default::default()
                    });
                }

                Some(Type::Primitive(Primitive::Instance(Some(id))))
            }
            _ => self.call_metamethod_primitive(
                callable,
                range,
                "_call",
                arguments,
                should_error.then_some("calling"),
            ),
        }
    }

    fn callable(
        &mut self,
        context: &Type,
        callable: &TypeWithRange,
        arguments: &[TypeWithRange],
    ) -> Option<Type> {
        dispatch_union!(
            self,
            callable,
            "calling",
            callable_primitive,
            context,
            arguments
        )
    }

    fn check_constant(&mut self, expr: &Expr) {
        fn is_numeric_literal(expr: &Expr) -> bool {
            let Expr::Literal(lit) = expr else {
                return false;
            };
            matches!(
                lit.token(),
                Some((
                    LiteralExpressionKind::DecimalInteger
                        | LiteralExpressionKind::OctalInteger
                        | LiteralExpressionKind::HexInteger
                        | LiteralExpressionKind::Character
                        | LiteralExpressionKind::Float,
                    _
                ))
            )
        }

        let is_valid = match expr {
            Expr::Literal(lit) => matches!(
                lit.token(),
                Some((
                    LiteralExpressionKind::DecimalInteger
                        | LiteralExpressionKind::OctalInteger
                        | LiteralExpressionKind::HexInteger
                        | LiteralExpressionKind::Character
                        | LiteralExpressionKind::Float
                        | LiteralExpressionKind::String
                        | LiteralExpressionKind::VerbatimString
                        | LiteralExpressionKind::True
                        | LiteralExpressionKind::False,
                    _
                ))
            ),
            // Only a literal number may be negated; "-x" for a non-literal, or negating
            // a string/bool, is not a constant scalar
            Expr::PrefixUnary(unary) => {
                matches!(unary.operator(), Some((PrefixUnaryOperator::Negation, _)))
                    && unary
                        .operand()
                        .is_some_and(|operand| is_numeric_literal(&operand))
            }
            _ => false,
        };

        if !is_valid {
            self.diagnostics.push(Diagnostic {
                message:
                    "Constant can only hold value of literal 'integer', 'float', 'string' or 'bool'"
                        .to_owned(),
                range: expr.syntax().text_range(),
                ..Default::default()
            });
        }
    }

    fn collect_function<T: IsFunction + Clone + 'static>(&mut self, node: &T) -> FunctionId {
        let bindenv = node
            .environment()
            .and_then(|e| e.expression())
            .map(|env| (env.syntax().text_range(), self.expr_to_type(&env)))
            .and_then(|(range, typ)| {
                if let Ok(container) = Container::try_from(&typ) {
                    Some(container)
                } else {
                    if !typ.type_flags().intersects(TypeFlags::ANY) {
                        self.diagnostics.push(Diagnostic {
                            message: format!(
                                "Trying to use '{}' as function's environment",
                                self.type_to_str_generic(&typ)
                            ),
                            range,
                            severity: DiagnosticSeverity::Warning,
                        });
                    }
                    None
                }
            });

        let range = match node.body() {
            Some(FunctionBody::Expr(body)) => body.syntax().text_range(),
            Some(FunctionBody::Stmt(body)) => body.syntax().text_range(),
            None => TextRange::empty(node.syntax().text_range().end()),
        };

        let idx = self.arena.alloc(FunctionData {
            symbol: None,
            range,
            node: SyntaxNodePtr::new(node.syntax()),
            params_end: node.parameter_list().map(|p| p.syntax().text_range().end()),
            container: self.container,
            bindenv,
            params: Vec::new(),
            params_state: ParamsState::NoDefault,
            ret: TypeState::Absent,
            throws: TypeState::Absent,
            yields: TypeState::Absent,
            flags: FunctionFlags::default(),
        });

        let id = FunctionId::new(self.file, idx);

        let save_idx = self.function;
        self.function = Some(idx);

        self.enter_scope(range);

        let raw_param_types = node.parameter_list().map_or_else(Vec::new, |param_list| {
            self.collect_params(id.idx(), param_list.parameters())
        });

        self.pending_functions.push(id.idx());
        self.traces.insert(
            id.idx(),
            DeferredFunctionTrace {
                node: Box::new(node.clone()),
                scope: self.scope,
                raw_param_types,
            },
        );

        self.exit_scope();

        self.function = save_idx;

        id
    }

    fn deferred_entry(&mut self, id: FunctionId) -> Option<DeferredFunctionEntry> {
        if id.file() != self.file {
            return None;
        }

        let idx = id.idx();
        let trace = self.traces.remove(&idx)?;
        Some(DeferredFunctionEntry { idx, trace })
    }

    fn resolve_variable_doc<T: HasDoc>(
        &mut self,
        node: &T,
        name: &str,
        name_range: TextRange,
    ) -> Option<SymbolDocInfo> {
        let doc = node.doc()?;
        let range = doc.syntax().text_range();

        let mut info = SymbolDocInfo {
            range,
            ..Default::default()
        };

        if let Some(desc) = doc.full_description() {
            info.description = Some(desc);
        }

        let offset = range.end();
        for tag in doc.tags() {
            match tag {
                Tag::Type(type_tag) => {
                    let Some(typ) = type_tag.typ() else {
                        continue;
                    };

                    let Some(doc_type) = self.doc_type(typ.types(), offset) else {
                        continue;
                    };

                    let doc_type = doc_type.this_to_concrete(&self.execution_container().into());

                    // let typ = self.update_type(
                    //     &self.get(symbol).typ.clone(),
                    //     self.get(symbol).is_type_explicit,
                    //     NewType::Explicit {
                    //         typ: doc_type,
                    //         value_range: self.get(symbol).node.text_range(),
                    //     },
                    //     CheckTypeSource::Variable,
                    // );

                    info.typ = Some(doc_type);
                }
                Tag::Const(_) => {
                    info.flags |= SymbolFlags::CONST;
                }
                Tag::Hide(_) => {
                    info.flags |= SymbolFlags::HIDE;
                }
                Tag::Deprecated(_) => {
                    info.flags |= SymbolFlags::DEPRECATED;
                }
                Tag::Static(_) => {
                    info.flags |= SymbolFlags::STATIC;
                }
                Tag::Override(_) => {
                    self.check_override_tag(name, name_range);
                }
                _ => {}
            }
        }

        Some(info)
    }

    fn resolve_function_doc(&mut self, entry: &DeferredFunctionEntry, offset: TextSize) {
        let Some(doc) = entry.trace.node.doc().or_else(|| {
            let syntax = entry.trace.node.syntax();
            if !matches!(
                syntax.kind(),
                SyntaxKind::FunctionExpression | SyntaxKind::LambdaExpression
            ) {
                return None;
            }
            parent_doc(syntax)
        }) else {
            return;
        };

        for tag in doc.tags() {
            match tag {
                Tag::Return(tag) => {
                    let Some(typ) = tag.typ() else {
                        continue;
                    };

                    let doc_type = self.doc_type(typ.types(), offset);

                    if let Some(typ) = doc_type {
                        self.arena[entry.idx].ret = TypeState::Explicit(typ);
                    }
                }
                Tag::Param(tag) => {
                    let Some(param_name) = tag.name().and_then(|n| n.identifier()) else {
                        continue;
                    };
                    let text = param_name.text();

                    let Some((idx, &param_id)) = self.arena[entry.idx]
                        .params
                        .iter()
                        .enumerate()
                        .rev()
                        .find(|(_, id)| self.get(**id).name.as_ref() == text)
                    else {
                        self.diagnostics.push(Diagnostic {
                            message: format!("Couldn't find param '{text}'"),
                            range: param_name.text_range(),
                            severity: DiagnosticSeverity::Information,
                        });
                        continue;
                    };

                    self.new_reference(param_name.text_range(), param_id);

                    if let Some(param) = self.get_mut(param_id)
                        && let Some(desc) = tag.description()
                    {
                        param.description = desc.content();
                    }

                    let Some(typ) = tag.typ() else {
                        continue;
                    };

                    let Some(doc_type) = self.doc_type(typ.types(), offset) else {
                        continue;
                    };

                    let doc_type = doc_type.this_to_concrete(&self.execution_container().into());

                    let new_type = if let Some(param_type) = &entry.trace.raw_param_types[idx] {
                        self.check_type(
                            &doc_type,
                            &param_type.kind,
                            CheckTypeSource::Parameter,
                            param_type.range,
                        )
                    } else {
                        doc_type
                    };

                    if let Some(param) = self.get_mut(param_id) {
                        param.typ = new_type;
                        param.is_type_explicit = true;
                    }
                }
                Tag::Throw(tag) => {
                    let Some(typ) = tag.typ() else {
                        continue;
                    };

                    if let Some(doc_type) = self.doc_type(typ.types(), offset) {
                        self.arena[entry.idx].throws = TypeState::Explicit(doc_type);
                    }
                }
                Tag::Yield(tag) => {
                    let Some(typ) = tag.typ() else {
                        continue;
                    };

                    if let Some(doc_type) = self.doc_type(typ.types(), offset) {
                        self.arena[entry.idx].yields = TypeState::Explicit(doc_type);
                    }
                }
                Tag::VarArgs(tag) => {
                    let ParamsState::VarArgs(_, id) = self.arena[entry.idx].params_state else {
                        continue;
                    };

                    if let Some(symbol) = self.get_mut(id)
                        && let Some(desc) = tag.description()
                    {
                        symbol.description = desc.content();
                    }

                    let Some(typ) = tag.typ() else {
                        continue;
                    };

                    let Some(doc_type) = self.doc_type(typ.types(), offset) else {
                        continue;
                    };

                    let doc_type = doc_type.this_to_concrete(&self.execution_container().into());

                    let array = self.array(doc_type);
                    if let Some(symbol) = self.get_mut(id) {
                        symbol.typ = Type::Primitive(Primitive::Array(Some(array)));
                        symbol.is_type_explicit = true;
                    }
                }
                Tag::This(tag) => {
                    let Some(tag_type) = tag.typ() else {
                        continue;
                    };

                    let Some(doc_type) = self.doc_type(tag_type.types(), offset) else {
                        continue;
                    };

                    let doc_type = doc_type.this_to_concrete(&self.execution_container().into());

                    if let Ok(container) = Container::try_from(&doc_type) {
                        self.arena[entry.idx].bindenv = Some(container);
                    } else if !doc_type.type_flags().intersects(TypeFlags::ANY) {
                        self.diagnostics.push(Diagnostic {
                            message: format!(
                                "Trying to use '{}' as function's environment",
                                self.type_to_str_generic(&doc_type)
                            ),
                            range: tag_type.syntax().text_range(),
                            severity: DiagnosticSeverity::Warning,
                        });
                    }
                }
                Tag::Static(_) => {
                    if let Container::Instance(id) = self.arena[entry.idx].container {
                        self.arena[entry.idx].container = Container::Class(id);
                    }
                }
                Tag::NoDiscard(_) => {
                    self.arena[entry.idx].flags |= FunctionFlags::NO_DISCARD;
                }
                Tag::Var(tag) => {
                    self.var_tag(&tag);
                }
                _ => {}
            }
        }
    }

    fn var_tag(&mut self, tag: &VarTag) {
        let Some(var_name) = tag.name().and_then(|n| n.identifier()) else {
            return;
        };
        let text = var_name.text();
        let mut symbol = Symbol {
            name: text.into(),
            typ: Type::ANY,
            kind: SymbolKind::Local(LocalKind::Embedded),
            name_range: var_name.text_range(),
            node: SyntaxNodePtr::new(tag.syntax()),
            description: None,
            flags: SymbolFlags::default(),
            is_type_explicit: false,
        };

        if let Some(typ) = tag
            .typ()
            .and_then(|t| self.doc_type(t.types(), tag.syntax().text_range().start()))
        {
            symbol.typ = typ.this_to_concrete(&self.execution_container().into());
            symbol.is_type_explicit = true;
        }

        let id = self.symbol(symbol);
        insert_symbol(&mut self.current_scope().locals, text.into(), id);
    }

    fn resolve_deferred_function_entry(&mut self, entry: DeferredFunctionEntry) {
        let DeferredFunctionEntry { idx, trace } = entry;

        if self.resolved_once.contains(&idx) {
            // We've walked this body before under a narrower parameter type;
            // clear out the symbols/diagnostics that run produced so we don't
            // end up with duplicates or spurious "unused variable" hits on
            // orphaned locals from the earlier pass.
            let body_range = self.arena[idx].range;
            self.purge_range_bookkeeping(body_range);
        }

        let Some(body) = trace.node.body() else {
            self.resolved_once.insert(idx);
            self.traces.insert(idx, trace);
            return;
        };

        let function = &self.arena[idx];
        let save_container = self.container;
        self.container = function.bindenv.unwrap_or(function.container);
        let save_scope = self.scope;
        self.scope = trace.scope;
        let save_function = self.function;
        self.function = Some(idx);
        let save_dead_code = self.dead_code;
        self.dead_code = false;
        let save_break = self.can_break;
        self.can_break = false;
        let save_continue = self.can_continue;
        self.can_continue = false;

        self.process_deferred_function_body(&body, idx);

        self.container = save_container;
        self.scope = save_scope;
        self.function = save_function;
        self.dead_code = save_dead_code;
        self.can_break = save_break;
        self.can_continue = save_continue;

        self.resolved_once.insert(idx);
        self.traces.insert(idx, trace);
    }

    /// Drops everything keyed by a range inside `range` - used to clear a function
    /// body's previous-run bookkeeping (locals, references, diagnostics) before
    /// re-resolving it with wider parameter types.
    fn purge_range_bookkeeping(&mut self, range: TextRange) {
        // Mark every symbol whose defining node falls inside the re-resolved
        // body as stale, so arena-wide consumers (inlay hints, workspace
        // symbols) can filter them out. la_arena has no removal, so this flag
        // is the only way to "delete" a symbol.
        let stale_ids: Vec<_> = self
            .all_symbols()
            .filter_map(|(idx, s)| range.contains_range(s.node.text_range()).then_some(idx))
            .collect();

        for idx in stale_ids {
            self.arena[idx].flags |= SymbolFlags::STALE;
        }

        let stale_ids: Vec<_> = self
            .all_functions()
            .filter_map(|(idx, f)| range.contains_range(f.node.text_range()).then_some(idx))
            .collect();

        for idx in stale_ids {
            self.arena[idx].flags |= FunctionFlags::STALE;
        }

        self.symbol_to_ranges.retain(|_, ranges| {
            ranges.retain(|r| !range.contains_range(*r));
            !ranges.is_empty()
        });
        self.diagnostics.retain(|d| !range.contains_range(d.range));
    }

    fn process_deferred_function_body(&mut self, body: &FunctionBody, idx: Idx<FunctionData>) {
        match body {
            FunctionBody::Expr(expr) => {
                let new_ret = self.expr_to_type_with_range(expr);

                let (ret, is_explicit) = match self.arena[idx].ret.clone() {
                    TypeState::Absent => {
                        self.arena[idx].ret = TypeState::NotExplicit(new_ret.kind);
                        return;
                    }
                    TypeState::Explicit(typ) => (typ, true),
                    TypeState::NotExplicit(typ) => (typ, false),
                };

                let new = self.update_type(&ret, is_explicit, new_ret, CheckTypeSource::Return);

                self.arena[idx].ret = TypeState::Explicit(new);
            }
            FunctionBody::Stmt(stmt) => {
                self.collect_stmt(stmt);

                if self.arena[idx].ret == TypeState::Absent {
                    self.arena[idx].ret = TypeState::NotExplicit(Type::NULL);
                }
            }
        }
    }

    fn native_function(
        &mut self,
        kind: NativeFunction,
        context: &Type,
        arguments: &[TypeWithRange],
    ) -> Option<Type> {
        match kind {
            NativeFunction::CopySelf => return Some(context.clone()),
            NativeFunction::GetRootTable => {
                return Some(Type::Primitive(Primitive::Table(Some(self.root_table()))));
            }
            NativeFunction::GetConstTable => {
                return Some(Type::Primitive(Primitive::Table(Some(self.const_table()))));
            }
            NativeFunction::NewThread => {
                if let Some(first) = arguments.first()
                    && let Ok(id) = first.kind.to_function()
                {
                    return Some(Type::Primitive(Primitive::Thread(Some(id))));
                }
                return Some(Type::THREAD);
            }
            NativeFunction::SetDelegate => {
                self.set_delegate(context, arguments);
                return Some(context.clone());
            }
            NativeFunction::Bindenv => {
                return Some(self.bindenv(context, arguments));
            }
            NativeFunction::Array => {
                let second = arguments
                    .get(1)
                    .map_or(Type::NULL, |t| t.kind.clone())
                    .add_any();

                return Some(Type::Primitive(Primitive::Array(Some(self.array(second)))));
            }
            // NativeFunction::ArrayAppend => {}
            NativeFunction::ArrayExtend => {
                let id = context.to_array().ok()?;
                let other = arguments.first()?;
                let other_id = other.kind.to_array().ok()?;
                let typ = self.get(id).kind.clone();
                let other_typ = self.get(other_id).kind.clone();
                let new = self.array(merge_types(&typ, &other_typ));
                return Some(Type::Primitive(Primitive::Array(Some(new))));
            }
            // NativeFunction::ArrayFind => todo!(),
            // NativeFunction::ArrayInsert => todo!(),
            NativeFunction::ArrayReturnItem => {
                let id = context.to_array().ok()?;
                return Some(self.get(id).kind.clone());
            } // NativeFunction::ArrayPush => todo!(),
            // NativeFunction::ArrayResize => todo!(),
            NativeFunction::IncludeScript => {
                self.include_script(arguments);
            }
            NativeFunction::DoIncludeScript => {
                self.do_include_script(arguments);
            }
            NativeFunction::CreateEntity => {
                return self.create_entity(arguments);
            }
            NativeFunction::FindEntity => {
                return self.find_entity(arguments);
            }
        }
        None
    }

    fn get_member_name(&mut self, name: MemberName) -> Option<(TextRange, Box<str>)> {
        match name {
            MemberName::Identifier(n) => {
                let name = n.name()?;
                let identifier = name.identifier()?;
                Some((identifier.text_range(), identifier.text().into()))
            }
            MemberName::String(n) => {
                let id = n.token().map(|r| self.string(&r))?;
                let s = self.get(id);
                Some((s.unquoted_range, s.text.clone()))
            }
            MemberName::Computed(n) => {
                let expr = n.expression()?;
                let kind = self.collect_expr(&expr);

                if self.expr_kind_to_type(kind.as_ref(), expr.syntax().text_range().end())
                    == Type::NULL
                {
                    self.diagnostics.push(Diagnostic {
                        message: "'null' cannot be a name".to_owned(),
                        range: expr.syntax().text_range(),
                        severity: DiagnosticSeverity::Error,
                    });
                    return None;
                }

                let Some(ExpressionKind::Literal(Type::Primitive(Primitive::String {
                    literal: Some(literal),
                    ..
                }))) = kind
                else {
                    return None;
                };
                let s = self.get(literal);
                Some((s.unquoted_range, s.text.clone()))
            }
        }
    }

    fn check_override_tag(&mut self, name: &str, name_range: TextRange) {
        let Container::Class(class_id) = self.container else {
            self.diagnostics.push(Diagnostic {
                message: "'@override' can only be used inside class declarations".to_owned(),
                range: name_range,
                severity: DiagnosticSeverity::Warning,
            });
            return;
        };

        let base_id = match self.get(class_id).inherits {
            Inherits::Yes(base_id) => base_id,
            Inherits::YesButUnknown => return,
            Inherits::No => {
                self.diagnostics.push(Diagnostic {
                    message: "Current class does have a base class to use '@override'".to_owned(),
                    range: name_range,
                    severity: DiagnosticSeverity::Warning,
                });
                return;
            }
        };

        let found = self
            .find_member(Container::Class(base_id), name, name_range.start())
            .is_some()
            || self
                .find_member(Container::Instance(base_id), name, name_range.start())
                .is_some();

        if !found {
            self.diagnostics.push(Diagnostic {
            message: format!(
                "Member '{name}' is marked as '@override' but does not override any base class member"
            ),
            range: name_range,
            severity: DiagnosticSeverity::Warning,
        });
        }
    }

    fn collect_table_member(&mut self, member: &Member) {
        match member {
            Member::Property(property) => self.collect_table_property(property),
            Member::Method(method) => {
                let id = self.collect_function(method);

                let Some((name_range, name)) = get_name(method) else {
                    return;
                };

                let typ = Type::Primitive(Primitive::Function(Some(id)));

                let symbol = self.symbol_with_info(
                    method,
                    SymbolKind::Property {
                        show_inlay_hint: false,
                    },
                    name.clone(),
                    name_range,
                    SymbolFlags::default(),
                    typ.clone(),
                    Some((
                        TypeWithRange {
                            kind: typ,
                            range: method
                                .function_token()
                                .map_or_else(|| method.syntax().text_range(), |t| t.text_range()),
                        },
                        CheckTypeSource::Variable,
                    )),
                );

                self.arena[id.idx()].symbol = Some(symbol);
                self.add_current_container_member(name, symbol);
            }
            Member::Constructor(constructor) => {
                let id = self.collect_function(constructor);

                let Some(keyword) = constructor.constructor_keyword() else {
                    return;
                };
                let name_range = keyword.text_range();

                let typ = Type::Primitive(Primitive::Function(Some(id)));

                let symbol = self.symbol_with_info(
                    constructor,
                    SymbolKind::Property {
                        show_inlay_hint: false,
                    },
                    "constructor".into(),
                    name_range,
                    SymbolFlags::default(),
                    typ.clone(),
                    Some((
                        TypeWithRange {
                            kind: typ,
                            range: constructor.constructor_keyword().map_or_else(
                                || constructor.syntax().text_range(),
                                |t| t.text_range(),
                            ),
                        },
                        CheckTypeSource::Variable,
                    )),
                );

                self.arena[id.idx()].symbol = Some(symbol);
                self.add_current_container_member("constructor".into(), symbol);
            }
        }
    }

    fn collect_class_member(&mut self, member: &Member) {
        match member {
            Member::Property(property) => self.collect_class_property(property),
            Member::Method(method) => {
                let id = self.collect_function(method);
                let did_swap = self.try_swap_to_instance(method, Some(id));

                let Some((name_range, name)) = get_name(method) else {
                    return;
                };

                let typ = Type::Primitive(Primitive::Function(Some(id)));

                let symbol = self.symbol_with_info(
                    method,
                    SymbolKind::Property {
                        show_inlay_hint: false,
                    },
                    name.clone(),
                    name_range,
                    if did_swap {
                        SymbolFlags::default()
                    } else {
                        SymbolFlags::STATIC
                    },
                    typ.clone(),
                    Some((
                        TypeWithRange {
                            kind: typ,
                            range: method
                                .function_token()
                                .map_or_else(|| method.syntax().text_range(), |t| t.text_range()),
                        },
                        CheckTypeSource::Variable,
                    )),
                );

                self.arena[id.idx()].symbol = Some(symbol);
                self.add_current_container_member(name, symbol);
            }
            Member::Constructor(constructor) => {
                let id = self.collect_function(constructor);
                let did_swap = self.try_swap_to_instance(constructor, Some(id));

                let Some(keyword) = constructor.constructor_keyword() else {
                    return;
                };
                let name_range = keyword.text_range();

                let typ = Type::Primitive(Primitive::Function(Some(id)));

                let symbol = self.symbol_with_info(
                    constructor,
                    SymbolKind::Property {
                        show_inlay_hint: false,
                    },
                    "constructor".into(),
                    name_range,
                    if did_swap {
                        SymbolFlags::default()
                    } else {
                        SymbolFlags::STATIC
                    },
                    typ.clone(),
                    Some((
                        TypeWithRange {
                            kind: typ,
                            range: constructor.constructor_keyword().map_or_else(
                                || constructor.syntax().text_range(),
                                |t| t.text_range(),
                            ),
                        },
                        CheckTypeSource::Variable,
                    )),
                );

                self.arena[id.idx()].symbol = Some(symbol);
                self.add_current_container_member("constructor".into(), symbol);
            }
        }
    }

    fn collect_table_property(&mut self, property: &Property) {
        let expr_typ = property.value().map_or_else(
            || TypeWithRange {
                kind: Type::ANY,
                range: property.syntax().text_range(),
            },
            |v| self.expr_to_type_with_range(&v),
        );

        let Some(name_node) = property.name() else {
            return;
        };

        let Some((name_range, name)) = self.get_member_name(name_node) else {
            return;
        };

        let typ = expr_typ.kind.add_any();

        let symbol = self.symbol_with_info(
            property,
            SymbolKind::Property {
                show_inlay_hint: true,
            },
            name.clone(),
            name_range,
            SymbolFlags::default(),
            typ,
            Some((expr_typ, CheckTypeSource::Variable)),
        );

        self.add_current_container_member(name, symbol);
    }

    fn collect_class_property(&mut self, property: &Property) {
        let expr_typ = property.value().map_or_else(
            || TypeWithRange {
                kind: Type::ANY,
                range: property.syntax().text_range(),
            },
            |v| self.expr_to_type_with_range(&v),
        );

        let did_swap = self.try_swap_to_instance(property, expr_typ.kind.to_function().ok());

        let Some(name_node) = property.name() else {
            return;
        };

        let Some((name_range, name)) = self.get_member_name(name_node) else {
            return;
        };

        let typ = expr_typ.kind.add_any();

        let symbol = self.symbol_with_info(
            property,
            SymbolKind::Property {
                show_inlay_hint: true,
            },
            name.clone(),
            name_range,
            if did_swap {
                SymbolFlags::default()
            } else {
                SymbolFlags::STATIC
            },
            typ,
            Some((expr_typ, CheckTypeSource::Variable)),
        );

        self.add_current_container_member(name, symbol);
    }

    /// returns whether the value was assigned via '=' (used to increment the internal auto assign counter)
    fn collect_enum_property(&mut self, property: &Property, default_value: i32) -> bool {
        let (has_value, expr_typ) = property.value().map_or_else(
            || {
                (
                    false,
                    TypeWithRange {
                        kind: Type::Primitive(Primitive::Integer(Some(default_value))),
                        range: property.syntax().text_range(),
                    },
                )
            },
            |expr| {
                self.check_constant(&expr);
                (true, self.expr_to_type_with_range(&expr))
            },
        );

        let Some(name_node) = property.name() else {
            return has_value;
        };

        let Some((name_range, name)) = self.get_member_name(name_node) else {
            return has_value;
        };

        let symbol = self.symbol_with_info(
            property,
            SymbolKind::EnumMember,
            name.clone(),
            name_range,
            SymbolFlags::default(),
            expr_typ.kind.clone(),
            Some((expr_typ, CheckTypeSource::Variable)),
        );

        self.add_current_container_member(name, symbol);

        has_value
    }

    fn collect_stmt(&mut self, stmt: &Stmt) {
        if self.dead_code && !matches!(stmt, Stmt::Empty(_)) {
            match self.db.config().unreachable_code {
                UnreachableCode::Off => {}
                UnreachableCode::Hint => {
                    self.diagnostics.push(Diagnostic {
                        message: "Unreachable statement detected".to_owned(),
                        range: stmt.syntax().text_range(),
                        severity: DiagnosticSeverity::UnnecessaryHint,
                    });
                }
                UnreachableCode::Warn => {
                    self.diagnostics.push(Diagnostic {
                        message: "Unreachable statement detected".to_owned(),
                        range: stmt.syntax().text_range(),
                        severity: DiagnosticSeverity::UnnecessaryWarn,
                    });
                    // For warnings produce the diagnostic only once to not
                    // create a lot of noise
                    self.dead_code = false;
                }
            }
        }

        match stmt {
            Stmt::LocalVariable(stmt) => self.local_variable(stmt),
            Stmt::LocalFunction(stmt) => self.local_function(stmt),
            Stmt::Block(stmt) => self.block_statement(stmt),
            Stmt::Const(stmt) => self.const_statement(stmt),
            Stmt::ForEach(stmt) => self.for_each_statement(stmt),
            Stmt::For(stmt) => self.for_statement(stmt),
            Stmt::Class(stmt) => self.class_statement(stmt),
            Stmt::Function(stmt) => self.function_statement(stmt),
            Stmt::Enum(stmt) => self.enum_statement(stmt),
            Stmt::Expression(stmt) => self.expression_statement(stmt),
            Stmt::Empty(_) => (),
            Stmt::If(stmt) => self.if_statement(stmt),
            Stmt::While(stmt) => self.while_statement(stmt),
            Stmt::DoWhile(stmt) => self.do_while_statement(stmt),
            Stmt::Switch(stmt) => self.switch_statement(stmt),
            Stmt::Return(stmt) => self.return_statement(stmt),
            Stmt::Yield(stmt) => self.yield_statement(stmt),
            Stmt::Continue(stmt) => self.continue_statement(stmt),
            Stmt::Break(stmt) => self.break_statement(stmt),
            Stmt::Try(stmt) => self.try_statement(stmt),
            Stmt::Throw(stmt) => self.throw_statement(stmt),
        }
    }

    fn local_variable(&mut self, decl: &LocalVariableDeclaration) {
        for var in decl.declarations() {
            let Some((name_range, name)) = get_name(&var) else {
                let Some(expr) = var.initialiser().and_then(|i| i.expression()) else {
                    continue;
                };

                self.collect_expr(&expr);
                continue;
            };

            // No symbol_with_info call here since we need to resolve doc comment of the declaration as well
            let kind = SymbolKind::Local(LocalKind::Variable);
            let node = SyntaxNodePtr::new(var.syntax());
            let Some(expr) = var.initialiser().and_then(|i| i.expression()) else {
                let typ = Type::NULL.add_any();

                let id = if let Some(info) = self
                    .resolve_variable_doc(&var, &name, name_range)
                    .or_else(|| self.resolve_variable_doc(decl, &name, name_range))
                {
                    let id = self.symbol(Symbol {
                        name: name.clone(),
                        node,
                        name_range,
                        kind,
                        is_type_explicit: info.typ.is_some(),
                        typ: info.typ.unwrap_or(typ),
                        description: info.description,
                        flags: info.flags,
                    });
                    self.doc_to_symbol.insert(info.range, id);
                    id
                } else {
                    self.symbol(Symbol {
                        name: name.clone(),
                        node,
                        name_range,
                        kind,
                        is_type_explicit: false,
                        typ,
                        description: None,
                        flags: SymbolFlags::default(),
                    })
                };

                insert_symbol(&mut self.current_scope().locals, name, id);
                continue;
            };

            let expr_type = self.expr_to_type_with_range(&expr);
            let typ = expr_type.kind.add_any();
            let id = if let Some(info) = self
                .resolve_variable_doc(&var, &name, name_range)
                .or_else(|| self.resolve_variable_doc(decl, &name, name_range))
            {
                let typ = info.typ.as_ref().map_or(typ, |doc_type| {
                    self.check_type(
                        doc_type,
                        &expr_type.kind,
                        CheckTypeSource::Variable,
                        expr_type.range,
                    )
                });

                let id = self.symbol(Symbol {
                    name: name.clone(),
                    node,
                    name_range,
                    kind,
                    is_type_explicit: info.typ.is_some(),
                    typ: info.typ.unwrap_or(typ),
                    description: info.description,
                    flags: info.flags,
                });
                self.doc_to_symbol.insert(info.range, id);
                id
            } else {
                self.symbol(Symbol {
                    name: name.clone(),
                    node,
                    name_range,
                    kind,
                    is_type_explicit: false,
                    typ,
                    description: None,
                    flags: SymbolFlags::default(),
                })
            };

            insert_symbol(&mut self.current_scope().locals, name, id);
        }
    }

    fn local_function(&mut self, decl: &LocalFunctionDeclaration) {
        let id = self.collect_function(decl);
        let Some((name_range, name)) = get_name(decl) else {
            return;
        };

        let typ = Type::Primitive(Primitive::Function(Some(id)));
        let symbol = self.symbol_with_info(
            decl,
            SymbolKind::Local(LocalKind::Function),
            name.clone(),
            name_range,
            SymbolFlags::default(),
            typ.clone(),
            Some((
                TypeWithRange {
                    kind: typ,
                    range: decl
                        .function_token()
                        .map_or_else(|| decl.syntax().text_range(), |t| t.text_range()),
                },
                CheckTypeSource::Variable,
            )),
        );

        self.arena[id.idx()].symbol = Some(symbol);
        insert_symbol(&mut self.current_scope().locals, name, symbol);
    }

    fn block_statement(&mut self, stmt: &BlockStatement) {
        self.enter_scope(stmt.syntax().text_range());
        for stmt in stmt.statements() {
            self.collect_stmt(&stmt);
        }
        self.exit_scope();
    }

    fn const_statement(&mut self, stmt: &ConstStatement) {
        let expr_typ = stmt.value().and_then(|v| v.expression()).map_or_else(
            || TypeWithRange {
                kind: Type::ANY,
                range: stmt.syntax().text_range(),
            },
            |expr| {
                self.check_constant(&expr);
                self.expr_to_type_with_range(&expr)
            },
        );

        let Some((name_range, name)) = get_name(stmt) else {
            return;
        };

        let symbol = self.symbol_with_info(
            stmt,
            SymbolKind::Constant,
            name.clone(),
            name_range,
            SymbolFlags::CONST,
            expr_typ.kind.clone(),
            Some((expr_typ, CheckTypeSource::Variable)),
        );

        insert_symbol(&mut self.arena[self.const_table].members, name, symbol);
    }

    fn for_each_statement(&mut self, stmt: &ForEachStatement) {
        let save_break_continue = (self.can_break, self.can_continue);
        self.can_break = true;
        self.can_continue = true;
        if let Some(body) = stmt.body() {
            self.enter_scope(body.syntax().text_range());
        } else {
            self.enter_scope(TextRange::empty(stmt.syntax().text_range().end()));
        }

        let (key_type, value_type) = stmt
            .iterable()
            .and_then(|iterable| {
                let typ = self.expr_to_type_with_range(&iterable);
                self.iterable(&typ)
            })
            .unwrap_or_else(|| (Type::STRING.add_any(), Type::ANY));

        if let Some(key) = stmt.key()
            && let Some((name_range, name)) = get_name(&key)
        {
            let symbol = self.symbol_with_info(
                &key,
                SymbolKind::Local(LocalKind::Variable),
                name.clone(),
                name_range,
                SymbolFlags::default(),
                key_type.clone(),
                Some((
                    TypeWithRange {
                        kind: key_type,
                        range: key.syntax().text_range(),
                    },
                    CheckTypeSource::Variable,
                )),
            );

            insert_symbol(&mut self.current_scope().locals, name, symbol);
        }

        if let Some(value) = stmt.value()
            && let Some((name_range, name)) = get_name(&value)
        {
            let symbol = self.symbol_with_info(
                &value,
                SymbolKind::Local(LocalKind::Variable),
                name.clone(),
                name_range,
                SymbolFlags::default(),
                value_type.clone(),
                Some((
                    TypeWithRange {
                        kind: value_type,
                        range: value.syntax().text_range(),
                    },
                    CheckTypeSource::Variable,
                )),
            );

            insert_symbol(&mut self.current_scope().locals, name, symbol);
        }

        if let Some(body) = stmt.body() {
            self.collect_stmt(&body);
        }

        self.exit_scope();
        (self.can_break, self.can_continue) = save_break_continue;
    }

    fn for_statement(&mut self, stmt: &ForStatement) {
        let save_break_continue = (self.can_break, self.can_continue);
        self.can_break = true;
        self.can_continue = true;
        self.enter_scope(stmt.syntax().text_range());
        match stmt.initialiser().and_then(|i| i.kind()) {
            Some(ForInitialiserKind::LocalVariableDeclaration(decl)) => self.local_variable(&decl),
            Some(ForInitialiserKind::LocalFunctionDeclaration(decl)) => self.local_function(&decl),
            Some(ForInitialiserKind::Expression(expr)) => {
                self.collect_expr(&expr);
            }
            None => {}
        }
        if let Some(condition) = stmt.condition().and_then(|c| c.expression()) {
            self.collect_expr(&condition);
            self.apply_condition_narrowing(&condition, true);
        }
        if let Some(increment) = stmt.increment().and_then(|i| i.expression()) {
            self.collect_expr(&increment);
        }
        if let Some(body) = stmt.body() {
            self.collect_stmt(&body);
        }
        self.exit_scope();
        (self.can_break, self.can_continue) = save_break_continue;
    }

    fn class_statement(&mut self, stmt: &ClassStatement) {
        let class = self.class(stmt);

        let name = stmt.name().and_then(|n| self.assignment_lhs(&n));
        self.expr_new_symbol(
            stmt,
            name,
            TypeWithRange {
                kind: Type::Primitive(Primitive::Class(Some(class))),
                range: stmt.syntax().text_range(),
            },
            false,
            true,
        );

        let save_symbol = self.container;
        self.container = Container::Class(class);
        for member in stmt.members() {
            self.collect_class_member(&member);
        }
        self.container = save_symbol;
    }

    fn function_statement_container(
        &mut self,
        id: FunctionId,
        name: &QualifiedName,
    ) -> Result<Container, FunctionContainerError> {
        let mut parts = name.parts();
        let (range, first_name) =
            get_name(&parts.next().ok_or(FunctionContainerError::SingleName)?)
                .ok_or(FunctionContainerError::FailedToResolve)?;

        let offset = name.syntax().text_range().end();

        let members = self
            .members_of_container(
                self.execution_container(),
                FindSymbol::BeforeIfInExecutionRange(offset, self.scope),
                false,
            )
            .into_iter()
            .find_map(|(name, id)| (first_name == name).then_some(id));

        let root = || {
            self.members_of_table(
                self.root_table(),
                FindSymbol::BeforeIfInExecutionRange(offset, self.scope),
                ImportMembers::Root,
                false,
            )
            .into_iter()
            .find_map(|(name, id)| (first_name == name).then_some(id))
        };

        let Some(symbol_id) = members.or_else(root) else {
            if self
                .local_members(offset)
                .into_iter()
                .any(|(name, _)| first_name == name)
            {
                self.diagnostics.push(Diagnostic {
                    message: "Function statement does not lookup locals. Initial symbol not found"
                        .to_owned(),
                    range,
                    severity: DiagnosticSeverity::Information,
                });
            }
            return Err(FunctionContainerError::FailedToResolve);
        };

        let mut typ = TypeWithRange {
            kind: self.get(symbol_id).typ.clone(),
            range,
        };
        self.new_reference(range, symbol_id);

        for segment in parts {
            let arguments = [
                TypeWithRange {
                    kind: Type::STRING,
                    range: typ.range,
                },
                TypeWithRange {
                    kind: Type::ANY,
                    range: segment.syntax().text_range(),
                },
            ];

            let NewSlotResult::CanAdd(container) = self.new_slot(&typ, &arguments) else {
                return Err(FunctionContainerError::FailedToResolve);
            };

            let (range, name) =
                get_name(&segment).ok_or(FunctionContainerError::FailedToResolve)?;

            let id = self
                .members_of_container(
                    container,
                    FindSymbol::BeforeIfInExecutionRange(offset, self.scope),
                    false,
                )
                .into_iter()
                .find_map(|(member_name, id)| (member_name == name).then_some(id))
                .ok_or(FunctionContainerError::FailedToResolve)?;

            typ = TypeWithRange {
                kind: self.get(id).typ.clone(),
                range,
            };
            self.new_reference(range, id);
        }

        let range = name
            .name()
            .ok_or(FunctionContainerError::FailedToResolve)?
            .identifier()
            .ok_or(FunctionContainerError::FailedToResolve)?
            .text_range();

        let arguments = [
            TypeWithRange {
                kind: Type::STRING,
                range: typ.range,
            },
            TypeWithRange {
                kind: Type::Primitive(Primitive::Function(Some(id))),
                range,
            },
        ];

        if let NewSlotResult::CanAdd(container) = self.new_slot(&typ, &arguments) {
            Ok(container)
        } else {
            Err(FunctionContainerError::FailedToResolve)
        }
    }

    fn function_statement(&mut self, stmt: &FunctionStatement) {
        let id = self.collect_function(stmt);

        let Some(qualified_name) = stmt.name() else {
            return;
        };

        let container = self.function_statement_container(id, &qualified_name);
        let Some((name_range, name)) = get_name(&qualified_name) else {
            return;
        };

        let typ = Type::Primitive(Primitive::Function(Some(id)));

        let symbol = self.symbol_with_info(
            stmt,
            SymbolKind::Property {
                show_inlay_hint: false,
            },
            name.clone(),
            name_range,
            SymbolFlags::default(),
            typ.clone(),
            Some((
                TypeWithRange {
                    kind: typ,
                    range: stmt
                        .function_token()
                        .map_or_else(|| stmt.syntax().text_range(), |t| t.text_range()),
                },
                CheckTypeSource::Variable,
            )),
        );

        self.arena[id.idx()].symbol = Some(symbol);

        let container = match container {
            Ok(container) => container,
            Err(FunctionContainerError::SingleName) => self.container,
            Err(FunctionContainerError::FailedToResolve) => return,
        };

        self.add_container_member(container, name, symbol);
        if let Some(function) = self.get_mut(id) {
            function.container = container;
        }
    }

    fn enum_statement(&mut self, stmt: &EnumStatement) {
        let id = EnumId::new(self.file, self.arena.alloc(EnumData::default()));

        if let Some((name_range, name)) = get_name(stmt) {
            let typ = Type::Enum(id);

            let symbol = self.symbol_with_info(
                stmt,
                SymbolKind::Constant,
                name.clone(),
                name_range,
                SymbolFlags::CONST,
                typ.clone(),
                Some((
                    TypeWithRange {
                        kind: typ,
                        range: stmt.syntax().text_range(),
                    },
                    CheckTypeSource::Variable,
                )),
            );

            self.arena[id.idx()].symbol = Some(symbol);

            insert_symbol(&mut self.arena[self.const_table].members, name, symbol);
        }

        let save_symbol = self.container;
        self.container = Container::Enum(id);
        let mut value = 0;
        for property in stmt.members() {
            if !self.collect_enum_property(&property, value) {
                value += 1;
            }
        }
        self.container = save_symbol;
    }

    fn expression_statement(&mut self, stmt: &ExpressionStatement) {
        let Some(expr) = stmt.expression() else {
            return;
        };

        self.collect_expr(&expr);
        self.check_no_discard(&expr);
    }

    fn check_no_discard(&mut self, expr: &Expr) {
        let Expr::Call(call) = expr else { return };
        let Some(callee) = call.callee().and_then(|c| c.expression()) else {
            return;
        };

        let typ = self.type_at(callee.syntax().text_range());
        let Some(resolution) = self.to_function_id(&typ, callee.syntax().text_range().start())
        else {
            return;
        };

        let message = match resolution {
            FunctionIdResolution::DefaultConstructor => {
                "Default constructor produces no side effects so returned object should not be ignored".to_owned()
            }
            FunctionIdResolution::Function(id) => {
                if !self.get(id).flags.intersects(FunctionFlags::NO_DISCARD) {
                    return;
                }

                self.get(id).symbol.map_or_else(
                || {
                    "Return value of this function is marked '@nodiscard' and should not be ignored"
                        .to_owned()
                },
                |s| {
                    format!(
                        "Return value of '{}' is marked '@nodiscard' and should not be ignored",
                        &self.get(s).name
                    )
                },
            )
            }
        };

        self.diagnostics.push(Diagnostic {
            message,
            range: expr.syntax().text_range(),
            severity: DiagnosticSeverity::Warning,
        });
    }

    fn if_statement(&mut self, stmt: &IfStatement) {
        let condition = stmt.condition();
        if let Some(condition) = condition.as_ref() {
            self.collect_expr(condition);
        }

        if let Some(then_stmt) = stmt.statement() {
            self.enter_scope(then_stmt.syntax().text_range());
            if let Some(condition) = condition.as_ref() {
                self.apply_condition_narrowing(condition, true);
            }
            self.collect_stmt(&then_stmt);
            self.exit_scope();
        }

        if let Some(else_stmt) = stmt.else_branch().and_then(|e| e.statement()) {
            self.enter_scope(else_stmt.syntax().text_range());
            if let Some(condition) = condition.as_ref() {
                self.apply_condition_narrowing(condition, false);
            }
            self.collect_stmt(&else_stmt);
            self.exit_scope();
        }
    }

    fn while_statement(&mut self, stmt: &WhileStatement) {
        if let Some(condition) = stmt.condition() {
            self.collect_expr(&condition);
            self.apply_condition_narrowing(&condition, true);
        }

        if let Some(body) = stmt.body() {
            let save_break_continue = (self.can_break, self.can_continue);
            self.can_break = true;
            self.can_continue = true;
            self.enter_scope(body.syntax().text_range());
            self.collect_stmt(&body);
            self.exit_scope();
            (self.can_break, self.can_continue) = save_break_continue;
        }
    }

    fn do_while_statement(&mut self, stmt: &DoWhileStatement) {
        if let Some(body) = stmt.body() {
            let save_break_continue = (self.can_break, self.can_continue);
            self.can_break = true;
            self.can_continue = true;
            self.enter_scope(body.syntax().text_range());
            self.collect_stmt(&body);
            self.exit_scope();
            (self.can_break, self.can_continue) = save_break_continue;
        }

        if let Some(condition) = stmt.condition() {
            self.collect_expr(&condition);
        }
    }

    fn switch_statement(&mut self, stmt: &SwitchStatement) {
        let typ = if let Some(discriminant) = stmt.discriminant() {
            let disc = self.expr_to_type_with_range(&discriminant);
            if !disc
                .kind
                .type_flags()
                .intersects(TypeFlags::VALID_DISCRIMINANT)
            {
                self.diagnostics.push(Diagnostic {
                    message: format!(
                        "Discriminant of type '{}' depends on the variable addresses",
                        self.type_to_str_generic(&disc.kind)
                    ),
                    range: disc.range,
                    severity: DiagnosticSeverity::Warning,
                });
            }
            Some(disc.kind)
        } else {
            None
        };

        let discriminant_flags = typ.as_ref().map(Type::type_flags);

        let save_break = self.can_break;
        self.can_break = true;
        for clause in stmt.clauses() {
            match clause {
                SwitchClause::Case(case) => {
                    if let Some(test) = case.test() {
                        let case_type = self.expr_to_type_with_range(&test);
                        let case_flags = case_type.kind.type_flags();
                        if let Some(flags) = discriminant_flags
                            && !case_flags.intersects(TypeFlags::ANY)
                            && !flags.intersects(TypeFlags::ANY)
                            && !(case_flags.intersects(flags)
                                || case_flags.intersects(TypeFlags::NUMBER)
                                    && flags.intersects(TypeFlags::NUMBER))
                        {
                            self.diagnostics.push(Diagnostic {
                                message: format!(
                                    "Case of type '{}' is incompitable with the discriminant of type '{}'",
                                    self.type_to_str(&case_type.kind),
                                    self.type_to_str(typ.as_ref().expect("If we have flags then we must have the type")
                                )),
                                range: case_type.range,
                                severity: DiagnosticSeverity::Warning,
                            });
                        }
                    }

                    self.enter_scope(case.syntax().text_range());
                    for stmt in case.body() {
                        self.collect_stmt(&stmt);
                    }
                    self.exit_scope();
                }
                SwitchClause::Default(default) => {
                    self.enter_scope(default.syntax().text_range());
                    for stmt in default.body() {
                        self.collect_stmt(&stmt);
                    }
                    self.exit_scope();
                }
            }
        }
        self.can_break = save_break;
    }

    fn return_statement(&mut self, stmt: &ReturnStatement) {
        let value = stmt.value().map_or_else(
            || TypeWithRange {
                range: stmt.syntax().text_range(),
                kind: Type::NULL,
            },
            |v| self.expr_to_type_with_range(&v),
        );

        self.dead_code = true;

        let Some(function) = self.function else {
            if stmt.value().is_some() {
                self.diagnostics.push(Diagnostic {
                    message: "Value returned by the source file execution scope cannot be received in any way".to_owned(),
                    range: stmt.syntax().text_range(),
                    severity: DiagnosticSeverity::Warning,
                });
            }
            return;
        };

        let (ret, is_explicit) = match self.arena[function].ret.clone() {
            TypeState::Absent => {
                self.arena[function].ret = TypeState::NotExplicit(value.kind);
                return;
            }
            TypeState::Explicit(typ) => (typ, true),
            TypeState::NotExplicit(typ) => (typ, false),
        };

        let new = self.update_type(
            &ret,
            is_explicit,
            TypeWithRange {
                kind: value.kind,
                range: stmt.syntax().text_range(),
            },
            CheckTypeSource::Return,
        );

        self.arena[function].ret = if is_explicit {
            TypeState::Explicit(new)
        } else {
            TypeState::NotExplicit(new)
        };
    }

    fn yield_statement(&mut self, stmt: &YieldStatement) {
        let value = stmt.value().map_or_else(
            || TypeWithRange {
                range: stmt.syntax().text_range(),
                kind: Type::default(),
            },
            |v| self.expr_to_type_with_range(&v),
        );

        let Some(function) = self.function else {
            self.diagnostics.push(Diagnostic {
                message: "Yielding in the source file execution scope".to_owned(),
                range: stmt.syntax().text_range(),
                severity: DiagnosticSeverity::Warning,
            });
            return;
        };

        let (yields, is_explicit) = match self.arena[function].yields.clone() {
            TypeState::Absent => {
                self.arena[function].yields = TypeState::NotExplicit(value.kind);
                return;
            }
            TypeState::Explicit(typ) => (typ, true),
            TypeState::NotExplicit(typ) => (typ, false),
        };

        let new = self.update_type(&yields, is_explicit, value, CheckTypeSource::Yield);

        self.arena[function].yields = if is_explicit {
            TypeState::Explicit(new)
        } else {
            TypeState::NotExplicit(new)
        };
    }

    fn continue_statement(&mut self, stmt: &ContinueStatement) {
        if !self.can_continue {
            self.diagnostics.push(Diagnostic {
                message: "'continue' has to be in a loop block".to_owned(),
                range: stmt.syntax().text_range(),
                ..Default::default()
            });
        }
        self.dead_code = true;
    }

    fn break_statement(&mut self, stmt: &BreakStatement) {
        if !self.can_break {
            self.diagnostics.push(Diagnostic {
                message: "'break' has to be in a loop or 'switch' block".to_owned(),
                range: stmt.syntax().text_range(),
                ..Default::default()
            });
        }
        self.dead_code = true;
    }

    fn try_statement(&mut self, stmt: &TryStatement) {
        if let Some(body) = stmt.body() {
            self.enter_scope(body.syntax().text_range());
            self.collect_stmt(&body);
            self.exit_scope();
        }

        let Some(catch) = stmt.catch_clause() else {
            return;
        };

        self.enter_scope(catch.body().map_or_else(
            || TextRange::empty(catch.syntax().text_range().end()),
            |body| body.syntax().text_range(),
        ));

        if let Some(binding) = catch.binding()
            && let Some((name_range, name)) = get_name(&binding)
        {
            let typ = Type::STRING.add_any();
            let symbol = self.symbol_with_info(
                &binding,
                SymbolKind::Local(LocalKind::Exception),
                name.clone(),
                name_range,
                SymbolFlags::default(),
                typ.clone(),
                Some((
                    TypeWithRange {
                        kind: typ,
                        range: binding.syntax().text_range(),
                    },
                    CheckTypeSource::Variable,
                )),
            );

            insert_symbol(&mut self.current_scope().locals, name, symbol);
        }

        if let Some(body) = catch.body() {
            self.collect_stmt(&body);
        }

        self.exit_scope();
    }

    fn throw_statement(&mut self, stmt: &ThrowStatement) {
        // mark current function as exception throwing
        let value = stmt.value().map_or(Type::ANY, |v| self.expr_to_type(&v));

        self.dead_code = true;
        let Some(function) = self.function else {
            return;
        };

        let (throws, is_explicit) = match self.arena[function].throws.clone() {
            TypeState::Absent => {
                self.arena[function].throws = TypeState::NotExplicit(value);
                return;
            }
            TypeState::Explicit(typ) => (typ, true),
            TypeState::NotExplicit(typ) => (typ, false),
        };

        let new = self.update_type(
            &throws,
            is_explicit,
            TypeWithRange {
                kind: value,
                range: stmt.syntax().text_range(),
            },
            CheckTypeSource::Throw,
        );

        self.arena[function].throws = if is_explicit {
            TypeState::Explicit(new)
        } else {
            TypeState::NotExplicit(new)
        };
    }

    fn expr_to_type(&mut self, expr: &Expr) -> Type {
        let kind = self.collect_expr(expr);
        self.expr_kind_to_type(kind.as_ref(), expr.syntax().text_range().end())
    }

    fn apply_condition_narrowing(&mut self, condition: &Expr, truthy: bool) {
        match condition {
            Expr::Parenthesised(expr) => {
                if let Some(inner) = expr.inner() {
                    self.apply_condition_narrowing(&inner, truthy);
                }
            }

            // !x -> flip truthiness and recurse into the operand
            Expr::PrefixUnary(expr) => {
                if let Some((PrefixUnaryOperator::LogicalNot, _)) = expr.operator()
                    && let Some(operand) = expr.operand()
                {
                    self.apply_condition_narrowing(&operand, !truthy);
                }
            }

            Expr::Binary(expr) => {
                let Some((operator, _)) = expr.operator() else {
                    return;
                };

                match operator {
                    // a && b: only the *truthy* branch is safe to narrow conjunctively.
                    // If it's false we don't know which operand failed.
                    BinaryOperator::LogicalAnd if truthy => {
                        if let Some(lhs) = expr.lhs() {
                            self.apply_condition_narrowing(&lhs, true);
                        }
                        if let Some(rhs) = expr.rhs() {
                            self.apply_condition_narrowing(&rhs, true);
                        }
                    }
                    // a || b: mirror image, only the falsy branch (both false) is safe.
                    BinaryOperator::LogicalOr if !truthy => {
                        if let Some(lhs) = expr.lhs() {
                            self.apply_condition_narrowing(&lhs, false);
                        }
                        if let Some(rhs) = expr.rhs() {
                            self.apply_condition_narrowing(&rhs, false);
                        }
                    }
                    BinaryOperator::Equals | BinaryOperator::NotEquals => {
                        self.apply_equality_narrowing(expr, operator, truthy);
                    }
                    BinaryOperator::InstanceOf => {
                        self.apply_instanceof_narrowing(expr, truthy);
                    }
                    BinaryOperator::Assign | BinaryOperator::NewSlot => {
                        if let Some(lhs) = expr.lhs() {
                            self.apply_condition_narrowing(&lhs, truthy);
                        }
                    }
                    _ => {}
                }
            }

            // Bare `if (x)` / leaf of `&&`/`||` recursion — plain truthiness check
            _ => self.apply_truthy_narrowing(condition, truthy),
        }
    }

    fn apply_equality_narrowing(
        &mut self,
        expr: &BinaryExpression,
        operator: BinaryOperator,
        truthy: bool,
    ) {
        let (Some(lhs), Some(rhs)) = (expr.lhs(), expr.rhs()) else {
            return;
        };
        let is_eq = (operator == BinaryOperator::Equals) == truthy;

        // x == null / null == x / x != null / null != x
        if is_null_literal(&lhs) || is_null_literal(&rhs) {
            let symbol_expr = if is_null_literal(&lhs) { rhs } else { lhs };
            let Some(symbol) = self.condition_symbol(&symbol_expr) else {
                return;
            };
            let current = self.symbol_type_at(symbol, symbol_expr.syntax().text_range().end());

            let narrowed = if is_eq {
                Type::NULL
            } else {
                remove_null_from_type(&current)
            };
            self.current_scope().flow_types.insert(symbol, narrowed);
            return;
        }

        // typeof x == "string" / "string" == typeof x
        if let Some((operand, text_expr)) = typeof_pair(lhs, rhs) {
            let Some(symbol) = self.condition_symbol(&operand) else {
                return;
            };
            let Some(text) = self.literal_string_text(&text_expr) else {
                return;
            };
            let current = self.symbol_type_at(symbol, operand.syntax().text_range().end());

            let narrowed = if is_eq {
                typeof_name_to_type(&text).unwrap_or(current)
            } else {
                remove_typeof_from_type(&current, &text)
            };
            self.current_scope().flow_types.insert(symbol, narrowed);
        }
    }

    fn apply_instanceof_narrowing(&mut self, expr: &BinaryExpression, truthy: bool) {
        // Falsy branch of `instanceof` doesn't pin down a precise type generically so
        // only narrow the truthy side.
        if !truthy {
            return;
        }
        let (Some(lhs), Some(rhs)) = (expr.lhs(), expr.rhs()) else {
            return;
        };
        let Some(symbol) = self.condition_symbol(&lhs) else {
            return;
        };

        // rhs was already resolved during normal expr collection of the binary
        // expression, so pull its recorded type instead of re-evaluating it.
        let class_type = self.type_at(rhs.syntax().text_range());
        let Ok(class_id) = class_type.to_class() else {
            return;
        };

        self.current_scope()
            .flow_types
            .insert(symbol, Type::Primitive(Primitive::Instance(Some(class_id))));
    }

    fn apply_truthy_narrowing(&mut self, expr: &Expr, truthy: bool) {
        let Some(symbol) = self.condition_symbol(expr) else {
            return;
        };
        let current = self.symbol_type_at(symbol, expr.syntax().text_range().end());

        let narrowed = if truthy {
            remove_falsy_from_type(&current)
        } else {
            remove_truthy_from_type(&current)
        };
        self.current_scope().flow_types.insert(symbol, narrowed);
    }

    fn literal_string_text(&mut self, expr: &Expr) -> Option<Box<str>> {
        let Expr::Literal(lit) = expr else {
            return None;
        };
        let (kind, token) = lit.token()?;
        let name_kind = match kind {
            LiteralExpressionKind::String => StringNameKind::Normal,
            LiteralExpressionKind::VerbatimString => StringNameKind::Verbatim,
            _ => return None,
        };
        let id = self.string(&(name_kind, token));
        Some(self.get(id).text.clone())
    }

    fn condition_symbol(&self, expr: &Expr) -> Option<SymbolId> {
        match self.expr_kind_at(expr.syntax().text_range()) {
            None | Some(ExpressionKind::Literal(_)) => None,
            Some(ExpressionKind::Symbol(id)) => Some(*id),
        }
    }

    fn expr_to_type_with_range(&mut self, expr: &Expr) -> TypeWithRange {
        TypeWithRange {
            kind: self.expr_to_type(expr),
            range: expr.syntax().text_range(),
        }
    }

    fn collect_expr(&mut self, expr: &Expr) -> NullableExprKind {
        let kind = match expr {
            Expr::Literal(expr) => self.literal_expression::<false>(expr),
            Expr::TableLiteral(expr) => Some(self.table_literal_expression(expr)),
            Expr::Class(expr) => Some(self.class_expression(expr)),
            Expr::ArrayLiteral(expr) => Some(self.array_literal_expression(expr)),
            Expr::Name(expr) => self.name_expression(expr),
            Expr::This(expr) => Some(self.this_expression(expr)),
            Expr::RootAccess(expr) => self.root_access_expression(expr),
            Expr::Base(expr) => Some(self.base_expression(expr)),
            Expr::MemberAccess(expr) => self.member_access_expression(expr),
            Expr::ElementAccess(expr) => self.element_access_expression(expr),
            Expr::Call(expr) => self.call_expression(expr),
            Expr::Clone(expr) => self.clone_expression(expr),
            Expr::Binary(expr) => self.binary_expression(expr),
            Expr::Conditional(expr) => Some(self.conditional_expression(expr)),
            Expr::PrefixUnary(expr) => self.prefix_unary_expression(expr),
            Expr::PrefixUpdate(expr) => self.prefix_update_expression(expr),
            Expr::PostfixUpdate(expr) => self.postfix_update_expression(expr),
            Expr::Delete(expr) => self.delete_expression(expr),
            Expr::TypeOf(expr) => Some(self.type_of_expression(expr)),
            Expr::Resume(expr) => self.resume_expression(expr),
            Expr::RawCall(expr) => self.raw_call_expression(expr),
            Expr::File(_) => Some(ExpressionKind::Literal(Type::STRING)),
            Expr::Line(_) => Some(ExpressionKind::Literal(Type::INTEGER)),
            Expr::Parenthesised(expr) => self.parenthesised_expression(expr),
            Expr::Function(expr) => Some(self.function_expression(expr)),
            Expr::Lambda(expr) => Some(self.lambda_expression(expr)),
        };

        if let Some(kind) = kind.clone() {
            let range = expr.syntax().text_range();
            self.range_to_expr.insert(range, kind);
        }

        kind
    }

    fn literal_expression<const NEGATIVE: bool>(
        &mut self,
        expr: &LiteralExpression,
    ) -> NullableExprKind {
        let (kind, token) = expr.token()?;

        Some(match kind {
            LiteralExpressionKind::DecimalInteger => {
                let text = token.text();

                if text.starts_with('0') && text.len() > 1 {
                    self.diagnostics.push(Diagnostic {
                        message: "Leading '0' can be removed".to_owned(),
                        range: token.text_range(),
                        severity: DiagnosticSeverity::Warning,
                    });
                }

                let signed_text = if NEGATIVE {
                    format!("-{text}")
                } else {
                    text.to_owned()
                };

                // Default values are provided to signify that the user has tried
                // to write a literal but the literal was malformed
                // This is to not error out
                let value = signed_text.parse::<i32>().unwrap_or_else(|_| {
                    self.diagnostics.push(Diagnostic {
                        message: format!(
                            "Integer literal '{signed_text}' is out of range for a 32-bit integer"
                        ),
                        range: token.text_range(),
                        severity: DiagnosticSeverity::Warning,
                    });

                    if NEGATIVE { i32::MIN } else { i32::MAX }
                });

                ExpressionKind::Literal(Type::Primitive(Primitive::Integer(Some(value))))
            }
            LiteralExpressionKind::OctalInteger => {
                let text = token.text();
                let (signed_text, parse_text) = if NEGATIVE {
                    (format!("-{text}"), format!("-{}", &text[1..]))
                } else {
                    (text.to_owned(), text[1..].to_owned())
                };

                // 0321321
                let value = i32::from_str_radix(&parse_text, 8).unwrap_or_else(|_| {
                    self.diagnostics.push(Diagnostic {
                        message: format!(
                            "Octal literal '{signed_text}' is out of range for a 32-bit integer"
                        ),
                        range: token.text_range(),
                        severity: DiagnosticSeverity::Warning,
                    });

                    if NEGATIVE { i32::MIN } else { i32::MAX }
                });

                ExpressionKind::Literal(Type::Primitive(Primitive::Integer(Some(value))))
            }
            LiteralExpressionKind::HexInteger => {
                let text = token.text();
                let (signed_text, parse_text) = if NEGATIVE {
                    (format!("-{text}"), format!("-{}", &text[2..]))
                } else {
                    (text.to_owned(), text[2..].to_owned())
                };

                //0x12312312
                let value = i32::from_str_radix(&parse_text, 16).unwrap_or_else(|_| {
                    self.diagnostics.push(Diagnostic {
                        message: format!(
                            "Hex literal '{signed_text}' is out of range for a 32-bit integer"
                        ),
                        range: token.text_range(),
                        severity: DiagnosticSeverity::Warning,
                    });

                    if NEGATIVE { i32::MIN } else { i32::MAX }
                });

                ExpressionKind::Literal(Type::Primitive(Primitive::Integer(Some(value))))
            }
            LiteralExpressionKind::Character => {
                let text = token.text();
                let inner = text.strip_prefix('\'').unwrap_or(text);
                let inner = if inner.ends_with("\\'") {
                    inner
                } else {
                    inner.strip_suffix('\'').unwrap_or(inner)
                };

                let value = if inner.starts_with('\\') {
                    match inner.chars().nth(1) {
                        // \x is the only escape that names a raw byte rather than a codepoint,
                        // so it's the only one allowed to wrap 0x80-0xFF into a negative i8
                        Some('x') => {
                            let hex = &inner[2..];
                            #[allow(clippy::cast_possible_wrap)]
                            let wrapped =
                                u8::from_str_radix(hex, 16).ok().map(|b| i32::from(b as i8));
                            wrapped.unwrap_or(0)
                        }
                        Some('u' | 'U') => {
                            let hex = &inner[2..];
                            u32::from_str_radix(hex, 16)
                                .ok()
                                .and_then(|n| i32::try_from(n).ok())
                                .unwrap_or(0)
                        }
                        Some('t') => i32::from(b'\t'),
                        Some('a') => 0x07,
                        Some('b') => 0x08,
                        Some('n') => i32::from(b'\n'),
                        Some('r') => i32::from(b'\r'),
                        Some('v') => 0x0b,
                        Some('f') => 0x0c,
                        Some('0') | None => 0,
                        Some('\\') => i32::from(b'\\'),
                        Some('"') => i32::from(b'"'),
                        Some('\'') => i32::from(b'\''),
                        Some(other) => {
                            self.diagnostics.push(Diagnostic {
                                message: format!("Unknown escape sequence '\\{other}'"),
                                range: token.text_range(),
                                severity: DiagnosticSeverity::Warning,
                            });
                            0
                        }
                    }
                } else {
                    let ch = inner.chars().next();
                    ch.and_then(|c| u8::try_from(c).ok()).map_or(0, i32::from)
                };

                ExpressionKind::Literal(Type::Primitive(Primitive::Integer(Some(value))))
            }
            LiteralExpressionKind::Float => {
                let text = token.text();
                let signed_text = if NEGATIVE {
                    format!("-{text}")
                } else {
                    text.to_owned()
                };
                let value = signed_text.parse::<f32>().unwrap_or(0.0);

                ExpressionKind::Literal(Type::Primitive(Primitive::Float(Some(value))))
            }
            LiteralExpressionKind::String => {
                let string = self.string(&(StringNameKind::Normal, token));

                ExpressionKind::Literal(Type::Primitive(Primitive::String {
                    kind: StringKind::Arbitrary,
                    literal: Some(string),
                }))
            }
            LiteralExpressionKind::VerbatimString => {
                let string = self.string(&(StringNameKind::Verbatim, token));

                ExpressionKind::Literal(Type::Primitive(Primitive::String {
                    kind: StringKind::Arbitrary,
                    literal: Some(string),
                }))
            }
            LiteralExpressionKind::Null => ExpressionKind::Literal(Type::NULL),
            LiteralExpressionKind::True => {
                ExpressionKind::Literal(Type::Primitive(Primitive::Bool(Some(true))))
            }
            LiteralExpressionKind::False => {
                ExpressionKind::Literal(Type::Primitive(Primitive::Bool(Some(false))))
            }
        })
    }

    fn table_literal_expression(&mut self, expr: &TableLiteralExpression) -> ExpressionKind {
        let table = TableId::new(self.file, self.arena.alloc(TableData::default()));
        let save_symbol = self.container;
        self.container = Container::Table(table);
        for member in expr.members() {
            self.collect_table_member(&member);
        }
        self.container = save_symbol;

        ExpressionKind::Literal(Type::Primitive(Primitive::Table(Some(table))))
    }

    fn class_expression(&mut self, expr: &ClassExpression) -> ExpressionKind {
        let class = self.class(expr);

        let save_symbol = self.container;
        self.container = Container::Class(class);
        for member in expr.members() {
            self.collect_class_member(&member);
        }
        self.container = save_symbol;

        ExpressionKind::Literal(Type::Primitive(Primitive::Class(Some(class))))
    }

    fn array_literal_expression(&mut self, expr: &ArrayLiteralExpression) -> ExpressionKind {
        let mut types: Vec<_> = expr
            .elements()
            .map(|element| self.expr_to_type(&element))
            .collect();

        let Some(mut typ) = types.pop() else {
            return ExpressionKind::Literal(Type::ARRAY);
        };

        for next_type in types {
            typ = merge_types(&typ, &next_type);
        }

        ExpressionKind::Literal(Type::Primitive(Primitive::Array(Some(self.array(typ)))))
    }

    fn name_expression(&mut self, expr: &Name) -> NullableExprKind {
        let ident = expr.identifier()?;
        let text = ident.text();

        let offset = expr.syntax().text_range().end();
        self.resolve_name(text, offset).map(|id| {
            self.new_reference(ident.text_range(), id);
            if matches!(self.get(id).typ, Type::Enum(_))
                && expr
                    .syntax()
                    .parent()
                    .is_some_and(|p| !ast::MemberAccessExpression::can_cast(p.kind()))
            {
                self.diagnostics.push(Diagnostic {
                    message: "'enum' can only appear in property access expression".to_owned(),
                    range: expr.syntax().text_range(),
                    ..Default::default()
                });
            }
            ExpressionKind::Symbol(id)
        })
    }

    fn this_expression(&self, _expr: &ThisExpression) -> ExpressionKind {
        ExpressionKind::Literal(self.execution_container().into())
    }

    fn root_access_expression(&mut self, expr: &RootAccessExpression) -> NullableExprKind {
        let (name_range, name) = get_name(expr)?;
        let offset = expr.syntax().text_range().end();

        self.members_of_table(
            self.root_table(),
            FindSymbol::BeforeIfInExecutionRange(offset, self.scope),
            ImportMembers::Root,
            false,
        )
        .into_iter()
        .find_map(|(member_name, id)| {
            if name == member_name {
                self.new_reference(name_range, id);
                Some(ExpressionKind::Symbol(id))
            } else {
                None
            }
        })
    }

    fn base_expression(&mut self, expr: &BaseExpression) -> ExpressionKind {
        match self.execution_container() {
            Container::Class(id) | Container::Instance(id) => match self.get(id).inherits {
                Inherits::Yes(inherits) => {
                    ExpressionKind::Literal(Type::Primitive(Primitive::Class(Some(inherits))))
                }
                Inherits::YesButUnknown => ExpressionKind::Literal(Type::ANY),
                Inherits::No => {
                    self.diagnostics.push(Diagnostic {
                        message: "Accessing 'base' in a class that doesn't have a superclass"
                            .to_owned(),
                        range: expr.syntax().text_range(),
                        severity: DiagnosticSeverity::Warning,
                    });
                    ExpressionKind::Literal(Type::NULL)
                }
            },
            _ => {
                self.diagnostics.push(Diagnostic {
                    message: "Accessing 'base' inside non-class execution scope".to_owned(),
                    range: expr.syntax().text_range(),
                    severity: DiagnosticSeverity::Warning,
                });
                ExpressionKind::Literal(Type::NULL)
            }
        }
    }

    fn member_access_expression(&mut self, expr: &MemberAccessExpression) -> NullableExprKind {
        let from = self.expr_to_type(&expr.object()?);
        let member_part = expr.member_part()?;
        let (name_range, name) = get_name(&member_part)?;

        let offset = expr.syntax().text_range().end();

        let result = self
            .members_of_type(
                from.clone(),
                FindSymbol::BeforeIfInExecutionRange(offset, self.scope),
                false,
            )
            .into_iter()
            .find_map(|(member_name, id)| {
                if name == member_name {
                    self.new_reference(name_range, id);
                    Some(ExpressionKind::Symbol(id))
                } else {
                    None
                }
            });

        if result.is_none() {
            self.no_member_error(&from, &name, expr.syntax().text_range());
        }
        result
    }

    fn element_access_expression(&mut self, expr: &ElementAccessExpression) -> NullableExprKind {
        let from = self.expr_to_type(&expr.object()?);
        let index = expr.index()?.expression()?;

        let expr_kind = self.collect_expr(&index)?;

        match self.expr_kind_to_type(Some(&expr_kind), expr.syntax().text_range().end()) {
            Type::Primitive(Primitive::String {
                literal: Some(id), ..
            }) => {
                let string = self.get(id);
                let text = string.text.clone();

                let name_range = matches!(expr_kind, ExpressionKind::Literal(_))
                    .then_some(string.unquoted_range);

                let offset = expr.syntax().text_range().end();

                let result = self
                    .members_of_type(
                        from.clone(),
                        FindSymbol::BeforeIfInExecutionRange(offset, self.scope),
                        false,
                    )
                    .into_iter()
                    .find_map(|(name, id)| {
                        if name == text {
                            if let Some(range) = name_range {
                                self.new_reference(range, id);
                            }
                            Some(ExpressionKind::Symbol(id))
                        } else {
                            None
                        }
                    });

                if result.is_none() {
                    self.no_member_error(&from, &text, index.syntax().text_range());
                }

                result
            }
            typ => {
                let index_flags = typ.type_flags();
                if index_flags.intersects(TypeFlags::STRING) {
                    return None;
                }

                match from.to_array() {
                    Ok(id) => {
                        if index_flags.intersects(TypeFlags::NUMBER) {
                            return Some(ExpressionKind::Literal(self.get(id).kind.clone()));
                        }

                        if index_flags.intersects(TypeFlags::ANY) {
                            return Some(ExpressionKind::Literal(self.get(id).kind.add_any()));
                        }
                    }
                    Err(ToPrimitiveError::NotSpecific) => {
                        if index_flags.intersects(TypeFlags::NUMBER_OR_ANY) {
                            return None;
                        }
                    }
                    Err(ToPrimitiveError::WrongTypeWithAny | ToPrimitiveError::WrongType) => {
                        if from.type_flags().intersects(TypeFlags::STRING) {
                            if index_flags.intersects(TypeFlags::NUMBER) {
                                return Some(ExpressionKind::Literal(Type::INTEGER));
                            }

                            if index_flags.intersects(TypeFlags::ANY) {
                                return Some(ExpressionKind::Literal(Type::INTEGER.add_any()));
                            }
                        } else if index_flags.intersects(TypeFlags::ANY) {
                            return None;
                        }
                    }
                }

                if !from.type_flags().intersects(TypeFlags::HAS_MEMBERS_OR_ANY) {
                    // All ANY indices are handled in the match statement above
                    self.diagnostics.push(Diagnostic {
                        message: format!(
                            "Trying to index into '{}' using '{}'",
                            self.type_to_str_generic(&from),
                            self.type_to_str_generic(&typ)
                        ),
                        range: index.syntax().text_range(),
                        severity: DiagnosticSeverity::Error,
                    });
                }

                None
            }
        }
    }

    fn special_context(&self, expr: &CallExpression) -> Option<Type> {
        match expr.callee()?.expression()? {
            Expr::MemberAccess(expr) => {
                let object = expr.object()?;
                let expr = self.expr_kind_at(object.syntax().text_range())?;
                Some(self.expr_kind_to_type(Some(expr), object.syntax().text_range().end()))
            }
            Expr::ElementAccess(expr) => {
                let object = expr.object()?;
                let expr = self.expr_kind_at(object.syntax().text_range())?;
                Some(self.expr_kind_to_type(Some(expr), object.syntax().text_range().end()))
            }
            Expr::RootAccess(_) => Some(Type::Primitive(Primitive::Table(Some(self.root_table())))),
            _ => None,
        }
    }

    fn call_expression(&mut self, expr: &CallExpression) -> NullableExprKind {
        let obj = self.expr_to_type_with_range(&expr.callee()?.expression()?);

        let arguments: Vec<_> = expr
            .arguments()
            .map(|arg| self.expr_to_type_with_range(&arg))
            .collect();

        let context = self
            .special_context(expr)
            .unwrap_or_else(|| self.execution_container().into());

        Some(ExpressionKind::Literal(
            self.callable(&context, &obj, &arguments)?,
        ))
    }

    fn clone_expression(&mut self, expr: &CloneExpression) -> NullableExprKind {
        let operand = expr.operand()?;
        let typ = self.expr_to_type(&operand);
        Some(ExpressionKind::Literal(typ))
    }

    fn extract_lhs_and_rhs(
        &mut self,
        expr: &BinaryExpression,
    ) -> (Option<TypeWithRange>, Option<TypeWithRange>) {
        let right = expr.rhs().map(|r| self.expr_to_type_with_range(&r));
        let left = expr.lhs().map(|l| self.expr_to_type_with_range(&l));
        (left, right)
    }

    #[allow(clippy::too_many_lines)]
    fn assignment_lhs(&mut self, expr: &Expr) -> Option<AssignmentLeftHandSide> {
        match expr {
            Expr::Name(expr) => {
                let name_token = expr.identifier()?;
                let expr_range = expr.syntax().text_range();
                let offset = expr_range.end();

                let filter = |(name, id): (Box<str>, SymbolId)| {
                    (name_token.text() == name.as_ref()).then_some(id)
                };

                let locals = || self.local_members(offset).into_iter().find_map(filter);
                let consts = || {
                    self.members_of_table(
                        self.const_table(),
                        FindSymbol::OnlyBefore(offset),
                        ImportMembers::Const,
                        false,
                    )
                    .into_iter()
                    .find_map(filter)
                };
                let members = || {
                    self.members_of_container(
                        self.execution_container(),
                        FindSymbol::BeforeIfInExecutionRange(offset, self.scope),
                        false,
                    )
                    .into_iter()
                    .find_map(filter)
                };
                let root = || {
                    self.members_of_table(
                        self.root_table(),
                        FindSymbol::BeforeIfInExecutionRange(offset, self.scope),
                        ImportMembers::Root,
                        false,
                    )
                    .into_iter()
                    .find_map(filter)
                };

                // Locals/consts sit outside any container, so they carry no `parent`
                // (that's what makes reassigning them at container precedence illegal -
                // see the "Cannot create a new slot..." diagnostic elsewhere).
                let found = locals()
                    .map(|id| (id, None))
                    .or_else(|| consts().map(|id| (id, None)))
                    .or_else(|| members().map(|id| (id, Some(self.execution_container().into()))))
                    .or_else(|| {
                        root().map(|id| {
                            (
                                id,
                                Some(Type::Primitive(Primitive::Table(Some(self.root_table())))),
                            )
                        })
                    });

                if let Some((symbol, parent)) = found {
                    self.range_to_expr
                        .insert(expr_range, ExpressionKind::Symbol(symbol));
                    return Some(AssignmentLeftHandSide::Exists {
                        parent,
                        symbol,
                        name_range: expr_range,
                        expr_range,
                    });
                }

                Some(AssignmentLeftHandSide::CanCreate {
                    parent: self.container.into(),
                    new_key: name_token.text().into(),
                    name_range: expr_range,
                    expr_range,
                })
            }
            Expr::MemberAccess(expr) => {
                let obj = self.expr_to_type(&expr.object()?);
                let member_part = expr.member_part()?;

                let (name_range, name) = get_name(&member_part)?;
                let expr_range = expr.syntax().text_range();
                let offset = expr_range.end();

                Some(
                    self.members_of_type(
                        obj.clone(),
                        FindSymbol::BeforeIfInExecutionRange(offset, self.scope),
                        false,
                    )
                    .into_iter()
                    .find_map(|(member_name, id)| (name == member_name).then_some(id))
                    .map_or_else(
                        || AssignmentLeftHandSide::CanCreate {
                            parent: obj.clone(),
                            new_key: name,
                            name_range,
                            expr_range,
                        },
                        |id| {
                            self.range_to_expr
                                .insert(expr_range, ExpressionKind::Symbol(id));
                            AssignmentLeftHandSide::Exists {
                                parent: Some(obj.clone()),
                                symbol: id,
                                name_range,
                                expr_range,
                            }
                        },
                    ),
                )
            }
            Expr::ElementAccess(expr) => {
                let obj = self.expr_to_type(&expr.object()?);
                let index = expr.index()?.expression()?;
                let expr_range = expr.syntax().text_range();
                let kind = self.collect_expr(&index);
                let Some(ExpressionKind::Literal(Type::Primitive(Primitive::String {
                    literal: Some(id),
                    ..
                }))) = kind
                else {
                    return Some(AssignmentLeftHandSide::NonStringName {
                        parent: obj,
                        name: TypeWithRange {
                            kind: self
                                .expr_kind_to_type(kind.as_ref(), expr.syntax().text_range().end()),
                            range: index.syntax().text_range(),
                        },
                        expr_range,
                    });
                };

                let string = self.get(id);
                let text = string.text.clone();
                let name_range = string.unquoted_range;
                let offset = expr_range.end();

                Some(
                    self.members_of_type(
                        obj.clone(),
                        FindSymbol::BeforeIfInExecutionRange(offset, self.scope),
                        false,
                    )
                    .into_iter()
                    .find_map(|(name, id)| (name == text).then_some(id))
                    .map_or_else(
                        || AssignmentLeftHandSide::CanCreate {
                            parent: obj.clone(),
                            new_key: text,
                            name_range,
                            expr_range,
                        },
                        |id| {
                            self.range_to_expr
                                .insert(expr_range, ExpressionKind::Symbol(id));
                            AssignmentLeftHandSide::Exists {
                                parent: Some(obj.clone()),
                                symbol: id,
                                name_range,
                                expr_range,
                            }
                        },
                    ),
                )
            }
            Expr::RootAccess(expr) => {
                let (name_range, name) = get_name(expr)?;
                let expr_range = expr.syntax().text_range();
                let offset = expr_range.end();

                let root = self.root_table();
                Some(
                    self.members_of_table(
                        root,
                        FindSymbol::BeforeIfInExecutionRange(offset, self.scope),
                        ImportMembers::Root,
                        false,
                    )
                    .into_iter()
                    .find_map(|(member_name, id)| (name == member_name).then_some(id))
                    .map_or_else(
                        || AssignmentLeftHandSide::CanCreate {
                            parent: Type::Primitive(Primitive::Table(Some(root))),
                            new_key: name,
                            name_range,
                            expr_range,
                        },
                        |id| {
                            self.range_to_expr
                                .insert(expr_range, ExpressionKind::Symbol(id));
                            AssignmentLeftHandSide::Exists {
                                parent: Some(Type::Primitive(Primitive::Table(Some(root)))),
                                symbol: id,
                                name_range,
                                expr_range,
                            }
                        },
                    ),
                )
            }
            _ => Some(AssignmentLeftHandSide::Invalid(self.collect_expr(expr))),
        }
    }

    fn binary_expression(&mut self, expr: &BinaryExpression) -> NullableExprKind {
        let (operator, _) = expr.operator()?;
        match operator {
            BinaryOperator::NewSlot => self.new_slot_operator(expr),
            BinaryOperator::Assign => self.assign_operator(expr),
            BinaryOperator::Comma => self.comma_operator(expr),
            BinaryOperator::In => Some(self.in_operator(expr)),
            BinaryOperator::InstanceOf => Some(self.instance_of_operator(expr)),
            BinaryOperator::Equals | BinaryOperator::NotEquals => {
                Some(self.equality_operator(expr))
            }
            BinaryOperator::Less
            | BinaryOperator::LessEqual
            | BinaryOperator::Greater
            | BinaryOperator::GreaterEqual
            | BinaryOperator::ThreeWay => {
                self.comparison_operator(expr);

                Some(ExpressionKind::Literal(
                    if operator == BinaryOperator::ThreeWay {
                        Type::INTEGER
                    } else {
                        Type::BOOL
                    },
                ))
            }
            BinaryOperator::BitwiseAnd
            | BinaryOperator::BitwiseOr
            | BinaryOperator::BitwiseXor
            | BinaryOperator::LeftShift
            | BinaryOperator::RightShift
            | BinaryOperator::UnsignedRightShift => {
                self.bitwise_operator(expr);

                Some(ExpressionKind::Literal(Type::INTEGER))
            }

            BinaryOperator::LogicalAnd | BinaryOperator::LogicalOr => {
                Some(self.logical_operator(expr))
            }

            BinaryOperator::Add
            | BinaryOperator::Subtract
            | BinaryOperator::Multiply
            | BinaryOperator::Divide
            | BinaryOperator::Modulo => self.arithmetic_operator(expr, operator),

            BinaryOperator::AddAssign
            | BinaryOperator::SubtractAssign
            | BinaryOperator::MultiplyAssign
            | BinaryOperator::DivideAssign
            | BinaryOperator::ModuloAssign => {
                let right = expr.rhs().map(|r| self.expr_to_type_with_range(&r));
                let left = expr.lhs().and_then(|l| self.assignment_lhs(&l));

                Some(ExpressionKind::Literal(self.arithmetic_assign_operator(
                    left,
                    right.unwrap_or_else(|| TypeWithRange {
                        kind: Type::default(),
                        range: expr.syntax().text_range(),
                    }),
                    operator,
                )?))
            }
        }
    }

    // Also used by class statement
    fn expr_new_symbol<T: HasDoc>(
        &mut self,
        expr: &T,
        name: Option<AssignmentLeftHandSide>,
        value: TypeWithRange,
        show_inlay_hint: bool,
        is_literal: bool,
    ) {
        match name {
            Some(AssignmentLeftHandSide::CanCreate {
                parent,
                name_range,
                new_key,
                expr_range,
            }) => {
                let (operand, arguments) =
                    to_operand_and_arguments(parent, expr_range, name_range, value.clone());

                let result = self.new_slot(&operand, &arguments);
                if matches!(result, NewSlotResult::NotAllowed) {
                    return;
                }

                let typ = value.kind.clone();
                let symbol = self.symbol_with_info(
                    expr,
                    SymbolKind::Property { show_inlay_hint },
                    new_key.clone(),
                    name_range,
                    SymbolFlags::default(),
                    typ.clone(),
                    Some((value, CheckTypeSource::Variable)),
                );

                self.range_to_expr
                    .insert(expr_range, ExpressionKind::Symbol(symbol));

                self.set_symbol(&typ, symbol);

                if let NewSlotResult::CanAdd(container) = result {
                    self.add_container_member(container, new_key, symbol);

                    if is_literal
                        && let Ok(id) = typ.to_function()
                        && let Some(function) = self.get_mut(id)
                    {
                        function.container = container;
                    }
                }
            }
            Some(AssignmentLeftHandSide::Exists {
                parent,
                symbol,
                name_range,
                expr_range,
            }) => {
                if let Some(parent) = parent {
                    // Problematic: when we have something like
                    // ::a <- 1
                    // a <- 1
                    // The `parent` for the second assignment becomes the root which means that the code
                    // below will add the symbol to the root table instead of adding it to the current
                    // `this`, we also can't just map the root to `this` since it doesn't consider
                    // ::a <- 1
                    // ::a <- 1
                    // Where both symbols should go to the root
                    // to solve this we check if name_range == range which distinguishes plain name
                    // expressions from other expressions
                    let parent = if name_range == expr_range {
                        self.execution_container().into()
                    } else {
                        parent
                    };

                    let (operand, arguments) =
                        to_operand_and_arguments(parent, expr_range, name_range, value.clone());

                    let result = self.new_slot(&operand, &arguments);
                    if matches!(result, NewSlotResult::NotAllowed) {
                        return;
                    }

                    let name = self.get(symbol).name.clone();
                    let typ = value.kind.clone();
                    let symbol = self.symbol_with_info(
                        expr,
                        SymbolKind::Property { show_inlay_hint },
                        name.clone(),
                        name_range,
                        SymbolFlags::default(),
                        typ.clone(),
                        Some((value, CheckTypeSource::Variable)),
                    );

                    self.range_to_expr
                        .insert(expr_range, ExpressionKind::Symbol(symbol));

                    self.set_symbol(&typ, symbol);

                    if let NewSlotResult::CanAdd(container) = result {
                        self.add_container_member(container, name, symbol);

                        if is_literal
                            && let Ok(id) = typ.to_function()
                            && let Some(function) = self.get_mut(id)
                        {
                            function.container = container;
                        }
                    }
                } else {
                    self.new_reference(name_range, symbol);
                    // Parent is only None for locals and consts
                    // ```
                    // local a = 2
                    // a <- 1
                    // ```
                    // is illegal
                    self.diagnostics.push(Diagnostic {
                        message: "Cannot create a new slot with the same name as a local or constant due to the resolution precedence. Prepend variable name with `this.` if you wish to do that".to_owned(),
                        range: name_range,
                        ..Default::default()
                    });
                }
            }
            Some(AssignmentLeftHandSide::NonStringName {
                parent,
                name,
                expr_range,
            }) => {
                let container = Container::try_from(&parent);
                let id = value.kind.to_function();

                let arguments = [name, value];
                let operand = TypeWithRange {
                    kind: parent,
                    range: expr_range,
                };
                self.new_slot(&operand, &arguments);

                if let Ok(container) = container
                    && let Ok(id) = id
                    && let Some(function) = self.get_mut(id)
                {
                    function.container = container;
                }
            }
            _ => {}
        }
    }

    fn new_slot_operator(&mut self, expr: &BinaryExpression) -> NullableExprKind {
        let right_kind = expr.rhs().and_then(|r| self.collect_expr(&r));
        let left = expr.lhs().and_then(|l| self.assignment_lhs(&l));

        let right = right_kind.as_ref().map_or_else(
            || TypeWithRange {
                kind: Type::default(),
                range: expr.syntax().text_range(),
            },
            |r| TypeWithRange {
                kind: self
                    .expr_kind_to_type(Some(r), expr.syntax().text_range().end())
                    .add_any(),
                range: expr
                    .rhs()
                    .expect(
                        "For right_kind to be Some, rhs has to exist in order to do collect_expr",
                    )
                    .syntax()
                    .text_range(),
            },
        );
        let is_literal = matches!(right_kind, Some(ExpressionKind::Literal(_)));
        self.expr_new_symbol(expr, left, right, true, is_literal);

        right_kind
    }

    fn assign_operator(&mut self, expr: &BinaryExpression) -> NullableExprKind {
        let right_kind = expr.rhs().and_then(|r| self.collect_expr(&r));
        let left = expr.lhs().and_then(|l| self.assignment_lhs(&l));

        let right = right_kind.as_ref().map_or_else(
            || TypeWithRange {
                kind: Type::default(),
                range: expr.syntax().text_range(),
            },
            |r| TypeWithRange {
                kind: self.expr_kind_to_type(Some(r), expr.syntax().text_range().end()),
                range: expr
                    .rhs()
                    .expect(
                        "For right_kind to be Some, rhs has to exist in order to do collect_expr",
                    )
                    .syntax()
                    .text_range(),
            },
        );

        // Binds right hand side function expression to the variable on the left
        // local a = {}
        // a.func <- function() {
        // ...
        // }
        if let Some(container) = lhs_container(left.as_ref())
            && matches!(right_kind, Some(ExpressionKind::Literal(_)))
            && let Ok(id) = right.kind.to_function()
            && let Some(function) = self.get_mut(id)
        {
            function.container = container;
        }

        match left {
            Some(AssignmentLeftHandSide::CanCreate {
                parent,
                expr_range,
                name_range,
                ..
            }) => {
                let (operand, arguments) =
                    to_operand_and_arguments(parent, expr_range, name_range, right);

                self.set(&operand, &arguments);
            }
            Some(AssignmentLeftHandSide::Exists {
                parent,
                symbol,
                expr_range,
                name_range,
            }) => {
                self.new_reference(name_range, symbol);
                if !self.get(symbol).is_modifiable() {
                    let name = &self.get(symbol).name;
                    self.diagnostics.push(Diagnostic {
                        message: format!("Symbol '{name}' is not modifiable"),
                        range: expr_range,
                        ..Default::default()
                    });
                    return right_kind;
                }

                if let Some(parent) = parent {
                    let (operand, arguments) =
                        to_operand_and_arguments(parent, expr_range, name_range, right.clone());
                    if self.set(&operand, &arguments).is_none() {
                        return right_kind;
                    }
                }

                if symbol.file() != self.file {
                    return right_kind;
                }

                let new = self.update_type(
                    &self.get(symbol).typ.clone(),
                    self.get(symbol).is_type_explicit,
                    right,
                    CheckTypeSource::Variable,
                );

                if let Some(symbol) = self.get_mut(symbol) {
                    symbol.typ = new.clone();
                }
                self.current_scope().flow_types.insert(symbol, new);
            }
            Some(AssignmentLeftHandSide::NonStringName {
                parent,
                name,
                expr_range,
            }) => {
                let arguments = [name, right];
                let operand = TypeWithRange {
                    kind: parent,
                    range: expr_range,
                };
                self.set(&operand, &arguments);
            }

            _ => {}
        }
        right_kind
    }

    fn comma_operator(&mut self, expr: &BinaryExpression) -> NullableExprKind {
        let (_left, right) = self.extract_lhs_and_rhs(expr);
        Some(ExpressionKind::Literal(right?.kind))
    }

    fn in_operator(&mut self, expr: &BinaryExpression) -> ExpressionKind {
        let (left, Some(right)) = self.extract_lhs_and_rhs(expr) else {
            return ExpressionKind::Literal(Type::BOOL);
        };

        let flags = right.kind.type_flags();

        if flags.intersects(TypeFlags::ARRAY_OR_STRING) {
            if let Some(with) = left
                && !with.kind.type_flags().intersects(TypeFlags::NUMBER_OR_ANY)
            {
                self.diagnostics.push(Diagnostic {
                    message: format!(
                        "Trying to index into '{}' using '{}' (only integers are applicable)",
                        self.type_to_str_generic(&right.kind),
                        self.type_to_str_generic(&with.kind)
                    ),
                    range: with.range,
                    severity: DiagnosticSeverity::Warning,
                });
            }
        } else if !flags.intersects(TypeFlags::HAS_MEMBERS_OR_ANY) {
            self.diagnostics.push(Diagnostic {
                message: format!(
                    "Indexing into '{}' will always return false",
                    self.type_to_str_generic(&right.kind)
                ),
                range: right.range,
                severity: DiagnosticSeverity::Warning,
            });
        }

        ExpressionKind::Literal(Type::BOOL)
    }

    fn instance_of_operator(&mut self, expr: &BinaryExpression) -> ExpressionKind {
        let (left, right) = self.extract_lhs_and_rhs(expr);
        if let Some(left) = left
            && !left
                .kind
                .type_flags()
                .intersects(TypeFlags::INSTANCE_OR_ANY)
        {
            self.diagnostics.push(Diagnostic {
                message: format!(
                    "Using '{}' as left-hand side of 'instanceof' operator (only 'instance' is applicable)",
                    self.type_to_str_generic(&left.kind)
                ),
                range: left.range,
                ..Default::default()
            });
        }

        if let Some(right) = right
            && !right.kind.type_flags().intersects(TypeFlags::CLASS_OR_ANY)
        {
            self.diagnostics.push(Diagnostic {
                message: format!(
                    "Using '{}' as right-hand side of 'instanceof' operator (only 'class' is applicable)",
                    self.type_to_str_generic(&right.kind)
                ),
                range: right.range,
                ..Default::default()
            });
        }

        ExpressionKind::Literal(Type::BOOL)
    }

    fn equality_operator(&mut self, expr: &BinaryExpression) -> ExpressionKind {
        let (_left_kind, _right_kind) = self.extract_lhs_and_rhs(expr);
        ExpressionKind::Literal(Type::BOOL)
    }

    fn is_comparable(&mut self, comparable: &TypeWithRange) -> bool {
        let flags = comparable.kind.type_flags();
        if flags.intersects(TypeFlags::CAN_COMPARE) {
            return true;
        }

        if !flags.intersects(TypeFlags::ANY) {
            self.diagnostics.push(Diagnostic {
                message: format!(
                    "'{}' does not support comparison",
                    self.type_to_str_generic(&comparable.kind),
                ),
                range: comparable.range,
                ..Default::default()
            });
        }

        false
    }

    fn comparison_operator(&mut self, expr: &BinaryExpression) {
        let (left, right) = match self.extract_lhs_and_rhs(expr) {
            (Some(left), Some(right)) => {
                let produce_right = self.is_comparable(&right);
                if !self.is_comparable(&left) {
                    return;
                }
                (left, if produce_right { Some(right) } else { None })
            }
            (None, Some(right)) => {
                self.is_comparable(&right);
                return;
            }
            (Some(left), None) => {
                if !self.is_comparable(&left) {
                    return;
                }
                (left, None)
            }
            (None, None) => return,
        };

        let left_flags = left.kind.type_flags();

        if left_flags.intersects(TypeFlags::TABLE_OR_INSTANCE) {
            let arguments = [right.clone().unwrap_or_else(|| TypeWithRange {
                kind: Type::default(),
                range: expr.syntax().text_range(),
            })];

            if let Some(ret) = self.call_metamethod(&left, "_cmp", &arguments, true, "comparison") {
                if ret.type_flags().intersects(TypeFlags::NUMBER) {
                    self.diagnostics.push(Diagnostic {
                        message: "'_cmp' must return an integer".to_owned(),
                        range: left.range,
                        ..Default::default()
                    });
                }
            } else {
                self.diagnostics.push(Diagnostic {
                    message: if left_flags.intersects(TypeFlags::TABLE) {
                        "Comparing table with no '_cmp' delegate metamethod defined. The result is undetermenistic".to_owned()
                    } else {
                        "Comparing instance with no '_cmp' class metamethod defined. The result is undetermenistic".to_owned()
                    },
                    range: left.range,
                    severity: DiagnosticSeverity::Warning,
                });
            }
        }

        let Some(right) = right else {
            return;
        };

        let right_flags = right.kind.type_flags();
        if left_flags.intersects(TypeFlags::NULL) || right_flags.intersects(TypeFlags::NULL) {
            return;
        }

        if left_flags.intersects(TypeFlags::NUMBER) || right_flags.intersects(TypeFlags::NUMBER) {
            return;
        }

        let intersect = left_flags.intersection(right_flags);
        if intersect.intersects(TypeFlags::CAN_COMPARE) {
            return;
        }

        self.diagnostics.push(Diagnostic {
            message: format!(
                "'{}' does not support comparison with '{}'",
                self.type_to_str_generic(&left.kind),
                self.type_to_str_generic(&right.kind)
            ),
            range: right.range,
            ..Default::default()
        });
    }

    fn has_bitwise_operations(&mut self, operand: &TypeWithRange) -> bool {
        let flags = operand.kind.type_flags();

        if flags.intersects(TypeFlags::INTEGER) {
            return true;
        }

        if !flags.intersects(TypeFlags::ANY) {
            self.diagnostics.push(Diagnostic {
                message: format!(
                    "'{}' does not support bitwise operations",
                    self.type_to_str_generic(&operand.kind),
                ),
                range: operand.range,
                ..Default::default()
            });
        }

        false
    }

    fn bitwise_operator(&mut self, expr: &BinaryExpression) {
        let (left, right) = self.extract_lhs_and_rhs(expr);
        if let Some(left) = left {
            self.has_bitwise_operations(&left);
        }

        if let Some(right) = right {
            self.has_bitwise_operations(&right);
        }
    }

    fn logical_operator(&mut self, expr: &BinaryExpression) -> ExpressionKind {
        let (left, right) = self.extract_lhs_and_rhs(expr);

        ExpressionKind::Literal(merge_types(
            &left.map_or(Type::ANY, |l| l.kind),
            &right.map_or(Type::ANY, |r| r.kind),
        ))
    }

    fn arithmetic_operator(
        &mut self,
        expr: &BinaryExpression,
        operator: BinaryOperator,
    ) -> NullableExprKind {
        let (left, right) = self.extract_lhs_and_rhs(expr);
        let result = self.arithmetic(
            &left?,
            &right.unwrap_or_else(|| TypeWithRange {
                kind: Type::default(),
                range: expr.syntax().text_range(),
            }),
            operator,
        )?;
        Some(ExpressionKind::Literal(result))
    }

    // This signature is so weird because it is also used by increment / decrement operators
    fn arithmetic_assign_operator(
        &mut self,
        left: Option<AssignmentLeftHandSide>,
        right: TypeWithRange,
        operator: BinaryOperator,
    ) -> Option<Type> {
        match left {
            Some(AssignmentLeftHandSide::CanCreate {
                parent,
                expr_range,
                name_range,
                ..
            }) => {
                let (operand, arguments) =
                    to_operand_and_arguments(parent, expr_range, name_range, right);
                self.set(&operand, &arguments);
                None
            }
            Some(AssignmentLeftHandSide::Exists {
                parent,
                symbol,
                expr_range,
                name_range,
            }) => {
                self.new_reference(name_range, symbol);
                let typ = self.arithmetic(
                    &TypeWithRange {
                        kind: self.get(symbol).typ.clone(),
                        range: name_range,
                    },
                    &right,
                    operator,
                )?;

                let type_with_range = TypeWithRange {
                    kind: typ.clone(),
                    range: expr_range,
                };

                if !self.get(symbol).is_modifiable() {
                    let name = &self.get(symbol).name;
                    self.diagnostics.push(Diagnostic {
                        message: format!("Symbol '{name}' is not modifiable"),
                        range: name_range,
                        ..Default::default()
                    });
                    return Some(typ);
                }

                if let Some(parent) = parent {
                    let (operand, arguments) = to_operand_and_arguments(
                        parent,
                        expr_range,
                        name_range,
                        type_with_range.clone(),
                    );
                    if self.set(&operand, &arguments).is_none() {
                        return Some(typ);
                    }
                }

                if symbol.file() != self.file {
                    return Some(typ);
                }

                let new = self.update_type(
                    &self.get(symbol).typ.clone(),
                    self.get(symbol).is_type_explicit,
                    type_with_range,
                    CheckTypeSource::Variable,
                );

                if let Some(symbol) = self.get_mut(symbol) {
                    symbol.typ = new.clone();
                }
                self.current_scope().flow_types.insert(symbol, new);
                Some(typ)
            }
            Some(AssignmentLeftHandSide::NonStringName {
                parent,
                name,
                expr_range,
            }) => {
                let flags = parent.type_flags();
                let name_flags = name.kind.type_flags();
                if !name_flags.intersects(TypeFlags::NUMBER)
                    || !flags.intersects(TypeFlags::ARRAY_OR_STRING)
                {
                    if !flags.intersects(TypeFlags::HAS_MEMBERS_OR_ANY)
                        && !name_flags.intersects(TypeFlags::ANY)
                    {
                        self.diagnostics.push(Diagnostic {
                            message: format!(
                                "Trying to index into '{}' using '{}'",
                                self.type_to_str_generic(&parent),
                                self.type_to_str_generic(&name.kind)
                            ),
                            range: expr_range,
                            severity: DiagnosticSeverity::Error,
                        });
                    }
                    return None;
                }

                let id = parent.to_array().ok()?;

                let operand = TypeWithRange {
                    kind: self.get(id).kind.clone(),
                    range: expr_range,
                };
                let typ = self.arithmetic(&operand, &right, operator)?;

                let type_with_range = TypeWithRange {
                    kind: typ.clone(),
                    range: expr_range,
                };

                let (operand, arguments) =
                    to_operand_and_arguments(parent, expr_range, name.range, type_with_range);
                self.set(&operand, &arguments);
                Some(typ)
            }

            _ => None,
        }
    }

    fn conditional_expression(&mut self, expr: &ConditionalExpression) -> ExpressionKind {
        if let Some(expr) = expr.condition() {
            self.collect_expr(&expr);
        }

        let then_type = expr
            .then_branch()
            .and_then(|b| b.expression())
            .map_or(Type::ANY, |expr| self.expr_to_type(&expr));

        let else_type = expr
            .else_branch()
            .and_then(|b| b.expression())
            .map_or(Type::ANY, |expr| self.expr_to_type(&expr));

        ExpressionKind::Literal(merge_types(&then_type, &else_type))
    }

    fn prefix_unary_expression(&mut self, expr: &PrefixUnaryExpression) -> NullableExprKind {
        let (operator, _) = expr.operator()?;
        match operator {
            PrefixUnaryOperator::Negation => self.negation_operator(expr),
            PrefixUnaryOperator::BitwiseNot => {
                self.bitwise_not_operator(expr);
                Some(ExpressionKind::Literal(Type::INTEGER))
            }
            PrefixUnaryOperator::LogicalNot => {
                self.logical_not_operator(expr);

                Some(ExpressionKind::Literal(Type::BOOL))
            }
        }
    }

    fn negation_operator(&mut self, expr: &PrefixUnaryExpression) -> NullableExprKind {
        let operand_expr = expr.operand()?;
        if let Expr::Literal(lit) = &operand_expr {
            let kind = self.literal_expression::<true>(lit)?;
            self.range_to_expr
                .insert(operand_expr.syntax().text_range(), kind.clone());
            return Some(kind);
        }

        let operand = self.expr_to_type_with_range(&operand_expr);

        Some(ExpressionKind::Literal(match &operand.kind {
            Type::Primitive(Primitive::Integer(Some(value))) => {
                Type::Primitive(Primitive::Integer(Some(-value)))
            }
            Type::Primitive(Primitive::Float(Some(value))) => {
                Type::Primitive(Primitive::Float(Some(-value)))
            }
            typ => {
                if typ.type_flags().intersects(TypeFlags::NUMBER) {
                    operand.kind
                } else {
                    self.call_metamethod(&operand, "_unm", &Vec::new(), true, "negation")?
                }
            }
        }))
    }

    fn bitwise_not_operator(&mut self, expr: &PrefixUnaryExpression) {
        let Some(operand) = expr.operand() else {
            return;
        };
        let operand = self.expr_to_type_with_range(&operand);
        self.has_bitwise_operations(&operand);
    }

    fn logical_not_operator(&mut self, expr: &PrefixUnaryExpression) {
        let Some(operand) = expr.operand() else {
            return;
        };
        self.collect_expr(&operand);
    }

    fn prefix_update_expression(&mut self, expr: &PrefixUpdateExpression) -> NullableExprKind {
        let (operator, _) = expr.operator()?;
        match operator {
            PrefixUpdateOperator::Increment => self.prefix_increment_operator(expr),
            PrefixUpdateOperator::Decrement => self.prefix_decrement_operator(expr),
        }
    }

    fn prefix_increment_operator(&mut self, expr: &PrefixUpdateExpression) -> NullableExprKind {
        let operand = self.assignment_lhs(&expr.operand()?);
        Some(ExpressionKind::Literal(self.arithmetic_assign_operator(
            operand,
            TypeWithRange {
                kind: Type::Primitive(Primitive::Integer(Some(1))),
                range: expr.syntax().text_range(),
            },
            BinaryOperator::AddAssign,
        )?))
    }

    fn prefix_decrement_operator(&mut self, expr: &PrefixUpdateExpression) -> NullableExprKind {
        let operand = self.assignment_lhs(&expr.operand()?);

        Some(ExpressionKind::Literal(self.arithmetic_assign_operator(
            operand,
            TypeWithRange {
                kind: Type::Primitive(Primitive::Integer(Some(1))),
                range: expr.syntax().text_range(),
            },
            BinaryOperator::SubtractAssign,
        )?))
    }

    fn postfix_update_expression(&mut self, expr: &PostfixUpdateExpression) -> NullableExprKind {
        let (operator, _) = expr.operator()?;
        match operator {
            PostfixUpdateOperator::Increment => self.postfix_increment_operator(expr),
            PostfixUpdateOperator::Decrement => self.postfix_decrement_operator(expr),
        }
    }

    fn postfix_increment_operator(&mut self, expr: &PostfixUpdateExpression) -> NullableExprKind {
        let operand = self.assignment_lhs(&expr.operand()?);
        let kind = operand.as_ref().and_then(NullableExprKind::from);
        self.arithmetic_assign_operator(
            operand,
            TypeWithRange {
                kind: Type::Primitive(Primitive::Integer(Some(1))),
                range: expr.syntax().text_range(),
            },
            BinaryOperator::AddAssign,
        );
        kind
    }

    fn postfix_decrement_operator(&mut self, expr: &PostfixUpdateExpression) -> NullableExprKind {
        let operand = self.assignment_lhs(&expr.operand()?);
        let kind = operand.as_ref().and_then(NullableExprKind::from);
        self.arithmetic_assign_operator(
            operand,
            TypeWithRange {
                kind: Type::Primitive(Primitive::Integer(Some(1))),
                range: expr.syntax().text_range(),
            },
            BinaryOperator::SubtractAssign,
        );
        kind
    }

    fn delete_expression(&mut self, expr: &DeleteExpression) -> NullableExprKind {
        let operand = self.assignment_lhs(&expr.operand()?);
        let kind = operand.as_ref().and_then(NullableExprKind::from);
        match operand {
            Some(AssignmentLeftHandSide::CanCreate {
                parent,
                expr_range,
                name_range,
                ..
            }) => {
                let delete_operand = TypeWithRange {
                    kind: parent,
                    range: expr_range,
                };
                let index = TypeWithRange {
                    kind: Type::STRING,
                    range: name_range,
                };
                self.delete(&delete_operand, &index);

                kind
            }
            Some(AssignmentLeftHandSide::NonStringName {
                parent,
                expr_range,
                name: key,
                ..
            }) => {
                let delete_operand = TypeWithRange {
                    kind: parent,
                    range: expr_range,
                };
                self.delete(&delete_operand, &key);

                kind
            }
            Some(AssignmentLeftHandSide::Exists {
                parent,
                symbol,
                expr_range,
                name_range,
            }) => {
                self.new_reference(name_range, symbol);
                if let Some(parent) = parent {
                    let delete_operand = TypeWithRange {
                        kind: parent,
                        range: expr_range,
                    };
                    let index = TypeWithRange {
                        kind: Type::STRING,
                        range: name_range,
                    };
                    self.delete(&delete_operand, &index);

                    return Some(ExpressionKind::Literal(self.get(symbol).typ.clone()));
                }
                // ```
                // local a = 2
                // delete a
                // ```
                // is illegal
                self.diagnostics.push(Diagnostic {
                    message: "Cannot delete a variable with the same name as a local or constant due to the resolution precedence. Prepend variable name with `this.` if you wish to do that".to_owned(),
                    range: name_range,
                    ..Default::default()
                });

                Some(ExpressionKind::Literal(self.get(symbol).typ.clone()))
            }
            _ => None,
        }
    }

    fn type_of_expression(&mut self, expr: &TypeOfExpression) -> ExpressionKind {
        let Some(operand) = expr.operand().map(|o| self.expr_to_type_with_range(&o)) else {
            return ExpressionKind::Literal(Type::STRING);
        };

        ExpressionKind::Literal(
            self.call_metamethod(&operand, "_typeof", &Vec::new(), false, "'typeof' operator")
                .unwrap_or(Type::STRING),
        )
    }

    fn resume_expression(&mut self, expr: &ResumeExpression) -> NullableExprKind {
        let typ = self.expr_to_type(&expr.operand()?);
        match typ.to_generator() {
            Ok(id) => Some(ExpressionKind::Literal(match &self.get(id).yields {
                TypeState::Absent => Type::ANY,
                TypeState::Explicit(typ) | TypeState::NotExplicit(typ) => {
                    typ.this_to_concrete(&Type::ANY)
                }
            })),
            Err(ToPrimitiveError::WrongType) => {
                self.diagnostics.push(Diagnostic {
                    message: "Only generators can be resumed".to_owned(),
                    range: expr.syntax().text_range(),
                    ..Default::default()
                });
                None
            }
            Err(ToPrimitiveError::WrongTypeWithAny | ToPrimitiveError::NotSpecific) => None,
        }
    }

    fn raw_call_expression(&mut self, expr: &RawCallExpression) -> NullableExprKind {
        let mut arguments: Vec<_> = expr
            .arguments()
            .map(|arg| self.expr_to_type_with_range(&arg))
            .collect();

        if arguments.len() < 2 {
            self.diagnostics.push(Diagnostic {
                message: "'rawcall' requires at least 2 parameters: function to call and context"
                    .to_owned(),
                range: expr.syntax().text_range(),
                ..Default::default()
            });
            return None;
        }

        let function = arguments.remove(0);
        let context = arguments.remove(0);

        Some(ExpressionKind::Literal(self.callable(
            &context.kind,
            &function,
            &arguments,
        )?))
    }

    fn parenthesised_expression(&mut self, expr: &ParenthesisedExpression) -> NullableExprKind {
        let expr = expr.inner()?;
        self.collect_expr(&expr)
    }

    fn function_expression(&mut self, expr: &FunctionExpression) -> ExpressionKind {
        let id = self.collect_function(expr);
        ExpressionKind::Literal(Type::Primitive(Primitive::Function(Some(id))))
    }

    fn lambda_expression(&mut self, expr: &LambdaExpression) -> ExpressionKind {
        let id = self.collect_function(expr);
        ExpressionKind::Literal(Type::Primitive(Primitive::Function(Some(id))))
    }

    fn set_delegate(&mut self, context: &Type, arguments: &[TypeWithRange]) {
        let Some(first) = arguments.first() else {
            return;
        };

        let Ok(for_table) = context.to_table() else {
            return;
        };
        let delegate = first.kind.to_table().ok();

        if let Some(table) = self.get_mut(for_table) {
            table.delegate = delegate;
        }
    }

    fn bindenv(&mut self, context: &Type, arguments: &[TypeWithRange]) -> Type {
        let Some(first) = arguments.first() else {
            return context.clone();
        };

        let Ok(container) = Container::try_from(&first.kind) else {
            return context.clone();
        };

        let Ok(id) = context.to_function() else {
            return context.clone();
        };

        let old = self.get(id);
        let new = FunctionId::new(
            self.file,
            self.arena.alloc(FunctionData {
                container,
                ..old.clone()
            }),
        );

        Type::Primitive(Primitive::Function(Some(new)))
    }

    fn get_script_from_arguments(&mut self, arguments: &[TypeWithRange]) -> Option<File> {
        let path_string = arguments.first()?;

        let Ok((_, str)) = path_string.kind.to_string() else {
            return None;
        };

        let Some(id) = str else {
            self.diagnostics.push(Diagnostic {
                message: "Could not resolve the path statically, symbols will not be included"
                    .to_owned(),
                range: path_string.range,
                severity: DiagnosticSeverity::Information,
            });
            return None;
        };

        self.db.get_script(&self.get(id).text).ok()
    }

    fn include_script(&mut self, arguments: &[TypeWithRange]) {
        let Some(script) = self.get_script_from_arguments(arguments) else {
            return;
        };

        let target = match arguments.get(1) {
            Some(expr) => {
                let Ok(target) = ImportTarget::try_from(&expr.kind).or_else(|_| {
                    if expr.kind.type_flags().intersects(TypeFlags::NULL) {
                        ImportTarget::try_from(self.execution_container())
                    } else {
                        Err(())
                    }
                }) else {
                    self.diagnostics.push(Diagnostic {
                        message: format!(
                            "Type '{}' cannot receive new members",
                            self.type_to_str_generic(&expr.kind)
                        ),
                        range: expr.range,
                        severity: DiagnosticSeverity::Warning,
                    });
                    return;
                };
                target
            }

            None => match ImportTarget::try_from(self.execution_container()) {
                Ok(i) => i,
                Err(()) => return,
            },
        };

        self.imports
            .entry(target)
            .and_modify(|e| e.push(script))
            .or_insert_with(|| vec![script]);
    }

    fn do_include_script(&mut self, arguments: &[TypeWithRange]) {
        let Some(script) = self.get_script_from_arguments(arguments) else {
            return;
        };

        let Some(expr) = arguments.get(1) else {
            return;
        };

        let Ok(target) = ImportTarget::try_from(&expr.kind) else {
            self.diagnostics.push(Diagnostic {
                message: format!(
                    "Type '{}' cannot receive new members",
                    self.type_to_str_generic(&expr.kind)
                ),
                range: expr.range,
                severity: DiagnosticSeverity::Warning,
            });
            return;
        };

        self.imports
            .entry(target)
            .and_modify(|e| e.push(script))
            .or_insert_with(|| vec![script]);
    }

    fn create_entity(&self, arguments: &[TypeWithRange]) -> Option<Type> {
        let classname = arguments.first()?;

        let Ok((_, Some(literal))) = classname.kind.to_string() else {
            return None;
        };

        let text = self.get(literal).text.to_lowercase();
        let class = CLASSNAMES_TO_CLASSES.get(&text)?;

        self.db.instance_from_vscript_lib(class)
    }

    fn find_entity(&self, arguments: &[TypeWithRange]) -> Option<Type> {
        let classname = arguments.get(1)?;

        let Ok((_, Some(literal))) = classname.kind.to_string() else {
            return None;
        };

        let text = self.get(literal).text.to_lowercase();
        if let Some(class) = CLASSNAMES_TO_CLASSES.get(&text) {
            return self
                .db
                .instance_from_vscript_lib(class)
                .map(|t| t.add_null());
        }

        if !text.ends_with('*') {
            return None;
        }

        // All of this is prone to false positives since somebody can write "tf_weardjasgkdqwetqwewuqeq*"
        // and it would propely pass the tf_wearable condition, however it's probably not worth solving
        // this problem

        // tf_projectile_* | prop_* | item_*
        if text.starts_with("tf_pr") || text.starts_with("pr") || text.starts_with("it") {
            return self
                .db
                .instance_from_vscript_lib("CBaseAnimating")
                .map(|t| t.add_null());
        }

        // tf_weapon_* as CTFWeaponBase or tf_weaponbase_* as CBaseAnimating
        if text.starts_with("tf_weap") {
            return self
                .db
                .instance_from_vscript_lib(if text.starts_with("tf_weaponb") {
                    "CBaseAnimating"
                } else {
                    "CTFWeaponBase"
                })
                .map(|t| t.add_null());
        }

        // tf_wearable* | tf_weapon_*
        if text.starts_with("tf_w") {
            return self
                .db
                .instance_from_vscript_lib("CEconEntity")
                .map(|t| t.add_null());
        }

        // obj_*
        if text.starts_with('o') {
            return self
                .db
                .instance_from_vscript_lib("CBaseCombatCharacter")
                .map(|t| t.add_null());
        }

        // There are other patterns like logic_* or trigger_* ,but since they have
        // CBaseEntity class there's no reason to search for it, since it will
        // default to CBaseEntity|null either way

        None
    }

    fn unused_variables_diagnostics(&mut self) {
        for (id, references) in &self.symbol_to_ranges {
            if references.len() > 1 {
                continue;
            }

            let symbol = self.get(*id);
            if symbol.name.starts_with('_') {
                continue;
            }

            self.diagnostics.push(Diagnostic {
                message: match symbol.kind {
                    SymbolKind::Local(LocalKind::Function | LocalKind::Variable) => {
                        format!("Unused local variable '{}'. Prepend the name with '_' if it cannot be removed", symbol.name)
                    }
                    SymbolKind::Local(LocalKind::Parameter) => {
                        format!(
                            "Unused parameter '{}'. Prepend the name with '_' if it cannot be removed",
                            symbol.name
                        )
                    }
                    // SymbolKind::Local(LocalKind::VariedArgs) => {
                    //     "Unused variable arguments".to_owned()
                    // }
                    _ => continue
                },
                range: symbol.name_range,
                severity: if self.db.config().unused_variables == UnusedVariables::Hint {
                    DiagnosticSeverity::UnnecessaryHint
                } else {
                    DiagnosticSeverity::UnnecessaryWarn
                },
            });
        }
    }

    fn deprecated_diagnostics(&mut self) {
        for (id, references) in &self.symbol_to_ranges {
            let symbol = self.get(*id);
            if !symbol.flags.intersects(SymbolFlags::DEPRECATED) {
                continue;
            }

            let message = format!("'{}' is deprecated", symbol.name);

            let mut references = references.iter().copied();
            // Skip the definition
            if id.file() == self.file() {
                references.next();
            }

            for reference in references {
                self.diagnostics.push(Diagnostic {
                    message: message.clone(),
                    range: reference,
                    severity: DiagnosticSeverity::Deprecated,
                });
            }
        }
    }
}

fn parent_doc(node: &SyntaxNode) -> Option<DocComment> {
    let parent = node.parent()?;
    // /** ... */
    // new <- function() {}
    if let Some(bin) = BinaryExpression::cast(parent.clone()) {
        return bin.doc();
    }

    // class a = {
    //    /** ... */
    //    prop = function() {}
    // }
    if let Some(prop) = Property::cast(parent.clone()) {
        return prop.doc();
    }

    // Initially wrapped in 'Initialiser' node
    let parent = parent.parent()?;
    let init = VariableDeclaration::cast(parent.clone())?;

    // local
    // /** ... */
    // a = function() {}
    init.doc().or_else(||
                    // /** ... */
                    // local a = function() {}
                    LocalVariableDeclaration::cast(parent.parent()?)?.doc())
}

fn is_null_literal(expr: &Expr) -> bool {
    match expr {
        Expr::Literal(expr) => expr
            .token()
            .and_then(|(kind, _)| match kind {
                LiteralExpressionKind::Null => Some(()),
                _ => None,
            })
            .is_some(),
        _ => false,
    }
}

fn remove_null_from_type(typ: &Type) -> Type {
    match typ {
        Type::Primitive(Primitive::Null | Primitive::Any) => Type::ANY,
        Type::Union(union) => {
            let mut primitives = Vec::with_capacity(union.primitives.len());
            for primitive in union.primitives.iter() {
                if !matches!(primitive, Primitive::Null) {
                    primitives.push(*primitive);
                }
            }

            match primitives.as_slice() {
                [] => Type::ANY,
                [primitive] => Type::Primitive(*primitive),
                _ => Type::Union(Union {
                    flags: union.flags & !TypeFlags::NULL,
                    primitives: primitives.into(),
                }),
            }
        }
        _ => typ.clone(),
    }
}

fn unwrap_parens(mut expr: Expr) -> Expr {
    while let Expr::Parenthesised(paren) = &expr {
        let Some(inner) = paren.inner() else { break };
        expr = inner;
    }
    expr
}

/// If either side of an equality is `typeof <operand>`, returns `(operand, other_side)`.
fn typeof_pair(lhs: Expr, rhs: Expr) -> Option<(Expr, Expr)> {
    if let Expr::TypeOf(t) = unwrap_parens(lhs.clone()) {
        return Some((t.operand()?, rhs));
    }
    if let Expr::TypeOf(t) = unwrap_parens(rhs) {
        return Some((t.operand()?, lhs));
    }
    None
}

fn typeof_name_to_type(text: &str) -> Option<Type> {
    Some(match text {
        "null" => Type::NULL,
        "integer" => Type::INTEGER,
        "float" => Type::FLOAT,
        "string" => Type::STRING,
        "bool" => Type::BOOL,
        "table" => Type::TABLE,
        "array" => Type::ARRAY,
        "class" => Type::CLASS,
        "instance" => Type::INSTANCE,
        "generator" => Type::GENERATOR,
        "thread" => Type::THREAD,
        "weakref" => Type::WEAKREF,
        "native function" | "function" => Type::FUNCTION,
        _ => return None,
    })
}

fn primitive_matches_typeof(prim: &Primitive, text: &str) -> bool {
    matches!(
        (prim, text),
        (Primitive::Null, "null")
            | (Primitive::Integer(_), "integer")
            | (Primitive::Float(_), "float")
            | (Primitive::String { .. }, "string")
            | (Primitive::Bool(_), "bool")
            | (Primitive::Table(_), "table")
            | (Primitive::Array(_), "array")
            | (Primitive::Class(_), "class")
            | (Primitive::Instance(_), "instance")
            | (Primitive::Generator(_), "generator")
            | (Primitive::Thread(_), "thread")
            | (Primitive::Weakref, "weakref")
            | (Primitive::Function(_), "nativefunction" | "function")
    )
}

fn remove_typeof_from_type(typ: &Type, text: &str) -> Type {
    match typ {
        Type::Primitive(prim) if primitive_matches_typeof(prim, text) => Type::ANY,
        Type::Union(union) => {
            let primitives: Vec<_> = union
                .primitives
                .iter()
                .copied()
                .filter(|p| !primitive_matches_typeof(p, text))
                .collect();
            rebuild_union(primitives)
        }
        _ => typ.clone(),
    }
}

fn is_falsy_primitive(prim: &Primitive) -> bool {
    matches!(
        prim,
        Primitive::Null | Primitive::Bool(Some(false)) | Primitive::Integer(Some(0))
    ) || matches!(prim, Primitive::Float(Some(f)) if *f == 0.0) // covers -0.0 too
}

fn remove_falsy_from_type(typ: &Type) -> Type {
    match typ {
        Type::Primitive(prim) if is_falsy_primitive(prim) => Type::ANY,
        Type::Union(union) => {
            let primitives = union
                .primitives
                .iter()
                .filter_map(|p| match p {
                    _ if is_falsy_primitive(p) => None,
                    // known-falsy-or-not scalars collapse to their nonzero/true state
                    Primitive::Bool(None) => Some(Primitive::Bool(Some(true))),
                    Primitive::Integer(None) => Some(Primitive::Integer(None)), // can't pin to nonzero
                    Primitive::Float(None) => Some(Primitive::Float(None)),
                    other => Some(*other),
                })
                .collect();
            rebuild_union(primitives)
        }
        _ => typ.clone(),
    }
}

fn remove_truthy_from_type(typ: &Type) -> Type {
    match typ {
        Type::Primitive(prim) if is_falsy_primitive(prim) => Type::ANY,
        Type::Union(union) => {
            let primitives = union
                .primitives
                .iter()
                .filter_map(|p| match p {
                    _ if !is_falsy_primitive(p) => None,
                    // known-falsy-or-not scalars collapse to their nonzero/true state
                    Primitive::Bool(None) => Some(Primitive::Bool(Some(false))),
                    Primitive::Integer(None) => Some(Primitive::Integer(Some(0))),
                    Primitive::Float(None) => Some(Primitive::Float(Some(0.0))),
                    other => Some(*other),
                })
                .collect();
            rebuild_union(primitives)
        }
        _ => typ.clone(),
    }
}

fn rebuild_union(primitives: Vec<Primitive>) -> Type {
    match primitives.as_slice() {
        [] => Type::ANY,
        [p] => Type::Primitive(*p),
        _ => Type::Union(Union {
            flags: primitives
                .iter()
                .fold(TypeFlags::empty(), |f, p| f | p.type_flags()),
            primitives: primitives.into(),
        }),
    }
}
