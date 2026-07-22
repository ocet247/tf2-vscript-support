use crate::cst::{SquirrelLanguage, SyntaxKind, SyntaxNode, SyntaxToken};
use rowan::ast::{AstChildren, AstNode, support};

macro_rules! ast_node {
    ($name:ident, $kind:ident) => {
        #[derive(Debug, Clone, PartialEq, Eq, Hash)]
        pub struct $name(SyntaxNode);

        impl AstNode for $name {
            type Language = SquirrelLanguage;

            fn can_cast(kind: SyntaxKind) -> bool {
                kind == SyntaxKind::$kind
            }

            fn cast(node: SyntaxNode) -> Option<Self> {
                if node.kind() == SyntaxKind::$kind {
                    Some(Self(node))
                } else {
                    None
                }
            }

            fn syntax(&self) -> &SyntaxNode {
                &self.0
            }
        }
    };
}

macro_rules! ast_enum {
    ($name:ident { $($variant:ident($inner:ident)),* $(,)? }) => {
        #[derive(Debug, Clone, PartialEq, Eq, Hash)]
        pub enum $name {
            $($variant($inner),)*
        }

        impl AstNode for $name {
            type Language = SquirrelLanguage;

            fn can_cast(kind: SyntaxKind) -> bool {
                matches!(kind, $(SyntaxKind::$inner)|*)
            }

            fn cast(node: SyntaxNode) -> Option<Self> {
                Some(match node.kind() {
                    $(SyntaxKind::$inner => $name::$variant($inner(node)),)*
                    _ => return None,
                })
            }

            fn syntax(&self) -> &SyntaxNode {
                match self {
                    $($name::$variant(n) => n.syntax(),)*
                }
            }
        }
    };
}

macro_rules! ast_token_enum {
    ($name:ident { $($kind:ident => $variant:ident),* $(,)? }) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
        pub enum $name {
            $($variant),*
        }

        impl $name {
            pub const fn from_kind(kind: SyntaxKind) -> Option<Self> {
                match kind {
                    $(SyntaxKind::$kind => Some(Self::$variant),)*
                    _ => None,
                }
            }

            pub fn token(node: &SyntaxNode) -> Option<(Self, SyntaxToken)> {
                node.children_with_tokens()
                    .filter_map(|it| it.into_token())
                    .find_map(|tok| Some((Self::from_kind(tok.kind())?, tok)))
            }
        }
    };
}

// Searching `Expr` can be ambigious if a node has multiple expressions as direct children.
// Example: for (;abc;) | for (;;abc)
// Searching for the first expression here will either give us the condition or the increment
// Therefore expression wrappers are used that are nodes which just contain 1 expression
// But make it possible to distinct different parts of a node by having another SyntaxKind
// Otherwise the tree should be as flattened as possible so if a node contains only a single
// expression the wrapper is not created
pub trait ExpressionWrapper: AstNode<Language = SquirrelLanguage> {
    fn expression(&self) -> Option<Expr> {
        support::child(self.syntax())
    }
}

// Doesn't actually account for all the names, only the flat ones
pub trait HasName: AstNode<Language = SquirrelLanguage> {
    fn name(&self) -> Option<Name> {
        support::child(self.syntax())
    }
}

pub trait HasDoc: AstNode<Language = SquirrelLanguage> {
    fn doc(&self) -> Option<DocComment> {
        support::child(self.syntax())
    }
}

pub trait HasOperand: AstNode<Language = SquirrelLanguage> {
    fn operand(&self) -> Option<Expr> {
        support::child(self.syntax())
    }
}

// Doesn't account for case/default bodies and lambda expression
pub trait HasBody: AstNode<Language = SquirrelLanguage> {
    fn body(&self) -> Option<Stmt> {
        support::child(self.syntax())
    }
}

pub trait IsFunction: AstNode<Language = SquirrelLanguage> + HasDoc {
    fn environment(&self) -> Option<Environment> {
        support::child(self.syntax())
    }

    fn parameter_list(&self) -> Option<ParameterList> {
        support::child(self.syntax())
    }

    fn body(&self) -> Option<FunctionBody> {
        support::child(self.syntax()).map(FunctionBody::Stmt)
    }

    fn function_token(&self) -> Option<SyntaxToken> {
        support::token(self.syntax(), SyntaxKind::FunctionKeyword)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FunctionBody {
    Stmt(Stmt),
    Expr(Expr),
}

pub trait IsClass: AstNode<Language = SquirrelLanguage> {
    fn extends(&self) -> Option<Extends> {
        support::child(self.syntax())
    }

    fn members(&self) -> AstChildren<Member> {
        support::children(self.syntax())
    }
}

pub trait IsClassMember: AstNode<Language = SquirrelLanguage> {
    fn attributes(&self) -> Option<Attributes> {
        support::child(self.syntax())
    }

    fn static_keyword(&self) -> Option<SyntaxToken> {
        support::token(self.syntax(), SyntaxKind::StaticKeyword)
    }
}

ast_node!(Name, Name);
impl Name {
    #[must_use]
    pub fn identifier(&self) -> Option<SyntaxToken> {
        support::token(&self.0, SyntaxKind::Identifier)
    }
}

ast_node!(QualifiedNamePart, QualifiedNamePart);
impl HasName for QualifiedNamePart {}

ast_node!(QualifiedName, QualifiedName);
impl HasName for QualifiedName {}
impl QualifiedName {
    #[must_use]
    pub fn parts(&self) -> AstChildren<QualifiedNamePart> {
        support::children(&self.0)
    }
}

ast_token_enum!(LiteralExpressionKind {
    NullKeyword => Null,
    TrueKeyword => True,
    FalseKeyword => False,
    String => String,
    VerbatimString => VerbatimString,
    DecimalInteger => DecimalInteger,
    OctalInteger => OctalInteger,
    HexInteger => HexInteger,
    Character => Character,
    Float => Float,
});

ast_node!(LiteralExpression, LiteralExpression);
impl LiteralExpression {
    #[must_use]
    pub fn token(&self) -> Option<(LiteralExpressionKind, SyntaxToken)> {
        LiteralExpressionKind::token(&self.0)
    }
}
ast_token_enum!(BinaryOperator {
    Comma => Comma,

    Plus => Add,
    Minus => Subtract,
    Asterisk => Multiply,
    Slash => Divide,
    Percent => Modulo,

    Ampersand => BitwiseAnd,
    Bar => BitwiseOr,
    Caret => BitwiseXor,
    LessThanLessThan => LeftShift,
    GreaterThanGreaterThan => RightShift,
    GreaterThanGreaterThanGreaterThan => UnsignedRightShift,

    EqualsEquals => Equals,
    ExclamationEquals => NotEquals,

    LessThan => Less,
    LessThanEquals => LessEqual,
    GreaterThan => Greater,
    GreaterThanEquals => GreaterEqual,
    LessThanEqualsGreaterThan => ThreeWay,

    InstanceOfKeyword => InstanceOf,
    InKeyword => In,

    AmpersandAmpersand => LogicalAnd,
    BarBar => LogicalOr,

    Equals => Assign,
    LessThanMinus => NewSlot,
    PlusEquals => AddAssign,
    MinusEquals => SubtractAssign,
    AsteriskEquals => MultiplyAssign,
    SlashEquals => DivideAssign,
    PercentEquals => ModuloAssign,
});

ast_node!(BinaryExpression, BinaryExpression);
impl HasDoc for BinaryExpression {}

impl BinaryExpression {
    #[must_use]
    pub fn lhs(&self) -> Option<Expr> {
        support::children(&self.0).next()
    }

    #[must_use]
    pub fn operator(&self) -> Option<(BinaryOperator, SyntaxToken)> {
        BinaryOperator::token(&self.0)
    }
    // It's impossible to have rhs without lhs with the current
    // algorithm therefore expression wrapper is not needed so
    // .nth works this may need to change in the future if
    // recovery of `local a = * 2` is actually present
    #[must_use]
    pub fn rhs(&self) -> Option<Expr> {
        support::children(&self.0).nth(1)
    }
}

ast_node!(ThenBranch, ThenBranch);
impl ExpressionWrapper for ThenBranch {}

ast_node!(ElseBranch, ElseBranch);
impl ExpressionWrapper for ElseBranch {}

ast_node!(ConditionalExpression, ConditionalExpression);
impl ConditionalExpression {
    #[must_use]
    pub fn condition(&self) -> Option<Expr> {
        support::child(&self.0)
    }

    #[must_use]
    pub fn then_branch(&self) -> Option<ThenBranch> {
        support::child(&self.0)
    }

    #[must_use]
    pub fn else_branch(&self) -> Option<ElseBranch> {
        support::child(&self.0)
    }
}

ast_token_enum!(PrefixUnaryOperator {
    Minus => Negation,
    Tilde => BitwiseNot,
    Exclamation => LogicalNot,
});
ast_node!(PrefixUnaryExpression, PrefixUnaryExpression);
impl HasOperand for PrefixUnaryExpression {}
impl PrefixUnaryExpression {
    #[must_use]
    pub fn operator(&self) -> Option<(PrefixUnaryOperator, SyntaxToken)> {
        PrefixUnaryOperator::token(&self.0)
    }
}

ast_token_enum!(PrefixUpdateOperator {
    PlusPlus => Increment,
    MinusMinus => Decrement,
});
ast_node!(PrefixUpdateExpression, PrefixUpdateExpression);
impl HasOperand for PrefixUpdateExpression {}
impl PrefixUpdateExpression {
    #[must_use]
    pub fn operator(&self) -> Option<(PrefixUpdateOperator, SyntaxToken)> {
        PrefixUpdateOperator::token(&self.0)
    }
}

ast_token_enum!(PostfixUpdateOperator {
    PlusPlus => Increment,
    MinusMinus => Decrement,
});
ast_node!(PostfixUpdateExpression, PostfixUpdateExpression);
impl HasOperand for PostfixUpdateExpression {}
impl PostfixUpdateExpression {
    #[must_use]
    pub fn operator(&self) -> Option<(PostfixUpdateOperator, SyntaxToken)> {
        PostfixUpdateOperator::token(&self.0)
    }
}

ast_node!(DeleteExpression, DeleteExpression);
impl HasOperand for DeleteExpression {}

ast_node!(TypeOfExpression, TypeOfExpression);
impl HasOperand for TypeOfExpression {}

ast_node!(CloneExpression, CloneExpression);
impl HasOperand for CloneExpression {}

ast_node!(ResumeExpression, ResumeExpression);
impl HasOperand for ResumeExpression {}

ast_node!(RawCallExpression, RawCallExpression);
impl RawCallExpression {
    #[must_use]
    pub fn arguments(&self) -> AstChildren<Expr> {
        support::children(&self.0)
    }
}

ast_node!(MemberPart, MemberPart);
impl HasName for MemberPart {}

ast_node!(MemberAccessExpression, MemberAccessExpression);

impl MemberAccessExpression {
    #[must_use]
    pub fn object(&self) -> Option<Expr> {
        support::child(&self.0)
    }

    #[must_use]
    pub fn dot_token(&self) -> Option<SyntaxToken> {
        support::token(&self.0, SyntaxKind::Dot)
    }

    #[must_use]
    pub fn member_part(&self) -> Option<MemberPart> {
        support::child(&self.0)
    }
}

ast_node!(Index, Index);
impl ExpressionWrapper for Index {}

ast_node!(ElementAccessExpression, ElementAccessExpression);
impl ElementAccessExpression {
    #[must_use]
    pub fn object(&self) -> Option<Expr> {
        support::child(&self.0)
    }

    #[must_use]
    pub fn index(&self) -> Option<Index> {
        support::child(&self.0)
    }
}

ast_node!(Callee, Callee);
impl ExpressionWrapper for Callee {}
ast_node!(CallExpression, CallExpression);

impl CallExpression {
    #[must_use]
    pub fn callee(&self) -> Option<Callee> {
        support::child(&self.0)
    }

    pub fn arguments(&self) -> impl Iterator<Item = Expr> + '_ {
        support::children(&self.0)
    }

    #[must_use]
    pub fn post_call_initialiser(&self) -> Option<PostCallInitialiser> {
        support::child(&self.0)
    }
}

ast_node!(RootAccessExpression, RootAccessExpression);
impl HasName for RootAccessExpression {}

ast_node!(ThisExpression, ThisExpression);
ast_node!(BaseExpression, BaseExpression);
ast_node!(FileExpression, FileExpression);
ast_node!(LineExpression, LineExpression);

ast_node!(ParenthesisedExpression, ParenthesisedExpression);

impl ParenthesisedExpression {
    #[must_use]
    pub fn inner(&self) -> Option<Expr> {
        support::child(&self.0)
    }
}

ast_node!(ArrayLiteralExpression, ArrayLiteralExpression);

impl ArrayLiteralExpression {
    #[must_use]
    pub fn elements(&self) -> AstChildren<Expr> {
        support::children(&self.0)
    }
}

ast_node!(TableLiteralExpression, TableLiteralExpression);

impl TableLiteralExpression {
    #[must_use]
    pub fn members(&self) -> AstChildren<Member> {
        support::children(&self.0)
    }
}

ast_node!(FunctionExpression, FunctionExpression);
impl IsFunction for FunctionExpression {}
impl HasDoc for FunctionExpression {}

ast_node!(LambdaExpression, LambdaExpression);
impl IsFunction for LambdaExpression {
    fn body(&self) -> Option<FunctionBody> {
        support::child(self.syntax()).map(FunctionBody::Expr)
    }

    fn function_token(&self) -> Option<SyntaxToken> {
        support::token(self.syntax(), SyntaxKind::At)
    }
}
impl HasDoc for LambdaExpression {}

ast_node!(ClassExpression, ClassExpression);
impl IsClass for ClassExpression {}

ast_enum!(Expr {
    Literal(LiteralExpression),
    Name(Name),
    Binary(BinaryExpression),
    Conditional(ConditionalExpression),
    PrefixUnary(PrefixUnaryExpression),
    PrefixUpdate(PrefixUpdateExpression),
    PostfixUpdate(PostfixUpdateExpression),
    Delete(DeleteExpression),
    TypeOf(TypeOfExpression),
    Clone(CloneExpression),
    Resume(ResumeExpression),
    RawCall(RawCallExpression),
    MemberAccess(MemberAccessExpression),
    ElementAccess(ElementAccessExpression),
    Call(CallExpression),
    RootAccess(RootAccessExpression),
    This(ThisExpression),
    Base(BaseExpression),
    File(FileExpression),
    Line(LineExpression),
    Parenthesised(ParenthesisedExpression),
    ArrayLiteral(ArrayLiteralExpression),
    TableLiteral(TableLiteralExpression),
    Function(FunctionExpression),
    Lambda(LambdaExpression),
    Class(ClassExpression),
});

ast_node!(SourceFile, SourceFile);
impl HasDoc for SourceFile {}

impl SourceFile {
    #[must_use]
    pub fn statements(&self) -> AstChildren<Stmt> {
        support::children(&self.0)
    }
}

ast_node!(EmptyStatement, EmptyStatement);

ast_node!(BlockStatement, BlockStatement);

impl BlockStatement {
    #[must_use]
    pub fn statements(&self) -> AstChildren<Stmt> {
        support::children(&self.0)
    }
}

ast_node!(IfStatement, IfStatement);
ast_node!(IfElseBranch, IfElseBranch);

impl IfStatement {
    #[must_use]
    pub fn condition(&self) -> Option<Expr> {
        support::child(&self.0)
    }

    #[must_use]
    pub fn statement(&self) -> Option<Stmt> {
        support::child(&self.0)
    }

    #[must_use]
    pub fn else_branch(&self) -> Option<IfElseBranch> {
        support::child(&self.0)
    }
}

impl IfElseBranch {
    #[must_use]
    pub fn statement(&self) -> Option<Stmt> {
        support::child(&self.0)
    }
}

ast_node!(WhileStatement, WhileStatement);
impl HasBody for WhileStatement {}

impl WhileStatement {
    #[must_use]
    pub fn condition(&self) -> Option<Expr> {
        support::child(&self.0)
    }
}

ast_node!(DoWhileStatement, DoWhileStatement);
impl HasBody for DoWhileStatement {}

impl DoWhileStatement {
    #[must_use]
    pub fn condition(&self) -> Option<Expr> {
        support::child(&self.0)
    }
}

ast_node!(ForInitialiser, ForInitialiser);
pub enum ForInitialiserKind {
    LocalVariableDeclaration(LocalVariableDeclaration),
    LocalFunctionDeclaration(LocalFunctionDeclaration),
    Expression(Expr),
}
impl ForInitialiser {
    #[must_use]
    pub fn kind(&self) -> Option<ForInitialiserKind> {
        self.syntax().children().find_map(|node| match node.kind() {
            SyntaxKind::LocalVariableDeclaration => Some(
                ForInitialiserKind::LocalVariableDeclaration(LocalVariableDeclaration(node)),
            ),
            SyntaxKind::LocalFunctionDeclaration => Some(
                ForInitialiserKind::LocalFunctionDeclaration(LocalFunctionDeclaration(node)),
            ),
            _ if Expr::can_cast(node.kind()) => {
                Some(ForInitialiserKind::Expression(Expr::cast(node)?))
            }
            _ => None,
        })
    }
}

ast_node!(ForCondition, ForCondition);
impl ExpressionWrapper for ForCondition {}

ast_node!(ForIncrement, ForIncrement);
impl ExpressionWrapper for ForIncrement {}

ast_node!(ForStatement, ForStatement);
impl HasBody for ForStatement {}

impl ForStatement {
    #[must_use]
    pub fn initialiser(&self) -> Option<ForInitialiser> {
        support::child(&self.0)
    }

    #[must_use]
    pub fn condition(&self) -> Option<ForCondition> {
        support::child(&self.0)
    }

    #[must_use]
    pub fn increment(&self) -> Option<ForIncrement> {
        support::child(&self.0)
    }
}

ast_node!(ForEachKey, ForeachKey);
impl HasName for ForEachKey {}
impl HasDoc for ForEachKey {}

ast_node!(ForEachValue, ForeachValue);
impl HasName for ForEachValue {}
impl HasDoc for ForEachValue {}

ast_node!(ForEachStatement, ForEachStatement);
impl HasBody for ForEachStatement {}

impl ForEachStatement {
    #[must_use]
    pub fn key(&self) -> Option<ForEachKey> {
        support::child(&self.0)
    }

    #[must_use]
    pub fn value(&self) -> Option<ForEachValue> {
        support::child(&self.0)
    }

    #[must_use]
    pub fn iterable(&self) -> Option<Expr> {
        support::child(&self.0)
    }
}

ast_node!(CaseClause, CaseClause);

impl CaseClause {
    #[must_use]
    pub fn test(&self) -> Option<Expr> {
        support::child(&self.0)
    }

    #[must_use]
    pub fn body(&self) -> AstChildren<Stmt> {
        support::children(&self.0)
    }
}

ast_node!(DefaultClause, DefaultClause);

impl DefaultClause {
    #[must_use]
    pub fn body(&self) -> AstChildren<Stmt> {
        support::children(&self.0)
    }
}

ast_enum!(SwitchClause {
    Case(CaseClause),
    Default(DefaultClause)
});

ast_node!(SwitchStatement, SwitchStatement);

impl SwitchStatement {
    #[must_use]
    pub fn discriminant(&self) -> Option<Expr> {
        support::child(&self.0)
    }

    #[must_use]
    pub fn clauses(&self) -> AstChildren<SwitchClause> {
        support::children(&self.0)
    }
}

ast_node!(ConstStatement, ConstStatement);
impl HasDoc for ConstStatement {}
impl HasName for ConstStatement {}

impl ConstStatement {
    #[must_use]
    pub fn value(&self) -> Option<Initialiser> {
        support::child(&self.0)
    }
}

ast_node!(LocalVariableDeclaration, LocalVariableDeclaration);
impl HasDoc for LocalVariableDeclaration {}

impl LocalVariableDeclaration {
    #[must_use]
    pub fn declarations(&self) -> AstChildren<VariableDeclaration> {
        support::children(&self.0)
    }
}

ast_node!(LocalFunctionDeclaration, LocalFunctionDeclaration);
impl HasDoc for LocalFunctionDeclaration {}
impl HasName for LocalFunctionDeclaration {}
impl IsFunction for LocalFunctionDeclaration {}

ast_node!(ReturnStatement, ReturnStatement);

impl ReturnStatement {
    #[must_use]
    pub fn value(&self) -> Option<Expr> {
        support::child(&self.0)
    }
}

ast_node!(YieldStatement, YieldStatement);

impl YieldStatement {
    #[must_use]
    pub fn value(&self) -> Option<Expr> {
        support::child(&self.0)
    }
}

ast_node!(ContinueStatement, ContinueStatement);
ast_node!(BreakStatement, BreakStatement);

ast_node!(FunctionStatement, FunctionStatement);
impl HasDoc for FunctionStatement {}
impl IsFunction for FunctionStatement {}

impl FunctionStatement {
    #[must_use]
    pub fn name(&self) -> Option<QualifiedName> {
        support::child(&self.0)
    }
}

ast_node!(ClassStatement, ClassStatement);
impl HasDoc for ClassStatement {}
impl IsClass for ClassStatement {}

impl ClassStatement {
    #[must_use]
    pub fn name(&self) -> Option<Expr> {
        support::child(&self.0)
    }
}

ast_node!(EnumStatement, EnumStatement);
impl HasDoc for EnumStatement {}
impl HasName for EnumStatement {}

impl EnumStatement {
    #[must_use]
    pub fn members(&self) -> AstChildren<Property> {
        support::children(&self.0)
    }
}

ast_node!(TryStatement, TryStatement);
impl HasBody for TryStatement {}

impl TryStatement {
    #[must_use]
    pub fn catch_clause(&self) -> Option<CatchClause> {
        support::child(&self.0)
    }
}

ast_node!(CatchClause, CatchClause);
impl HasBody for CatchClause {}

impl CatchClause {
    #[must_use]
    pub fn binding(&self) -> Option<VariableDeclaration> {
        support::child(&self.0)
    }
}

ast_node!(ThrowStatement, ThrowStatement);

impl ThrowStatement {
    #[must_use]
    pub fn value(&self) -> Option<Expr> {
        support::child(&self.0)
    }
}

ast_node!(ExpressionStatement, ExpressionStatement);
impl ExpressionWrapper for ExpressionStatement {}

ast_enum!(Stmt {
    Empty(EmptyStatement),
    Block(BlockStatement),
    If(IfStatement),
    While(WhileStatement),
    DoWhile(DoWhileStatement),
    For(ForStatement),
    ForEach(ForEachStatement),
    Switch(SwitchStatement),
    Const(ConstStatement),
    LocalVariable(LocalVariableDeclaration),
    LocalFunction(LocalFunctionDeclaration),
    Return(ReturnStatement),
    Yield(YieldStatement),
    Continue(ContinueStatement),
    Break(BreakStatement),
    Function(FunctionStatement),
    Class(ClassStatement),
    Enum(EnumStatement),
    Try(TryStatement),
    Throw(ThrowStatement),
    Expression(ExpressionStatement),
});

ast_node!(Initialiser, Initialiser);
impl ExpressionWrapper for Initialiser {}

ast_node!(VariableDeclaration, VariableDeclaration);
impl HasDoc for VariableDeclaration {}
impl HasName for VariableDeclaration {}

impl VariableDeclaration {
    #[must_use]
    pub fn initialiser(&self) -> Option<Initialiser> {
        support::child(&self.0)
    }
}

ast_enum!(Parameter {
    Variable(VariableDeclaration),
    Ellipsis(VariedArgs),
});

ast_node!(ParameterList, ParameterList);

impl ParameterList {
    #[must_use]
    pub fn parameters(&self) -> AstChildren<Parameter> {
        support::children(&self.0)
    }
}

ast_node!(Environment, Environment);
impl ExpressionWrapper for Environment {}

ast_node!(VariedArgs, VariedArgs);

ast_node!(Extends, Extends);
impl ExpressionWrapper for Extends {}

ast_node!(Attributes, Attributes);

impl Attributes {
    #[must_use]
    pub fn members(&self) -> AstChildren<Property> {
        support::children(&self.0)
    }
}

ast_node!(PostCallInitialiser, PostCallInitialiser);

impl PostCallInitialiser {
    #[must_use]
    pub fn members(&self) -> AstChildren<Property> {
        support::children(&self.0)
    }
}

ast_node!(Property, Property);
impl HasDoc for Property {}
impl IsClassMember for Property {}

impl Property {
    #[must_use]
    pub fn name(&self) -> Option<MemberName> {
        support::child(&self.0)
    }

    #[must_use]
    pub fn value(&self) -> Option<Expr> {
        support::child(&self.0)
    }
}

ast_node!(SimpleName, SimpleName);
impl SimpleName {
    #[must_use]
    pub fn name(&self) -> Option<Name> {
        support::child(&self.0)
    }
}

ast_token_enum!(StringNameKind {
    String => Normal,
    VerbatimString => Verbatim,
});

ast_node!(StringName, StringName);
impl StringName {
    #[must_use]
    pub fn token(&self) -> Option<(StringNameKind, SyntaxToken)> {
        StringNameKind::token(&self.0)
    }
}

ast_node!(ComputedName, ComputedName);
impl ExpressionWrapper for ComputedName {}

ast_enum!(MemberName {
    Identifier(SimpleName),
    String(StringName),
    Computed(ComputedName),
});

ast_node!(Constructor, Constructor);
impl HasDoc for Constructor {}
impl IsFunction for Constructor {}
impl IsClassMember for Constructor {}
impl Constructor {
    #[must_use]
    pub fn constructor_keyword(&self) -> Option<SyntaxToken> {
        support::token(&self.0, SyntaxKind::ConstructorKeyword)
    }
}

ast_node!(Method, Method);
impl HasDoc for Method {}
impl HasName for Method {}
impl IsFunction for Method {}
impl IsClassMember for Method {}

ast_enum!(Member {
    Property(Property),
    Constructor(Constructor),
    Method(Method),
});

// DOC COMMENT

pub trait HasDocDescription: AstNode<Language = SquirrelLanguage> {
    fn description(&self) -> Option<DocDescription> {
        support::child(self.syntax())
    }
}

pub trait IsTag: AstNode<Language = SquirrelLanguage> {
    fn tag_item(&self) -> Option<DocTagItem> {
        support::child(self.syntax())
    }
}

pub trait HasDocType: AstNode<Language = SquirrelLanguage> {
    fn typ(&self) -> Option<DocTagType> {
        support::child(self.syntax())
    }
}

pub trait HasDocName: AstNode<Language = SquirrelLanguage> {
    #[must_use]
    fn name(&self) -> Option<DocName> {
        support::child(self.syntax())
    }
}

pub trait HasDocTypes: AstNode<Language = SquirrelLanguage> {
    fn types(&self) -> AstChildren<DocType> {
        support::children(self.syntax())
    }
}

ast_node!(DocComment, DocCommentNode);
impl HasDocDescription for DocComment {}
impl DocComment {
    #[must_use]
    pub fn tags(&self) -> AstChildren<Tag> {
        support::children(&self.0)
    }

    #[must_use]
    pub fn full_description(&self) -> Option<String> {
        let mut parts: Vec<String> = Vec::new();

        if let Some(desc) = self.description()
            && let Some(content) = desc.content()
        {
            parts.push(content);
        }

        for tag in self.tags() {
            let mut tag_str = String::from("*");
            if let Some(item) = tag.tag_item() {
                tag_str.push_str(&item.syntax().text().to_string());
            }

            tag_str.push('*');

            if let Tag::Param(param) = &tag
                && let Some(name) = param.name().and_then(|n| n.identifier())
            {
                tag_str.push(' ');
                tag_str.push('`');
                tag_str.push_str(name.text());
                tag_str.push('`');
            }

            if let Some(desc) = tag.description()
                && let Some(content) = desc.content()
            {
                let content = content.trim();
                tag_str.push_str(" \u{2014} \n"); // em dash
                tag_str.push_str(content);
            }

            parts.push(tag_str);
        }

        if parts.is_empty() {
            None
        } else {
            Some(parts.join("\n\n"))
        }
    }
}

ast_node!(DocDescription, DocDescription);
impl DocDescription {
    #[must_use]
    pub fn lines(&self) -> AstChildren<DocDescriptionLine> {
        support::children(self.syntax())
    }

    #[must_use]
    pub fn content(&self) -> Option<String> {
        let mut lines = self.lines().peekable();
        lines.peek()?;
        Some(lines.filter_map(|l| l.content()).collect())
    }
}

ast_node!(DocDescriptionLine, DocDescriptionLine);
impl DocDescriptionLine {
    #[must_use]
    pub fn content_token(&self) -> Option<SyntaxToken> {
        support::token(self.syntax(), SyntaxKind::DocText)
    }

    #[must_use]
    pub fn content(&self) -> Option<String> {
        self.content_token().map(|t| t.text().to_owned())
    }
}

ast_node!(DocTagItem, DocTagItem);

ast_node!(DocName, DocName);
impl DocName {
    #[must_use]
    pub fn identifier(&self) -> Option<SyntaxToken> {
        support::token(&self.0, SyntaxKind::DocIdentifier)
    }
}

ast_node!(DocTagType, DocTagType);
impl HasDocTypes for DocTagType {}

ast_enum!(DocType {
    Name(DocTypeName),
    Array(DocTypeArray),
    Function(DocTypeFunction),
});

ast_node!(DocTypeName, DocTypeName);
impl DocTypeName {
    #[must_use]
    pub fn identifier(&self) -> Option<SyntaxToken> {
        support::token(&self.0, SyntaxKind::DocIdentifier)
    }
}

ast_node!(DocTypeArray, DocTypeArray);
impl HasDocTypes for DocTypeArray {}

ast_node!(DocFunctionParameter, DocFunctionParameter);
impl HasDocTypes for DocFunctionParameter {}

impl DocFunctionParameter {
    #[must_use]
    pub fn question_token(&self) -> Option<SyntaxToken> {
        support::token(&self.0, SyntaxKind::DocQuestion)
    }

    #[must_use]
    pub fn ellipsis_token(&self) -> Option<SyntaxToken> {
        support::token(&self.0, SyntaxKind::DocEllipsis)
    }

    #[must_use]
    pub fn identifier(&self) -> Option<SyntaxToken> {
        support::token(&self.0, SyntaxKind::DocIdentifier)
    }
}

ast_node!(DocFunctionReturn, DocFunctionReturn);
impl HasDocTypes for DocFunctionReturn {}

ast_token_enum!(ArrowKind {
    DocArrow => Normal,
    DocGeneratorArrow => Generator,
});

impl DocFunctionReturn {
    #[must_use]
    pub fn arrow_token(&self) -> Option<(ArrowKind, SyntaxToken)> {
        ArrowKind::token(&self.0)
    }
}

ast_node!(DocTypeFunction, DocTypeFunction);

impl DocTypeFunction {
    #[must_use]
    pub fn parameters(&self) -> AstChildren<DocFunctionParameter> {
        support::children(self.syntax())
    }

    #[must_use]
    pub fn ret(&self) -> Option<DocFunctionReturn> {
        support::child(&self.0)
    }
}

ast_enum!(Tag {
    Return(ReturnTag),
    Param(ParamTag),
    VarArgs(VarArgsTag),
    ExtendsTag(ExtendsTag),
    Type(TypeTag),
    Throw(ThrowTag),
    Yield(YieldTag),
    Override(OverrideTag),
    NoDiscard(NoDiscardTag),
    Native(NativeTag),
    Var(VarTag),
    Hide(HideTag),
    Deprecated(DeprecatedTag),
    Const(ConstTag),
    Static(StaticTag),
    This(ThisTag),
});

impl HasDocDescription for Tag {}
impl IsTag for Tag {}

ast_node!(ReturnTag, ReturnTag);
impl HasDocDescription for ReturnTag {}
impl IsTag for ReturnTag {}
impl HasDocType for ReturnTag {}

ast_node!(ParamTag, ParamTag);
impl HasDocDescription for ParamTag {}
impl IsTag for ParamTag {}
impl HasDocType for ParamTag {}
impl HasDocName for ParamTag {}

ast_node!(VarArgsTag, VarArgsTag);
impl HasDocDescription for VarArgsTag {}
impl IsTag for VarArgsTag {}
impl HasDocType for VarArgsTag {}

ast_node!(ExtendsTag, ExtendsTag);
impl HasDocDescription for ExtendsTag {}
impl IsTag for ExtendsTag {}
impl HasDocType for ExtendsTag {}

ast_node!(TypeTag, TypeTag);
impl HasDocDescription for TypeTag {}
impl IsTag for TypeTag {}
impl HasDocType for TypeTag {}

ast_node!(ThisTag, ThisTag);
impl HasDocDescription for ThisTag {}
impl IsTag for ThisTag {}
impl HasDocType for ThisTag {}

ast_node!(ThrowTag, ThrowTag);
impl HasDocDescription for ThrowTag {}
impl IsTag for ThrowTag {}
impl HasDocType for ThrowTag {}

ast_node!(YieldTag, YieldTag);
impl HasDocDescription for YieldTag {}
impl IsTag for YieldTag {}
impl HasDocType for YieldTag {}

ast_node!(OverrideTag, OverrideTag);
impl HasDocDescription for OverrideTag {}
impl IsTag for OverrideTag {}

ast_node!(NoDiscardTag, NoDiscardTag);
impl HasDocDescription for NoDiscardTag {}
impl IsTag for NoDiscardTag {}

ast_node!(NativeTag, NativeTag);
impl HasDocDescription for NativeTag {}
impl IsTag for NativeTag {}

ast_node!(VarTag, VarTag);
impl HasDocDescription for VarTag {}
impl IsTag for VarTag {}
impl HasDocName for VarTag {}
impl HasDocType for VarTag {}

ast_node!(HideTag, HideTag);
impl HasDocDescription for HideTag {}
impl IsTag for HideTag {}

ast_node!(DeprecatedTag, DeprecatedTag);
impl HasDocDescription for DeprecatedTag {}
impl IsTag for DeprecatedTag {}

ast_node!(ConstTag, ConstTag);
impl HasDocDescription for ConstTag {}
impl IsTag for ConstTag {}

ast_node!(StaticTag, StaticTag);
impl HasDocDescription for StaticTag {}
impl IsTag for StaticTag {}
