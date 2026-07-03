mod arena;
mod db;
mod resolver;
mod symbol;

use std::{collections::hash_map::Entry, fmt::Write as _};

use ::db::File;
use la_arena::Idx;
use rustc_hash::{FxHashMap, FxHashSet};
use sq_3_parser::{SyntaxKind, SyntaxToken, TextRange, TextSize};

use crate::{
    arena::{ClassId, Container, EnumId, ImportTarget, SourceArena, TableData, TableId},
    db::{
        top_const_members, top_root_members, top_source_and_const_members,
        top_source_and_root_members, top_source_members,
    },
    symbol::{FlatSymbolTable, to_flat_symbol_table},
};

pub use arena::{ArenaId, FunctionData, FunctionId, ParamsState, ScopeId, SymbolId, TypeState};
pub use db::{
    Database, UnreachableCode, UnusedVariables, VScriptDatabase, VScriptDbConfig,
    VScriptDbInitConfig, parse, source_symbol,
};
pub use symbol::{
    DisplayType, LocalKind, Primitive, StringKind, Symbol, SymbolFlags, SymbolKind, SymbolTable,
    ToPrimitiveError, Type, TypeFlags,
};

const MARKDOWN_MEMBER_LIMIT: usize = 5;

#[derive(Debug, Default, PartialEq, Eq)]
pub struct Diagnostic {
    pub message: String,
    pub range: TextRange,
    pub severity: DiagnosticSeverity,
}

#[derive(Default, Debug, Clone, Copy, PartialEq, Eq)]
pub enum DiagnosticSeverity {
    #[default]
    Error,
    Warning,
    Information,
    UnnecessaryWarn,
    UnnecessaryHint,
    Deprecated,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ExpressionKind {
    // L value
    Literal(Type),
    // R value
    Symbol(SymbolId),
}

pub type NullableExprKind = Option<ExpressionKind>;

#[derive(Debug, Default, Clone, PartialEq)]
pub struct TypeWithRange {
    kind: Type,
    range: TextRange,
}

macro_rules! builtin {
    ($members:ident, $symbol:ident => $ty:ident) => {
        fn $members(db: &dyn VScriptDatabase) -> FlatSymbolTable {
            if let Some(builtins) = db.builtins().map(|b| &b.$ty.members) {
                builtins.clone()
            } else {
                FlatSymbolTable::default()
            }
        }

        fn $symbol(db: &dyn VScriptDatabase) -> Option<SymbolId> {
            db.builtins().map(|b| &b.$ty.symbol).cloned()
        }
    };
}

builtin!(integer_members, integer_symbol => integer);
builtin!(float_members, float_symbol => float);
builtin!(boolean_members, boolean_symbol => boolean);
builtin!(string_members, string_symbol => string);
builtin!(array_members, array_symbol => array);
builtin!(function_members, function_symbol => function);
builtin!(generator_members, generator_symbol => generator);
builtin!(thread_members, thread_symbol => thread);
builtin!(weakref_members, weakref_symbol => weakref);
builtin!(instance_members, instance_symbol => instance);
builtin!(builtin_table_members, table_symbol => table);
builtin!(builtin_class_members, class_symbol => class);
builtin!(null_members, null_symbol => null);

#[derive(Debug, Clone, Copy)]
pub enum ImportMembers {
    Target(ImportTarget),
    Const,
    Root,
}

#[derive(Debug, Clone, Copy)]
pub enum FindSymbol {
    OnlyBefore(TextSize),
    BeforeIfInExecutionRange(TextSize, ScopeId),
}

#[derive(Debug)]
pub enum FunctionIdResolution {
    Function(FunctionId),
    DefaultConstructor,
}

#[derive(Debug, Clone, Copy)]
enum GetMembersInner {
    Target(ImportTarget),
    RootAsSource,
    Root,
    ConstAsSource,
    Const,
}

pub enum FunctionMarkdown<'a> {
    Full(&'a str),
    Anonymous,
}

#[must_use]
pub fn can_use_identifier(name: &str) -> bool {
    static HARD_KEYWORDS: phf::Set<&'static str> = phf::phf_set! {
        "base", "break", "case" , "catch", "class", "clone", "const",
        "continue", "default", "delete", "do", "else", "enum",
        "extends", "false", "foreach", "for", "function", "if", "in",
        "instanceof", "local", "null", "rawcall", "resume", "return",
        "static", "switch", "this", "throw", "true", "try", "typeof",
        "while", "yield", "__FILE__", "__LINE__",
    };

    let mut chars = name.chars();
    let Some(first) = chars.next() else {
        return false;
    };

    if HARD_KEYWORDS.contains(name) {
        return false;
    }

    if !first.is_ascii_alphabetic() && first != '_' {
        return false;
    }

    for char in chars {
        if !char.is_alphanumeric() && char != '_' {
            return false;
        }
    }

    true
}

#[must_use]
fn quote_if_cant_use_identifier(old: &str) -> String {
    if can_use_identifier(old) {
        old.to_owned()
    } else {
        format!("\"{old}\"")
    }
}

fn import_members_inner(
    db: &dyn VScriptDatabase,
    import: File,
    already_included: &mut FxHashSet<File>,
    settings: GetMembersInner,
) -> FlatSymbolTable {
    let mut result = match settings {
        GetMembersInner::Target(_) => top_source_members(db, import),
        GetMembersInner::ConstAsSource => top_source_and_const_members(db, import),
        GetMembersInner::Const => top_const_members(db, import),
        GetMembersInner::RootAsSource => top_source_and_root_members(db, import),
        GetMembersInner::Root => top_root_members(db, import),
    };

    let imports = &source_symbol(db, import).imports;

    if let GetMembersInner::Target(target) = settings {
        let Some(imports) = imports.get(&target) else {
            return result;
        };

        for import in imports {
            if already_included.contains(import) {
                continue;
            }

            already_included.insert(*import);
            result.extend(import_members_inner(
                db,
                *import,
                already_included,
                settings,
            ));
        }
        return result;
    }

    for imports in imports.values() {
        for import in imports {
            if !already_included.insert(*import) {
                continue;
            }

            result.extend(import_members_inner(
                db,
                *import,
                already_included,
                settings,
            ));
        }
    }

    result
}

/// Shared `Collector` and `SourceFile` behaviour
///
/// Which might (or might not) use the same functions. Note that
/// `SourceSymbol` is immutable once constructed so there's no mutable methods
pub trait Source {
    fn file(&self) -> File;
    fn db(&self) -> &dyn VScriptDatabase;
    fn arena(&self) -> &SourceArena;
    fn imports(&self) -> &FxHashMap<ImportTarget, Vec<File>>;
    fn scope(&self, offset: TextSize) -> ScopeId;
    fn source_table(&self) -> TableId;
    fn root_table(&self) -> TableId;
    fn const_table(&self) -> TableId;
    fn range_to_expr(&self) -> &FxHashMap<TextRange, ExpressionKind>;
    fn range_to_symbol(&self) -> &FxHashMap<TextRange, SymbolId>;
    fn doc_to_symbol(&self) -> &FxHashMap<TextRange, SymbolId>;
    fn symbol_to_ranges(&self) -> &FxHashMap<SymbolId, Vec<TextRange>>;
    fn diagnostics(&self) -> &[Diagnostic];

    fn get<T>(&self, id: T) -> &T::Data
    where
        T: ArenaId,
        SourceArena: std::ops::Index<Idx<T::Data>, Output = T::Data>;

    fn all_symbols(&self) -> impl Iterator<Item = (Idx<Symbol>, &Symbol)> {
        self.arena().all_symbols()
    }

    fn all_functions(&self) -> impl Iterator<Item = (Idx<FunctionData>, &FunctionData)> {
        self.arena().all_functions()
    }

    fn to_function_id(&self, typ: &Type, offset: TextSize) -> Option<FunctionIdResolution> {
        typ.find(|p| match p {
            Primitive::Class(id) => {
                let Some(member) = self.find_member(Container::Class(id?), "constructor", offset)
                else {
                    return Some(FunctionIdResolution::DefaultConstructor);
                };

                self.to_function_id(&member.typ, offset)
            }
            Primitive::Function(id) => Some(FunctionIdResolution::Function(id?)),
            Primitive::Table(id) => {
                let table = self.get(id?);
                let delegate_idx = table.delegate?;

                let member = self.find_member(Container::Table(delegate_idx), "_call", offset)?;

                self.to_function_id(&member.typ, offset)
            }
            Primitive::Instance(id) => {
                let member = self.find_member(Container::Instance(id?), "_call", offset)?;

                self.to_function_id(&member.typ, offset)
            }
            _ => None,
        })
    }

    fn local_members(&self, offset: TextSize) -> FlatSymbolTable {
        let mut scope = Some(self.scope(offset));
        let mut result = FlatSymbolTable::default();

        while let Some(current_scope) = scope {
            let new = self.arena()[current_scope].locals.clone();
            for (name, ids) in new {
                let entry = result.entry(name.clone());
                let Entry::Vacant(entry) = entry else {
                    continue;
                };

                let mut last = None;
                for id in ids {
                    let symbol = self.get(id);
                    if symbol.node.text_range().end() >= offset {
                        break;
                    }

                    last = Some(id);
                }

                if let Some(value) = last {
                    entry.insert(value);
                }
            }
            scope = self.arena()[current_scope].parent;
        }

        result
    }

    fn enum_members(&self, enum_: EnumId) -> FlatSymbolTable {
        let enum_ = self.get(enum_);
        // Enum does not support adding new slots nor defining methods, so there can
        // be only 1 symbol under a certain name for the duration of the whole program
        to_flat_symbol_table(enum_.members.clone())
    }

    fn additional_table_members(&self, table: TableId) -> SymbolTable {
        let table = self.get(table);
        let mut result = table.members.clone();

        if let Some(delegate) = table.delegate {
            let delegate_members = self.additional_table_members(delegate);
            for (k, v) in delegate_members {
                result.entry(k).or_insert(v);
            }
        }

        result
    }

    fn additional_class_members(&self, class: ClassId) -> SymbolTable {
        let class = self.get(class);
        let mut result = class.members.clone();

        if let Some(superclass) = class.inherits {
            let superclass_members = self.additional_class_members(superclass);
            for (k, v) in superclass_members {
                result.entry(k).or_insert(v);
            }
        }

        result
    }

    fn import_members(&self, settings: ImportMembers) -> FlatSymbolTable {
        let mut already_included = FxHashSet::default();
        already_included.insert(self.file());
        let mut result = FlatSymbolTable::default();
        // If we ask for root/conse symbols but root/conse table also has imports on it to not iterate
        // over the same file twice we include symbols from both source_table and root_table
        let (first_settings, second_settings, container) = match settings {
            ImportMembers::Target(target) => (GetMembersInner::Target(target), None, target),
            ImportMembers::Const => (
                GetMembersInner::ConstAsSource,
                Some(GetMembersInner::Const),
                ImportTarget::Table(self.const_table()),
            ),
            ImportMembers::Root => (
                GetMembersInner::RootAsSource,
                Some(GetMembersInner::Root),
                ImportTarget::Table(self.root_table()),
            ),
        };

        let imports = self.imports();

        if let Some(imports) = imports.get(&container) {
            for import in imports {
                if !already_included.insert(*import) {
                    continue;
                }

                result.extend(import_members_inner(
                    self.db(),
                    *import,
                    &mut already_included,
                    first_settings,
                ));
            }
        }

        let Some(second_settings) = second_settings else {
            return result;
        };

        for import_list in imports.values() {
            for import in import_list {
                if !already_included.insert(*import) {
                    continue;
                }

                result.extend(import_members_inner(
                    self.db(),
                    *import,
                    &mut already_included,
                    second_settings,
                ));
            }
        }

        result
    }

    fn get_scope_execution_range(&self, scope: ScopeId) -> Option<TextRange> {
        let idx = self.arena()[scope].function?;
        let function = &self.arena()[idx];
        Some(function.range)
    }

    fn get_scope_container(&self, scope: ScopeId) -> Container {
        self.arena()[scope].function.map_or_else(
            || Container::Table(self.source_table()),
            |idx| {
                let function = &self.arena()[idx];
                function.bindenv.unwrap_or(function.container)
            },
        )
    }

    fn symbols_at(&self, offset: TextSize, hide_unnecessary: bool) -> FlatSymbolTable {
        let mut items = FlatSymbolTable::default();

        let scope = self.scope(offset);

        for (name, id) in self.local_members(offset) {
            items.entry(name).or_insert(id);
        }

        for (name, id) in self.members_of_table(
            self.const_table(),
            FindSymbol::OnlyBefore(offset),
            ImportMembers::Const,
            hide_unnecessary,
        ) {
            items.entry(name).or_insert(id);
        }

        let container = self.get_scope_container(scope);

        for (name, id) in self.members_of_container(
            container,
            FindSymbol::BeforeIfInExecutionRange(offset, scope),
            hide_unnecessary,
        ) {
            if !can_use_identifier(name.as_ref()) {
                continue;
            }

            items.entry(name).or_insert(id);
        }

        for (name, id) in self.members_of_table(
            self.root_table(),
            FindSymbol::BeforeIfInExecutionRange(offset, scope),
            ImportMembers::Root,
            hide_unnecessary,
        ) {
            if !can_use_identifier(name.as_ref()) {
                continue;
            }

            items.entry(name).or_insert(id);
        }

        items
    }

    fn members_of_primitive(
        &self,
        primitive: Primitive,
        settings: FindSymbol,
        hide_unnecessary: bool,
    ) -> FlatSymbolTable {
        let primitive_members = match primitive {
            Primitive::Table(id) => {
                let Some(id) = id else {
                    return builtin_table_members(self.db());
                };

                return self.members_of_table(
                    id,
                    settings,
                    ImportMembers::Target(ImportTarget::Table(id)),
                    hide_unnecessary,
                );
            }
            Primitive::Class(id) => {
                let Some(id) = id else {
                    return builtin_class_members(self.db());
                };

                return self.members_of_class(
                    id,
                    settings,
                    ImportMembers::Target(ImportTarget::Class(id)),
                    false,
                    hide_unnecessary,
                );
            }
            Primitive::Instance(id) => {
                let Some(id) = id else {
                    return instance_members(self.db());
                };

                return self.members_of_class(
                    id,
                    settings,
                    ImportMembers::Target(ImportTarget::Class(id)),
                    true,
                    hide_unnecessary,
                );
            }
            Primitive::Integer(_) => integer_members(self.db()),
            Primitive::Float(_) => float_members(self.db()),
            Primitive::String { .. } => string_members(self.db()),
            Primitive::Bool(_) => boolean_members(self.db()),
            Primitive::Array(_) => array_members(self.db()),
            Primitive::Function(_) => function_members(self.db()),
            Primitive::Generator(_) => generator_members(self.db()),
            Primitive::Thread(_) => thread_members(self.db()),
            Primitive::Weakref => weakref_members(self.db()),
            Primitive::Null => null_members(self.db()),
            Primitive::Any | Primitive::This => return FlatSymbolTable::default(),
        };

        if !hide_unnecessary {
            return primitive_members;
        }

        primitive_members
            .into_iter()
            .filter(|(_, v)| !self.get(*v).flags.intersects(SymbolFlags::HIDE))
            .collect()
    }

    fn members_of_type(
        &self,
        typ: Type,
        settings: FindSymbol,
        hide_unnecessary: bool,
    ) -> FlatSymbolTable {
        match typ {
            Type::Enum(id) => self.enum_members(id),
            Type::Primitive(prim) => self.members_of_primitive(prim, settings, hide_unnecessary),
            Type::Union(union) => union
                .primitives
                .iter()
                .flat_map(|prim| self.members_of_primitive(*prim, settings, hide_unnecessary))
                .collect(),
        }
    }

    fn members_of_container(
        &self,
        container: Container,
        settings: FindSymbol,
        hide_unnecessary: bool,
    ) -> FlatSymbolTable {
        match container {
            Container::Table(id) => self.members_of_table(
                id,
                settings,
                ImportMembers::Target(ImportTarget::Table(id)),
                hide_unnecessary,
            ),
            Container::Class(id) => self.members_of_class(
                id,
                settings,
                ImportMembers::Target(ImportTarget::Class(id)),
                false,
                hide_unnecessary,
            ),
            Container::Instance(id) => self.members_of_class(
                id,
                settings,
                ImportMembers::Target(ImportTarget::Class(id)),
                true,
                hide_unnecessary,
            ),
            Container::Enum(id) => self.enum_members(id),
        }
    }

    fn filter_symbols(&self, settings: FindSymbol, symbols: SymbolTable) -> FlatSymbolTable {
        let filter = move |offset, execution_range: Option<TextRange>| {
            if let Some(range) = execution_range {
                symbols
                    .into_iter()
                    .filter_map(|(name, ids)| {
                        let mut last = None;
                        for id in ids {
                            let symbol = self.get(id);
                            let symbol_range = symbol.node.text_range();
                            if range.contains_range(symbol_range) && symbol_range.end() >= offset {
                                break;
                            }

                            last = Some(id);
                        }

                        Some((name, last?))
                    })
                    .collect()
            } else {
                symbols
                    .into_iter()
                    .filter_map(|(name, ids)| {
                        let mut last = None;
                        for id in ids {
                            let symbol = self.get(id);
                            if symbol.node.text_range().end() >= offset {
                                break;
                            }

                            last = Some(id);
                        }
                        Some((name, last?))
                    })
                    .collect()
            }
        };

        match settings {
            FindSymbol::OnlyBefore(offset) => filter(offset, None),
            FindSymbol::BeforeIfInExecutionRange(offset, scope) => {
                filter(offset, self.get_scope_execution_range(scope))
            }
        }
    }

    fn members_of_table(
        &self,
        table: TableId,
        settings: FindSymbol,
        imports: ImportMembers,
        hide_unnecessary: bool,
    ) -> FlatSymbolTable {
        let mut members = match imports {
            ImportMembers::Const => {
                // This incorrectly calls table builtin methods on const instead of the root when in name
                // expression, e.g. `keys()`. It also breaks redefinition of builtin methods, e.g.
                // `class keys {}` which should normally work
                FlatSymbolTable::default()
            }
            _ => builtin_table_members(self.db()),
        };

        let additional = if table.file() == self.file() {
            self.filter_symbols(settings, self.additional_table_members(table))
        } else {
            to_flat_symbol_table(self.additional_table_members(table))
        };

        let imports = self.import_members(imports);
        if hide_unnecessary {
            for (k, v) in imports {
                if self.get(v).flags.intersects(SymbolFlags::HIDE) {
                    members.remove(&k);
                } else {
                    members.insert(k, v);
                }
            }

            for (k, v) in additional {
                if self.get(v).flags.intersects(SymbolFlags::HIDE) {
                    members.remove(&k);
                } else {
                    members.insert(k, v);
                }
            }
        } else {
            for (k, v) in imports {
                members.insert(k, v);
            }

            for (name, id) in additional {
                members.insert(name, id);
            }
        }

        members
    }

    fn members_of_class(
        &self,
        class: ClassId,
        settings: FindSymbol,
        imports: ImportMembers,
        for_instance: bool,
        hide_unnecessary: bool,
    ) -> FlatSymbolTable {
        let mut members = if for_instance {
            instance_members(self.db())
        } else {
            builtin_class_members(self.db())
        };

        let additional = if class.file() == self.file() {
            self.filter_symbols(settings, self.additional_class_members(class))
        } else {
            to_flat_symbol_table(self.additional_class_members(class))
        };

        let imports = self.import_members(imports);

        if hide_unnecessary {
            for (k, v) in imports {
                if self.get(v).flags.intersects(SymbolFlags::HIDE) {
                    members.remove(&k);
                } else {
                    members.insert(k, v);
                }
            }
            // Just not overwriting the 'members' with symbols that don't pass the filter is not enough
            // Internally the name will be overwritten, but if we don't overwrite it on our side we will
            // show a misleading symbol. Instead we can avoid showing these names to the user by removing
            // them from the table
            for (name, id) in additional {
                let symbol = self.get(id);
                if symbol.flags.intersects(SymbolFlags::HIDE)
                    || for_instance == symbol.flags.intersects(SymbolFlags::STATIC)
                {
                    members.remove(&name);
                } else {
                    members.insert(name, id);
                }
            }

            members.remove("constructor");
        } else {
            for (k, v) in imports {
                members.insert(k, v);
            }

            for (name, id) in additional {
                members.insert(name, id);
            }
        }

        members
    }

    /// The vector is in order of symbols being added, therefore the last symbol that passes the condition
    /// must be the symbol we're looking for
    fn find_member(&self, from: Container, name: &str, offset: TextSize) -> Option<&Symbol> {
        let (file, members) = match from {
            Container::Class(id) | Container::Instance(id) => {
                (id.file(), self.additional_class_members(id))
            }
            Container::Table(id) => (id.file(), self.additional_table_members(id)),
            // Shouldn't be used here
            Container::Enum(_) => return None,
        };

        if file != self.file() {
            return to_flat_symbol_table(members)
                .get(name)
                .map(|id| self.get(*id));
        }

        let symbols = members.get(name)?;
        let mut last = None;
        if let Some(range) = self.get_scope_execution_range(self.scope(offset)) {
            for id in symbols {
                let symbol = self.get(*id);
                if range.contains_range(symbol.node.text_range())
                    && symbol.node.text_range().end() > offset
                {
                    break;
                }

                last = Some(symbol);
            }
        } else {
            for id in symbols {
                let symbol = self.get(*id);
                if symbol.node.text_range().end() > offset {
                    break;
                }

                last = Some(symbol);
            }
        }
        last
    }

    fn type_to_symbol(&self, typ: &Type) -> Option<SymbolId> {
        typ.find_with_filter(
            |prim| {
                Some(match prim {
                    Primitive::Instance(id) => {
                        if let Some(id) = id
                            && let Some(class_id) = self.get(id).symbol
                        {
                            class_id
                        } else {
                            instance_symbol(self.db())?
                        }
                    }
                    Primitive::Integer(_) => integer_symbol(self.db())?,
                    Primitive::Float(_) => float_symbol(self.db())?,
                    Primitive::String { .. } => string_symbol(self.db())?,
                    Primitive::Bool(_) => boolean_symbol(self.db())?,
                    Primitive::Array(_) => array_symbol(self.db())?,
                    Primitive::Table(_) => table_symbol(self.db())?,
                    Primitive::Class(_) => class_symbol(self.db())?,
                    Primitive::Function(_) => function_symbol(self.db())?,
                    Primitive::Generator(_) => generator_symbol(self.db())?,
                    Primitive::Thread(_) => thread_symbol(self.db())?,
                    Primitive::Weakref => weakref_symbol(self.db())?,
                    Primitive::Null => null_symbol(self.db())?,
                    Primitive::Any | Primitive::This => return None,
                })
            },
            |prim| !matches!(prim, Primitive::Null),
        )
    }

    fn expr_kind_to_type(&self, maybe_kind: Option<&ExpressionKind>) -> Type {
        match maybe_kind {
            Some(ExpressionKind::Literal(typ)) => typ.clone(),
            Some(ExpressionKind::Symbol(symbol)) => self.get(*symbol).typ.clone(),
            None => Type::default(),
        }
    }

    fn expr_kind_at(&self, range: TextRange) -> Option<&ExpressionKind> {
        self.range_to_expr().get(&range)
    }

    fn symbol_at(&self, range: TextRange) -> Option<SymbolId> {
        self.range_to_symbol().get(&range).copied()
    }

    fn type_at(&self, text_range: TextRange) -> Type {
        self.expr_kind_to_type(self.expr_kind_at(text_range))
    }

    fn primitive_to_str(&self, primitive: &Primitive) -> Box<str> {
        match primitive {
            Primitive::Instance(id) => {
                if let Some(id) = id
                    && let Some(symbol) = self.get(*id).symbol
                {
                    self.get(symbol).name.clone()
                } else {
                    "instance".into()
                }
            }
            Primitive::Array(kind) => {
                let Some(id) = kind else {
                    return "array".into();
                };

                let kind = &self.get(*id).kind;

                if *kind == Type::ANY {
                    return "array".into();
                }

                format!("[{}]", self.type_to_str(kind)).into_boxed_str()
            }
            _ => self.primitive_to_str_generic(primitive).into(),
        }
    }

    fn primitive_to_str_generic(&self, primitive: &Primitive) -> &'static str {
        match primitive {
            Primitive::Any => "any",
            Primitive::Integer(_) => "integer",
            Primitive::Float(_) => "float",
            Primitive::String { .. } => "string",
            Primitive::Bool(_) => "bool",
            Primitive::Null => "null",
            Primitive::Instance(_) => "instance",
            Primitive::Array(_) => "array",
            Primitive::Table(_) => "table",
            Primitive::Class(_) => "class",
            Primitive::Function(_) => "function",
            Primitive::Generator(_) => "generator",
            Primitive::Thread(_) => "thread",
            Primitive::Weakref => "weakref",
            Primitive::This => "this",
        }
    }

    fn type_to_str_impl(
        &self,
        typ: &Type,
        prim_to_str: impl Fn(&Primitive) -> Box<str>,
    ) -> Box<str> {
        match typ {
            Type::Enum(_) => "enum".into(),
            Type::Primitive(prim) => prim_to_str(prim),
            Type::Union(id) => id
                .primitives
                .iter()
                .filter(|prim| **prim != Primitive::Any)
                .map(prim_to_str)
                .collect::<Vec<_>>()
                .join("|")
                .into_boxed_str(),
        }
    }

    fn type_to_str_generic(&self, typ: &Type) -> Box<str> {
        self.type_to_str_impl(typ, |prim| self.primitive_to_str_generic(prim).into())
    }

    fn type_to_str(&self, typ: &Type) -> Box<str> {
        self.type_to_str_impl(typ, |prim| self.primitive_to_str(prim))
    }

    fn symbol_detail(&self, id: SymbolId) -> String {
        let s = self.get(id);
        match Primitive::try_from(&s.typ) {
            Ok(Primitive::Function(Some(id))) => {
                self.function_markdown(FunctionMarkdown::Anonymous, id)
            }
            _ => self.type_to_str(&s.typ).into_string(),
        }
    }

    fn symbol_markdown(&self, id: SymbolId) -> String {
        let s = self.get(id);
        let mut str = "\n```sqDoc\n".to_owned();

        let finish = |str: &mut String| {
            str.push_str("\n```\n");
            if let Some(desc) = &s.description {
                str.push_str(desc);
            }
        };

        let class_or_table_members = |str: &mut String, members| {
            let members: Vec<_> = to_flat_symbol_table(members)
                .into_iter()
                .filter_map(|(name, id)| {
                    let typ = &self.get(id).typ;
                    if matches!(Primitive::try_from(typ), Ok(Primitive::Function(_))) {
                        return None;
                    }
                    Some((quote_if_cant_use_identifier(name.as_ref()), typ))
                })
                .collect();

            let total = members.len();

            if total == 0 {
                return false;
            }

            str.push_str(" {\n");

            for (name, typ) in members.into_iter().take(MARKDOWN_MEMBER_LIMIT) {
                let _ = writeln!(str, "\t{name}: {},", self.type_to_str(typ));
            }

            if total > MARKDOWN_MEMBER_LIMIT {
                let _ = writeln!(
                    str,
                    "\t// ... {} more members",
                    total - MARKDOWN_MEMBER_LIMIT
                );
            }

            str.push('}');

            true
        };

        let name = quote_if_cant_use_identifier(&s.name);

        match s.kind {
            SymbolKind::Local(_) => str.push_str("local "),
            SymbolKind::Property { .. } => {
                if s.flags.intersects(SymbolFlags::STATIC) {
                    str.push_str("static ");
                }
            }
            SymbolKind::Constant | SymbolKind::EnumMember => {
                let type_text = match s.typ {
                    Type::Enum(id) => {
                        let _ = write!(str, "enum {name}");

                        let members = self.enum_members(id);
                        let total = members.len();
                        if total == 0 {
                            finish(&mut str);
                            return str;
                        }
                        str.push_str(" {\n");

                        for (name, _) in members.into_iter().take(MARKDOWN_MEMBER_LIMIT) {
                            let _ = writeln!(str, "\t{name},");
                        }

                        if total > MARKDOWN_MEMBER_LIMIT {
                            let _ = writeln!(
                                str,
                                "\t// ... {} more members",
                                total - MARKDOWN_MEMBER_LIMIT
                            );
                        }

                        str.push('}');

                        finish(&mut str);
                        return str;
                    }
                    Type::Primitive(Primitive::Integer(Some(value))) => value.to_string(),
                    Type::Primitive(Primitive::Float(Some(value))) => value.to_string(),
                    Type::Primitive(Primitive::Bool(Some(value))) => value.to_string(),
                    Type::Primitive(Primitive::String {
                        literal: Some(literal),
                        ..
                    }) => {
                        format!("\"{}\"", self.get(literal).text)
                    }
                    _ => {
                        let _ = write!(str, "const {name}");
                        finish(&mut str);
                        return str;
                    }
                };

                let _ = write!(&mut str, "const {name}: {type_text}");
                finish(&mut str);
                return str;
            }
        }

        match Primitive::try_from(&s.typ) {
            Ok(Primitive::Function(Some(id))) => {
                let signature = self.function_markdown(FunctionMarkdown::Full(&name), id);
                str.push_str(&signature);
            }
            Ok(Primitive::Function(None)) => {
                let _ = write!(str, "function {name}()");
            }
            Ok(Primitive::Class(id)) => {
                let _ = write!(str, "class {name}");
                if let Some(id) = id {
                    class_or_table_members(&mut str, self.additional_class_members(id));
                }
            }
            Ok(Primitive::Table(Some(id))) => {
                let _ = write!(str, "{name}:");
                if !class_or_table_members(&mut str, self.additional_table_members(id)) {
                    str.push_str(" table");
                }
            }
            _ => {
                let _ = write!(str, "{}: {}", name, self.type_to_str(&s.typ));
            }
        }

        finish(&mut str);
        str
    }

    fn function_markdown(&self, kind: FunctionMarkdown, id: FunctionId) -> String {
        let func = self.get(id);
        let mut label = match kind {
            FunctionMarkdown::Anonymous => "@(".to_owned(),
            FunctionMarkdown::Full(name) => format!("function {name}("),
        };

        let default_after = if let ParamsState::Default(after) = func.params_state {
            Some(after)
        } else {
            None
        };

        for (i, &param_id) in func.params.iter().enumerate() {
            if i > 0 {
                label.push_str(", ");
            }
            let param = self.get(param_id);
            match kind {
                FunctionMarkdown::Anonymous => {
                    label.push_str(&self.type_to_str(&param.typ));
                }
                FunctionMarkdown::Full(_) => {
                    label.push_str(&param.name);
                    if let Some(default_after) = default_after
                        && i >= default_after
                    {
                        label.push('?');
                    }
                    let _ = write!(label, ": {}", self.type_to_str(&param.typ));
                }
            }
        }

        if let ParamsState::VarArgs(_, id) = func.params_state {
            if !func.params.is_empty() {
                label.push_str(", ");
            }
            match kind {
                FunctionMarkdown::Anonymous => {
                    label.push_str("...");
                    let symbol = self.get(id);
                    if let Type::Primitive(Primitive::Array(Some(id))) = &symbol.typ {
                        label.push_str(&self.type_to_str(&self.get(*id).kind));
                    }
                }
                FunctionMarkdown::Full(_) => {
                    label.push_str("...vargv");
                    let symbol = self.get(id);
                    if let Type::Primitive(Primitive::Array(Some(id))) = &symbol.typ {
                        let typ = &self.get(*id).kind;

                        let _ = write!(label, ": {}", self.type_to_str(typ));
                    }
                }
            }
        }

        label.push(')');

        if func.throws != TypeState::Absent {
            label.push('!');
        }

        match &func.ret {
            TypeState::Absent => {}
            TypeState::NotExplicit(typ) | TypeState::Explicit(typ) => {
                if *typ != Type::NULL {
                    let _ = write!(label, " -> {}", self.type_to_str(typ));
                }
            }
        }

        label
    }
}

#[must_use]
pub fn token_name_range(token: &SyntaxToken) -> TextRange {
    let token_range = token.text_range();
    match token.kind() {
        SyntaxKind::String => {
            let text = token.text();
            let left = u32::from(text.starts_with('"'));
            let right = u32::from(text.ends_with('"'));

            TextRange::new(
                token_range.start() + TextSize::new(left),
                token_range.end() - TextSize::new(right),
            )
        }
        SyntaxKind::VerbatimString => {
            let text = token.text();
            let left = if text.starts_with("@\"") { 2 } else { 0 };
            let right = u32::from(text.ends_with('"'));

            TextRange::new(
                token_range.start() + TextSize::new(left),
                token_range.end() - TextSize::new(right),
            )
        }
        _ => token_range,
    }
}

pub struct SourceCtx<'db>(&'db dyn VScriptDatabase, File);

impl<'db> SourceCtx<'db> {
    pub fn new(db: &'db dyn VScriptDatabase, file: File) -> Self {
        // Wait until ready: source symbol has been computed
        source_symbol(db, file);
        Self(db, file)
    }

    fn source(&self) -> &SourceSymbol {
        source_symbol(self.0, self.1)
    }
}

impl Source for SourceCtx<'_> {
    fn arena(&self) -> &SourceArena {
        &self.source().arena
    }

    fn get<T>(&self, id: T) -> &T::Data
    where
        T: ArenaId,
        SourceArena: std::ops::Index<Idx<T::Data>, Output = T::Data>,
    {
        id.get_data(self.0)
    }

    fn file(&self) -> File {
        self.1
    }

    fn db(&self) -> &dyn VScriptDatabase {
        self.0
    }

    fn imports(&self) -> &FxHashMap<ImportTarget, Vec<File>> {
        &self.source().imports
    }

    fn scope(&self, offset: TextSize) -> ScopeId {
        self.source().arena.scope_at(offset)
    }

    fn source_table(&self) -> TableId {
        TableId::new(self.1, self.source().source_table)
    }

    fn root_table(&self) -> TableId {
        TableId::new(self.1, self.source().root_table)
    }

    fn const_table(&self) -> TableId {
        TableId::new(self.1, self.source().const_table)
    }

    fn range_to_expr(&self) -> &FxHashMap<TextRange, ExpressionKind> {
        &self.source().range_to_expr
    }

    fn range_to_symbol(&self) -> &FxHashMap<TextRange, SymbolId> {
        &self.source().range_to_symbol
    }

    fn doc_to_symbol(&self) -> &FxHashMap<TextRange, SymbolId> {
        &self.source().doc_to_symbol
    }

    fn symbol_to_ranges(&self) -> &FxHashMap<SymbolId, Vec<TextRange>> {
        &self.source().symbol_to_ranges
    }

    fn diagnostics(&self) -> &[Diagnostic] {
        &self.source().diagnostics
    }
}

#[derive(Debug, PartialEq)]
pub struct SourceSymbol {
    imports: FxHashMap<ImportTarget, Vec<File>>,

    arena: SourceArena,
    const_table: Idx<TableData>,
    root_table: Idx<TableData>,
    source_table: Idx<TableData>,

    range_to_expr: FxHashMap<TextRange, ExpressionKind>,
    range_to_symbol: FxHashMap<TextRange, SymbolId>,
    doc_to_symbol: FxHashMap<TextRange, SymbolId>,
    symbol_to_ranges: FxHashMap<SymbolId, Vec<TextRange>>,
    diagnostics: Vec<Diagnostic>,
}
