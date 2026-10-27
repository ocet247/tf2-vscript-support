use crate::cst::SyntaxKind;

#[derive(Clone, Copy)]
pub struct TokenSet(u128);

impl TokenSet {
    const fn new(kinds: &[SyntaxKind]) -> Self {
        let mut bitset = 0u128;
        let mut i = 0;
        while i < kinds.len() {
            bitset |= mask(kinds[i]);
            i += 1;
        }
        Self(bitset)
    }

    const fn union(&self, other: Self) -> Self {
        Self(self.0 | other.0)
    }

    const fn difference(&self, other: Self) -> Self {
        Self(self.0 & !other.0)
    }

    pub const fn contains(&self, kind: SyntaxKind) -> bool {
        self.0 & mask(kind) != 0
    }

    pub const EVERYTHING: Self = Self(u128::MAX);

    pub const ALWAYS_RECOVER: Self = Self::new(&[
        SyntaxKind::Eof,
        SyntaxKind::OpenBrace,
        SyntaxKind::CloseBrace,
    ]);

    pub const END_OF_FILE: Self = Self::new(&[SyntaxKind::Eof]);

    pub const END_OF_BLOCK: Self = Self::new(&[SyntaxKind::Eof, SyntaxKind::CloseBrace]);

    pub const END_OF_STATEMENT: Self = Self::new(&[
        SyntaxKind::Eof,
        SyntaxKind::CloseBrace,
        SyntaxKind::Semicolon,
    ]);

    pub const END_OF_CASE_CLAUSE: Self = Self::new(&[
        SyntaxKind::Eof,
        SyntaxKind::CloseBrace,
        SyntaxKind::CaseKeyword,
        SyntaxKind::DefaultKeyword,
    ]);

    pub const NAME: Self = Self::new(&[SyntaxKind::Identifier, SyntaxKind::ConstructorKeyword]);

    pub const ASSIGNMENT_OPERATORS: Self = Self::new(&[
        SyntaxKind::Equals,
        SyntaxKind::PlusEquals,
        SyntaxKind::MinusEquals,
        SyntaxKind::AsteriskEquals,
        SyntaxKind::SlashEquals,
        SyntaxKind::PercentEquals,
        SyntaxKind::LessThanMinus,
    ]);

    pub const BINARY_OPERATORS: Self = Self::new(&[
        SyntaxKind::BarBar,
        SyntaxKind::AmpersandAmpersand,
        SyntaxKind::Bar,
        SyntaxKind::Caret,
        SyntaxKind::Ampersand,
        SyntaxKind::EqualsEquals,
        SyntaxKind::ExclamationEquals,
        SyntaxKind::LessThanEqualsGreaterThan,
        SyntaxKind::LessThan,
        SyntaxKind::GreaterThan,
        SyntaxKind::LessThanEquals,
        SyntaxKind::GreaterThanEquals,
        SyntaxKind::InstanceOfKeyword,
        SyntaxKind::InKeyword,
        SyntaxKind::LessThanLessThan,
        SyntaxKind::GreaterThanGreaterThan,
        SyntaxKind::GreaterThanGreaterThanGreaterThan,
        SyntaxKind::Plus,
        SyntaxKind::Minus,
        SyntaxKind::Asterisk,
        SyntaxKind::Slash,
        SyntaxKind::Percent,
    ]);

    pub const PREFIX_UNARY_OPERATORS: Self = Self::new(&[
        SyntaxKind::Minus,
        SyntaxKind::Exclamation,
        SyntaxKind::Tilde,
    ]);

    pub const UPDATE_OPERATORS: Self = Self::new(&[SyntaxKind::PlusPlus, SyntaxKind::MinusMinus]);

    pub const INIT_OPERATORS: Self = Self::new(&[
        // These 3 are the only valid ones but we also keep other operators
        // that contain equals operators for better recovery
        SyntaxKind::Equals,
        SyntaxKind::Colon,
        SyntaxKind::LessThanMinus,
        //
        SyntaxKind::PlusEquals,
        SyntaxKind::MinusEquals,
        SyntaxKind::AsteriskEquals,
        SyntaxKind::SlashEquals,
        SyntaxKind::PercentEquals,
        SyntaxKind::LessThanMinus,
        SyntaxKind::EqualsEquals,
        SyntaxKind::ExclamationEquals,
        SyntaxKind::LessThanEqualsGreaterThan,
        SyntaxKind::LessThanEquals,
        SyntaxKind::GreaterThanEquals,
    ]);

    pub const SEPARATORS: Self = Self::new(&[SyntaxKind::Comma, SyntaxKind::Semicolon]);

    pub const EXPRESSIONS: Self = Self::new(&[
        SyntaxKind::Minus,
        SyntaxKind::Tilde,
        SyntaxKind::Exclamation,
        SyntaxKind::At,
        SyntaxKind::MinusMinus,
        SyntaxKind::PlusPlus,
        SyntaxKind::ColonColon,
        SyntaxKind::CloneKeyword,
        SyntaxKind::DeleteKeyword,
        SyntaxKind::TypeOfKeyword,
        SyntaxKind::ResumeKeyword,
        SyntaxKind::ThisKeyword,
        SyntaxKind::BaseKeyword,
        SyntaxKind::FileKeyword,
        SyntaxKind::LineKeyword,
        SyntaxKind::DecimalInteger,
        SyntaxKind::Character,
        SyntaxKind::Float,
        SyntaxKind::TrueKeyword,
        SyntaxKind::FalseKeyword,
        SyntaxKind::NullKeyword,
        SyntaxKind::String,
        SyntaxKind::VerbatimString,
        SyntaxKind::OpenBrace,
        SyntaxKind::OpenParenthesis,
        SyntaxKind::ClassKeyword,
        SyntaxKind::RawCallKeyword,
        SyntaxKind::Identifier,
        SyntaxKind::ConstructorKeyword,
        SyntaxKind::FunctionKeyword,
        SyntaxKind::OpenBracket,
    ]);

    pub const END_OF_METHOD: Self = Self::new(&[
        SyntaxKind::StaticKeyword,
        SyntaxKind::CloseBrace,
        SyntaxKind::Eof,
    ]);

    pub const MEMBER_FIRST: Self = Self::new(&[
        SyntaxKind::Identifier,
        SyntaxKind::ConstructorKeyword,
        SyntaxKind::FunctionKeyword,
        SyntaxKind::OpenBracket,
        SyntaxKind::StaticKeyword,
    ]);

    pub const NON_MEMBER_FIRST_EXPRESSIONS: Self = Self::EXPRESSIONS.difference(Self::MEMBER_FIRST);

    pub const MEMBER_RECOVERY: Self =
        Self::NON_MEMBER_FIRST_EXPRESSIONS.union(Self::INIT_OPERATORS);

    // Other expressions make no sense when used as statements
    pub const COMMON_EXPRESSION_STATEMENTS: Self = Self::new(&[
        SyntaxKind::Identifier,
        SyntaxKind::ConstructorKeyword,
        SyntaxKind::ColonColon,
        SyntaxKind::MinusMinus,
        SyntaxKind::PlusPlus,
        SyntaxKind::ResumeKeyword,
        SyntaxKind::DeleteKeyword,
        SyntaxKind::ThisKeyword,
        SyntaxKind::BaseKeyword,
        SyntaxKind::RawCallKeyword,
        SyntaxKind::FunctionKeyword,
        SyntaxKind::ClassKeyword,
    ]);

    pub const NON_EXPRESSION_STATEMENT: Self = Self::new(&[
        SyntaxKind::IfKeyword,
        SyntaxKind::WhileKeyword,
        SyntaxKind::DoKeyword,
        SyntaxKind::ForKeyword,
        SyntaxKind::ForEachKeyword,
        SyntaxKind::SwitchKeyword,
        SyntaxKind::LocalKeyword,
        SyntaxKind::ConstKeyword,
        SyntaxKind::ReturnKeyword,
        SyntaxKind::YieldKeyword,
        SyntaxKind::ContinueKeyword,
        SyntaxKind::BreakKeyword,
        SyntaxKind::EnumKeyword,
        SyntaxKind::TryKeyword,
        SyntaxKind::ThrowKeyword,
    ]);

    pub const STATEMENT: Self = Self::NON_EXPRESSION_STATEMENT.union(Self::new(&[
        SyntaxKind::OpenBrace,
        SyntaxKind::FunctionKeyword,
        SyntaxKind::ClassKeyword,
    ]));

    pub const STATEMENT_OR_CLOSE_PARENTHESIS: Self =
        Self::NON_EXPRESSION_STATEMENT.union(Self::new(&[SyntaxKind::CloseParenthesis]));

    pub const STATEMENT_OR_CLOSE_PARENTHESIS_OR_ELSE: Self =
        Self::STATEMENT_OR_CLOSE_PARENTHESIS.union(Self::new(&[SyntaxKind::ElseKeyword]));

    pub const STATEMENT_OR_CLOSE_BRACKET: Self =
        Self::NON_EXPRESSION_STATEMENT.union(Self::new(&[SyntaxKind::CloseBracket]));

    pub const STATEMENT_OR_COLON: Self =
        Self::NON_EXPRESSION_STATEMENT.union(Self::new(&[SyntaxKind::Colon]));

    pub const STATEMENT_OR_ATTRIBUTE: Self =
        Self::NON_EXPRESSION_STATEMENT.union(Self::new(&[SyntaxKind::LessThanSlash]));

    pub const STATEMENT_WITH_SEMICOLON: Self =
        Self::STATEMENT.union(Self::new(&[SyntaxKind::Semicolon]));

    pub const STATEMENT_OR_EXPRESSION: Self =
        Self::EXPRESSIONS.union(Self::STATEMENT_WITH_SEMICOLON);
    pub const COMMON_STATEMENT_OR_EXPRESSION: Self =
        Self::COMMON_EXPRESSION_STATEMENTS.union(Self::STATEMENT_WITH_SEMICOLON);

    pub const FOREACH_RECOVERY: Self =
        Self::STATEMENT_OR_EXPRESSION
            .union(Self::SEPARATORS)
            .union(Self::new(&[
                SyntaxKind::CloseParenthesis,
                SyntaxKind::InKeyword,
            ]));

    pub const VARIABLE_RECOVERY: Self =
        Self::COMMON_STATEMENT_OR_EXPRESSION.union(Self::INIT_OPERATORS);

    pub const PARAMETER_RECOVERY: Self = Self::VARIABLE_RECOVERY.union(Self::new(&[
        SyntaxKind::CloseParenthesis,
        SyntaxKind::DotDotDot,
    ]));

    pub const CATCH_RECOVERY: Self =
        Self::VARIABLE_RECOVERY.union(Self::new(&[SyntaxKind::CloseParenthesis]));

    pub const NAME_QUALIFIER: Self = Self::new(&[SyntaxKind::Dot, SyntaxKind::ColonColon]);

    // if we see an equals sign we can parse it as nameless param
    pub const FUNCTION_NAME_RECOVERY: Self = Self::PARAMETER_RECOVERY.union(Self::new(&[
        SyntaxKind::OpenParenthesis,
        SyntaxKind::OpenBracket,
        SyntaxKind::CloseBracket,
        SyntaxKind::Dot,
    ]));

    pub const KEYWORDS: Self = Self::new(&[
        SyntaxKind::BaseKeyword,
        SyntaxKind::BreakKeyword,
        SyntaxKind::CaseKeyword,
        SyntaxKind::CatchKeyword,
        SyntaxKind::ClassKeyword,
        SyntaxKind::CloneKeyword,
        SyntaxKind::ConstKeyword,
        SyntaxKind::ConstructorKeyword,
        SyntaxKind::ContinueKeyword,
        SyntaxKind::DefaultKeyword,
        SyntaxKind::DeleteKeyword,
        SyntaxKind::DoKeyword,
        SyntaxKind::ElseKeyword,
        SyntaxKind::EnumKeyword,
        SyntaxKind::ExtendsKeyword,
        SyntaxKind::FalseKeyword,
        SyntaxKind::ForEachKeyword,
        SyntaxKind::ForKeyword,
        SyntaxKind::FunctionKeyword,
        SyntaxKind::IfKeyword,
        SyntaxKind::InKeyword,
        SyntaxKind::InstanceOfKeyword,
        SyntaxKind::LocalKeyword,
        SyntaxKind::NullKeyword,
        SyntaxKind::RawCallKeyword,
        SyntaxKind::ResumeKeyword,
        SyntaxKind::ReturnKeyword,
        SyntaxKind::StaticKeyword,
        SyntaxKind::SwitchKeyword,
        SyntaxKind::ThisKeyword,
        SyntaxKind::ThrowKeyword,
        SyntaxKind::TrueKeyword,
        SyntaxKind::TryKeyword,
        SyntaxKind::TypeOfKeyword,
        SyntaxKind::WhileKeyword,
        SyntaxKind::YieldKeyword,
        SyntaxKind::FileKeyword,
        SyntaxKind::LineKeyword,
    ]);

    pub const SWITCH_RECOVERY: Self = Self::STATEMENT_OR_EXPRESSION.union(Self::new(&[
        SyntaxKind::Eof,
        SyntaxKind::CloseBrace,
        SyntaxKind::CaseKeyword,
        SyntaxKind::DefaultKeyword,
    ]));

    pub const CALL_ARGUMENTS_STOP: Self = Self::NON_EXPRESSION_STATEMENT.union(Self::new(&[
        SyntaxKind::Eof,
        SyntaxKind::CloseParenthesis,
        SyntaxKind::CloseBrace,
    ]));
}

const fn mask(kind: SyntaxKind) -> u128 {
    assert!(
        (kind as u16) < (SyntaxKind::__LastToken as u16),
        "Provided SyntaxKind is not a valid token kind"
    );
    1u128 << (kind as u16)
}
