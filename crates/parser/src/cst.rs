use rowan::Language;

#[derive(
    Default, Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd, num_derive::FromPrimitive,
)]
#[repr(u16)]
pub enum SyntaxKind {
    #[default]
    Unknown = 0,
    Eof,

    Whitespace,
    LineFeed,

    BlockComment,
    DocComment,
    LineComment,

    AsteriskEquals,
    Equals,
    MinusEquals,
    PercentEquals,
    PlusEquals,
    SlashEquals,
    LessThanMinus,

    Plus,
    Minus,
    Asterisk,
    Slash,
    Percent,
    Ampersand,
    Bar,
    Caret,
    AmpersandAmpersand,
    BarBar,
    LessThan,
    GreaterThan,
    LessThanEquals,
    GreaterThanEquals,
    EqualsEquals,
    ExclamationEquals,
    LessThanLessThan,
    GreaterThanGreaterThan,
    GreaterThanGreaterThanGreaterThan,
    LessThanEqualsGreaterThan,

    Exclamation,
    Tilde,
    PlusPlus,
    MinusMinus,

    At,
    Colon,
    ColonColon,
    Comma,
    Semicolon,
    Dot,
    DotDotDot,
    Question,

    OpenBrace,
    CloseBrace,
    OpenBracket,
    CloseBracket,
    OpenParenthesis,
    CloseParenthesis,
    LessThanSlash,
    SlashGreaterThan,

    Identifier,
    Float,
    DecimalInteger,
    OctalInteger,
    HexInteger,
    Character,
    String,
    VerbatimString,

    BaseKeyword,
    BreakKeyword,
    CaseKeyword,
    CatchKeyword,
    ClassKeyword,
    CloneKeyword,
    ConstKeyword,
    ConstructorKeyword,
    ContinueKeyword,
    DefaultKeyword,
    DeleteKeyword,
    DoKeyword,
    ElseKeyword,
    EnumKeyword,
    ExtendsKeyword,
    FalseKeyword,
    ForEachKeyword,
    ForKeyword,
    FunctionKeyword,
    IfKeyword,
    InKeyword,
    InstanceOfKeyword,
    LocalKeyword,
    NullKeyword,
    RawCallKeyword,
    ResumeKeyword,
    ReturnKeyword,
    StaticKeyword,
    SwitchKeyword,
    ThisKeyword,
    ThrowKeyword,
    TrueKeyword,
    TryKeyword,
    TypeOfKeyword,
    WhileKeyword,
    YieldKeyword,

    FileKeyword,
    LineKeyword,

    // Doc comment related
    DocAsterisk,
    DocSlashAsteriskAsterisk,
    DocAsteriskSlash,
    DocNewLine,
    DocAt,
    DocPipe,
    DocComma,
    DocEllipsis,
    DocQuestion,
    DocColon,
    DocOpenBrace,
    DocCloseBrace,
    DocOpenBracket,
    DocCloseBracket,
    DocOpenParenthesis,
    DocCloseParenthesis,
    DocArrow,
    DocGeneratorArrow,
    DocFunctionParameter,
    DocFunctionReturn,
    DocIdentifier,
    DocText,

    __LastToken,

    SourceFile,
    Error,

    Name,
    QualifiedName,
    QualifiedNamePart,

    Index,
    Callee,
    MemberPart,

    VariableDeclaration,
    Initialiser,

    IfElseBranch,

    CatchClause,

    ForInitialiser,
    ForCondition,
    ForIncrement,

    ForeachKey,
    ForeachValue,

    Environment,
    ParameterList,
    VariedArgs,

    PostCallInitialiser,

    Extends,
    Members,
    Property,
    SimpleName,
    StringName,
    ComputedName,

    Constructor,
    Method,
    Attributes,

    // For ternary
    ThenBranch,
    ElseBranch,

    BinaryExpression,
    ConditionalExpression,
    PrefixUnaryExpression,
    PrefixUpdateExpression,
    DeleteExpression,
    TypeOfExpression,
    CloneExpression,
    ResumeExpression,
    RawCallExpression,
    PostfixUpdateExpression,
    MemberAccessExpression,
    ElementAccessExpression,
    CallExpression,
    LiteralExpression,
    RootAccessExpression,
    ThisExpression,
    BaseExpression,
    FileExpression,
    LineExpression,
    ParenthesisedExpression,
    ArrayLiteralExpression,
    TableLiteralExpression,
    FunctionExpression,
    LambdaExpression,
    ClassExpression,

    EmptyStatement,
    BlockStatement,
    IfStatement,
    WhileStatement,
    DoWhileStatement,
    ForStatement,
    ForEachStatement,
    SwitchStatement,
    ConstStatement,
    // These 2 can also appear inside for loop, so they're not necessarily statements
    LocalFunctionDeclaration,
    LocalVariableDeclaration,
    ReturnStatement,
    YieldStatement,
    ContinueStatement,
    BreakStatement,
    FunctionStatement,
    ClassStatement,
    EnumStatement,
    TryStatement,
    ThrowStatement,
    ExpressionStatement,

    CaseClause,
    DefaultClause,

    DocCommentNode,
    DocDescription,
    DocDescriptionLine,

    DocName,
    DocTagItem,
    DocTagType,
    DocType,
    DocTypeName,
    DocTypeArray,
    DocTypeFunction,

    UnknownTag,
    ParamTag,
    VarArgsTag,
    ExtendsTag,
    TypeTag,
    ReturnTag,
    ThrowTag,
    YieldTag,
    OverrideTag,
    NoDiscardTag,
    NativeTag,
    VarTag,
    HideTag,
    DeprecatedTag,
    ConstTag,
    InputTag,
    StaticTag,
    ThisTag,

    __Last,
}

impl From<SyntaxKind> for rowan::SyntaxKind {
    fn from(kind: SyntaxKind) -> Self {
        Self(kind as u16)
    }
}

impl SyntaxKind {
    #[must_use]
    pub(crate) fn text(self) -> &'static str {
        match self {
            Self::Eof => "end of file",
            Self::AsteriskEquals => "'*='",
            Self::Equals => "'='",
            Self::MinusEquals => "'-='",
            Self::PercentEquals => "'%='",
            Self::PlusEquals => "'+='",
            Self::SlashEquals => "'/='",
            Self::LessThanMinus => "'<-'",

            Self::Plus => "'+'",
            Self::Minus => "'-'",
            Self::Asterisk => "'*'",
            Self::Slash => "'/'",
            Self::Percent => "'%'",
            Self::Ampersand => "'&'",
            Self::Bar => "'|'",
            Self::Caret => "'^'",
            Self::AmpersandAmpersand => "'&&'",
            Self::BarBar => "'||'",
            Self::LessThan => "'<'",
            Self::GreaterThan => "'>'",
            Self::LessThanEquals => "'<='",
            Self::GreaterThanEquals => "'>='",
            Self::EqualsEquals => "'=='",
            Self::ExclamationEquals => "'!='",
            Self::LessThanLessThan => "'<<'",
            Self::GreaterThanGreaterThan => "'>>'",
            Self::GreaterThanGreaterThanGreaterThan => "'>>>'",
            Self::LessThanEqualsGreaterThan => "'<=>'",

            Self::Exclamation => "'!'",
            Self::Tilde => "'~'",
            Self::PlusPlus => "'++'",
            Self::MinusMinus => "'--'",

            Self::At => "'@'",
            Self::Colon => "':'",
            Self::ColonColon => "'::'",
            Self::Comma => "','",
            Self::Semicolon => "';'",
            Self::Dot => "'.'",
            Self::DotDotDot => "'...'",
            Self::Question => "'?'",

            Self::OpenBrace => "'{'",
            Self::CloseBrace => "'}'",
            Self::OpenBracket => "'['",
            Self::CloseBracket => "']'",
            Self::OpenParenthesis => "'('",
            Self::CloseParenthesis => "')'",
            Self::LessThanSlash => "'</'",
            Self::SlashGreaterThan => "'/>'",

            Self::Identifier => "'identifier'",
            Self::Float => "float",
            Self::DecimalInteger => "integer",
            Self::String => "string",
            Self::Character => "character",
            Self::VerbatimString => "verbatim string",

            Self::BaseKeyword => "'base'",
            Self::BreakKeyword => "'break'",
            Self::CaseKeyword => "'case'",
            Self::CatchKeyword => "'catch'",
            Self::ClassKeyword => "'class'",
            Self::CloneKeyword => "'clone'",
            Self::ConstKeyword => "'const'",
            Self::ConstructorKeyword => "'constructor'",
            Self::ContinueKeyword => "'continue'",
            Self::DefaultKeyword => "'default'",
            Self::DeleteKeyword => "'delete'",
            Self::DoKeyword => "'do'",
            Self::ElseKeyword => "'else'",
            Self::EnumKeyword => "'enum'",
            Self::ExtendsKeyword => "'extends'",
            Self::FalseKeyword => "'false'",
            Self::ForEachKeyword => "'foreach'",
            Self::ForKeyword => "'for'",
            Self::FunctionKeyword => "'function'",
            Self::IfKeyword => "'if'",
            Self::InKeyword => "'in'",
            Self::InstanceOfKeyword => "'instanceof'",
            Self::LocalKeyword => "'local'",
            Self::NullKeyword => "'null'",
            Self::RawCallKeyword => "'rawcall'",
            Self::ResumeKeyword => "'resume'",
            Self::ReturnKeyword => "'return'",
            Self::StaticKeyword => "'static'",
            Self::SwitchKeyword => "'switch'",
            Self::ThisKeyword => "'this'",
            Self::ThrowKeyword => "'throw'",
            Self::TrueKeyword => "'true'",
            Self::TryKeyword => "'try'",
            Self::TypeOfKeyword => "'typeof'",
            Self::WhileKeyword => "'while'",
            Self::YieldKeyword => "'yield'",

            Self::FileKeyword => "'__FILE__'",
            Self::LineKeyword => "'__LINE__'",

            _ => panic!("SyntaxKind::{self:?} has no fixed text representation"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum SquirrelLanguage {}

impl Language for SquirrelLanguage {
    type Kind = SyntaxKind;

    fn kind_from_raw(raw: rowan::SyntaxKind) -> Self::Kind {
        num_traits::FromPrimitive::from_u16(raw.0).expect("invalid SyntaxKind")
    }

    fn kind_to_raw(kind: Self::Kind) -> rowan::SyntaxKind {
        kind.into()
    }
}

pub type SyntaxNode = rowan::SyntaxNode<SquirrelLanguage>;
pub type SyntaxToken = rowan::SyntaxToken<SquirrelLanguage>;
pub type SyntaxElement = rowan::NodeOrToken<SyntaxNode, SyntaxToken>;
pub type SyntaxNodePtr = rowan::ast::SyntaxNodePtr<SquirrelLanguage>;
