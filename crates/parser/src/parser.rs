use crate::{Event, Marker, SyntaxError, SyntaxKind, lexer::Token, token_set::TokenSet};
use rowan::{TextRange, TextSize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum BinaryOperatorPrecedence {
    Lowest,         // Used to begin the precedence climbing
    LogicalOR,      // `||`
    LogicalAND,     // `&&`
    BitwiseOR,      // `|`
    BitwiseXOR,     // `^`
    BitwiseAND,     // `&`
    Equality,       // `==`, `!=`, `<=>`
    Relational,     // `<`, `>`, `<=`, `>=`, `instanceof`, `in`
    Shift,          // `<<`, `>>`, `>>>`
    Additive,       // `+`, `-`
    Multiplicative, // `*`, `/`, `%`
}

impl BinaryOperatorPrecedence {
    const fn from(token: SyntaxKind) -> Option<Self> {
        let precedence = match token {
            SyntaxKind::BarBar => Self::LogicalOR,
            SyntaxKind::AmpersandAmpersand => Self::LogicalAND,

            SyntaxKind::Bar => Self::BitwiseOR,
            SyntaxKind::Caret => Self::BitwiseXOR,
            SyntaxKind::Ampersand => Self::BitwiseAND,

            SyntaxKind::EqualsEquals
            | SyntaxKind::ExclamationEquals
            | SyntaxKind::LessThanEqualsGreaterThan => Self::Equality,

            SyntaxKind::LessThan
            | SyntaxKind::GreaterThan
            | SyntaxKind::LessThanEquals
            | SyntaxKind::GreaterThanEquals
            | SyntaxKind::InstanceOfKeyword
            | SyntaxKind::InKeyword => Self::Relational,

            SyntaxKind::LessThanLessThan
            | SyntaxKind::GreaterThanGreaterThan
            | SyntaxKind::GreaterThanGreaterThanGreaterThan => Self::Shift,

            SyntaxKind::Plus | SyntaxKind::Minus => Self::Additive,

            SyntaxKind::Asterisk | SyntaxKind::Slash | SyntaxKind::Percent => Self::Multiplicative,

            _ => return None,
        };

        Some(precedence)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum MemberObject {
    // Table is also used for attributes
    Table,
    Class,
    Enum,
    PostCallInitialiser,
}

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
enum ParsingObjectSeparator {
    #[default]
    None,
    Comma,
    Semicolon,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum VariableDeclaration {
    Local,
    Parameter,
    Catch,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ParseStatement {
    StatementBody { parse_end: bool },
    FunctionBody,
    MethodBody,
    TopStatements,
    BlockStatements,
    CaseStatements,
}

#[derive(Debug, Default)]
pub struct Parser {
    tokens: Vec<Token>,
    // We keep track of index of the token we've put into events(meaning that it is
    // consumed) and index of the token we're currently inspecting
    //
    // When we do .bump every token up to the current lookahead_index is consumed
    // (exclusive so Eof is avoided and when we call it twice in a row we don't get
    // new tokens), after that the lookahead_index snaps to the next non-trivia token
    //
    // When we .start a new node we consume all tokens up to the current lookahead
    // (Those tokens can only be trivia since unless consumed_index == lookahead_index
    // we have trivia in between them) which means that all trivia goes to this
    // new node's parent
    //
    // This way we ensure that no node other than source file has preceding or trailing
    // trivia tokens
    consumed_index: usize,
    lookahead_index: usize,
    preceding_comments_index: Option<usize>,

    fuel: u32,

    has_preceding_new_line: bool,
    has_new_line_after_comment: bool,

    prev_token: Token,
    object_separator: ParsingObjectSeparator,

    errors: Vec<SyntaxError>,
    events: Vec<Event>,
}

impl Parser {
    pub fn parse(tokens: Vec<Token>) -> (Vec<Event>, Vec<SyntaxError>) {
        let mut parser = Self {
            tokens,
            ..Default::default()
        };
        parser.parse_source_file();
        (parser.events, parser.errors)
    }

    fn parse_source_file(&mut self) {
        // Create this marker manually so we don't trigger consume_to_lookeahead
        // And cause trivia tokens to start outside of the source file node
        self.events.push(Event::Pending);
        let m = Marker(0);
        self.skip_trivia();
        while self.parse_statement(ParseStatement::TopStatements) {}
        self.consume_to_lookahead();
        self.finish(m, SyntaxKind::SourceFile);
    }

    fn consume_to_lookahead(&mut self) {
        for i in self.consumed_index..self.lookahead_index {
            let token = &self.tokens[i];
            self.events.push(Event::Token {
                kind: token.kind,
                range: token.range,
            });
        }
        self.consumed_index = self.lookahead_index;
    }

    const fn reset_comments(&mut self) {
        self.preceding_comments_index = None;
        self.has_new_line_after_comment = false;
    }

    /// Adds the marker as the last element to the events array
    fn start(&mut self) -> Marker {
        if let Some(comments_index) = self.preceding_comments_index {
            self.reset_comments();

            let save_lookahead = self.lookahead_index;
            self.lookahead_index = comments_index;
            self.consume_to_lookahead();

            let index = self.events.len();
            self.events.push(Event::Pending);

            self.lookahead_index = save_lookahead;
            self.consume_to_lookahead();

            Marker(index)
        } else {
            self.reset_comments();
            self.consume_to_lookahead();
            let index = self.events.len();
            self.events.push(Event::Pending);
            Marker(index)
        }
    }

    fn start_without_comment_attachment(&mut self) -> Marker {
        if let Some(comments_index) = self.preceding_comments_index {
            let save_lookahead = self.lookahead_index;
            self.lookahead_index = comments_index;
            self.consume_to_lookahead();
            self.lookahead_index = save_lookahead;
        } else {
            self.reset_comments();
            self.consume_to_lookahead();
        }

        let index = self.events.len();
        self.events.push(Event::Pending);
        Marker(index)
    }

    /// Removes the marker of Pending type from the array, if marker
    /// wasn't a result of calling .precede completely invalidates
    /// the marker, as it starts to point at either out of bounds or
    /// token event. Otherwise rolls back the state of a marker before
    /// .precede was called
    fn drop(&mut self, marker: Marker) {
        assert!(
            marker.0 < self.events.len(),
            "Trying to drop marker that was dropped",
        );

        assert!(
            matches!(self.events[marker.0], Event::Pending),
            "Trying to drop marker that was finished or dropped"
        );

        self.events.remove(marker.0);
    }

    /// Finishes the marker of Pending type.
    /// Can call .precede after this is accomplished
    fn finish(&mut self, marker: Marker, kind: SyntaxKind) {
        assert!(
            marker.0 < self.events.len(),
            "Trying to finish marker that was dropped",
        );

        assert!(
            matches!(self.events[marker.0], Event::Pending),
            "Trying to finish marker that was finished or dropped"
        );

        self.events[marker.0] = Event::Start { kind };
        self.events.push(Event::Finish);
    }

    /// "Creates" a new marker right before the passed in marker
    /// Passed in marker should always be finished
    fn precede(&mut self, marker: Marker) {
        assert!(
            marker.0 < self.events.len(),
            "Trying to precede marker that was dropped",
        );

        assert!(
            matches!(self.events[marker.0], Event::Start { .. }),
            "Trying to precede marker that was dropped or unfinished"
        );

        self.events.insert(marker.0, Event::Pending);
    }

    const fn invalid_marker(&self) -> Marker {
        Marker(self.events.len())
    }

    fn marker_range(&self, marker: Marker) -> TextRange {
        assert!(
            marker.0 < self.events.len(),
            "Trying to get range of a marker that was dropped",
        );

        assert!(
            matches!(self.events[marker.0], Event::Start { .. }),
            "Trying to get range of an unfinished marker"
        );

        let mut depth = 0;
        let mut first: Option<TextRange> = None;
        let mut last: Option<TextRange> = None;
        for event in &self.events[marker.0 + 1..] {
            match event {
                Event::Start { .. } => depth += 1,
                Event::Token { range, .. } => {
                    first.get_or_insert(*range);
                    last = Some(*range);
                }
                Event::Finish if depth == 0 => break,
                Event::Finish => depth -= 1,
                Event::Pending => panic!("Pending marker is preceded by another marker"),
            }
        }

        first
            .expect("There are no empty nodes (they contain at least 1 token)")
            .cover(last.expect("Same as above"))
    }

    fn marker_kind(&self, marker: Marker) -> SyntaxKind {
        if marker.0 > self.events.len() - 1 {
            // Marker was dropped and it was the last element in the array
            return SyntaxKind::Unknown;
        }

        match self.events[marker.0] {
            // Not possible cases unless the system utilised in a wrong way
            Event::Finish | Event::Pending => {
                panic!("Trying to get the type of an unfinished marker")
            }
            // Either the marker was completed, or was dropped but previously
            // called .precede on which gives the resulting wrapping marker
            Event::Start { kind } => kind,
            // Marker was dropped but it wasn't the last element in the array
            Event::Token { .. } => SyntaxKind::Unknown,
        }
    }

    fn is_marker_valid(&self, marker: Marker) -> bool {
        self.marker_kind(marker) != SyntaxKind::Unknown
    }

    fn is_lhs_expression(&self, marker: Marker) -> bool {
        match self.marker_kind(marker) {
            SyntaxKind::Name
            | SyntaxKind::MemberAccessExpression
            | SyntaxKind::ElementAccessExpression
            | SyntaxKind::RootAccessExpression
            // The error is either already there or it's impossible to get the range
            | SyntaxKind::Unknown | SyntaxKind::Error => true,
            _ => false,
        }
    }

    // We don't care for range in most places
    fn token(&self) -> SyntaxKind {
        self.tokens[self.lookahead_index].kind
    }

    fn skip_trivia(&mut self) {
        self.has_preceding_new_line = false;
        loop {
            match self.token() {
                SyntaxKind::Whitespace | SyntaxKind::Unknown => {}
                SyntaxKind::LineFeed => {
                    self.has_preceding_new_line = true;
                    if self.preceding_comments_index.is_some() {
                        // If there's more than 1 new line in between
                        // - don't attach the comments to the next node
                        if self.has_new_line_after_comment {
                            self.preceding_comments_index = None;
                            self.has_new_line_after_comment = false;
                        } else {
                            self.has_new_line_after_comment = true;
                        }
                    }
                }
                SyntaxKind::LineComment | SyntaxKind::BlockComment | SyntaxKind::DocComment => {
                    if self.preceding_comments_index.is_none() {
                        self.preceding_comments_index = Some(self.lookahead_index);
                    }
                    self.has_new_line_after_comment = false;
                }
                _ => break,
            }

            self.lookahead_index += 1;
        }
    }

    fn bump(&mut self) {
        if self.token() == SyntaxKind::Eof {
            return;
        }
        self.prev_token = self.tokens[self.lookahead_index];
        self.lookahead_index += 1;
        self.reset_comments();
        self.consume_to_lookahead();
        self.skip_trivia();
    }

    fn at(&self, kind: SyntaxKind) -> bool {
        self.token() == kind
    }

    fn at_set(&self, set: TokenSet) -> bool {
        set.contains(self.token())
    }

    fn expected_but_got(&self, expected: &str) -> String {
        format!("Expected {}, but got {}", expected, self.token().text())
    }

    fn error(&mut self, error: SyntaxError) {
        if self
            .errors
            .last()
            .is_some_and(|last_err| last_err.range() == error.range())
        {
            return;
        }
        self.errors.push(error);
    }

    fn error_at_token(&mut self, message: String) {
        self.error(SyntaxError {
            range: self.tokens[self.lookahead_index].range,
            message,
        });
    }

    fn error_and_advance(&mut self, message: String) {
        self.error_at_token(message);
        if self.at(SyntaxKind::Eof) {
            return;
        }

        let m = self.start();
        self.bump();
        self.finish(m, SyntaxKind::Error);
    }

    /// Recovery set is just what we don't want to skip over
    fn error_with_recovery(&mut self, message: &str, recovery: TokenSet) {
        if self.at_set(TokenSet::ALWAYS_RECOVER) || self.at_set(recovery) {
            self.error_at_token(self.expected_but_got(message));
            return;
        }

        self.error_and_advance(self.expected_but_got(message));
    }

    fn try_bump(&mut self, kind: SyntaxKind) -> bool {
        if self.at(kind) {
            self.bump();
            true
        } else {
            false
        }
    }

    fn expect(&mut self, kind: SyntaxKind) -> bool {
        self.expect_with_message(kind, kind.text())
    }

    fn expect_with_message(&mut self, kind: SyntaxKind, message: &str) -> bool {
        if self.try_bump(kind) {
            return true;
        }

        self.error_at_token(self.expected_but_got(message));
        false
    }

    fn expect_or_panic(&mut self, kind: SyntaxKind) {
        assert!(self.at(kind));
        self.bump();
    }

    fn expect_set_or_panic(&mut self, expect_set: TokenSet) {
        assert!(self.at_set(expect_set));
        self.bump();
    }

    /// Example: `INIT_OPERATORS` = [=, :, <-, (==, <=, >=, <=>, +=, -=, *=, /=, %=)]
    /// There are recovery sets that contain possible tokens that user could've written
    /// Only 1 of those tokens is correct depending on what we're parsing
    /// The recovery strategy is to check whether we're at this sort of set and then
    /// pass the proper token into this function that will either proceed without errors
    /// or wrap the incorrect token into the error node and proceed as if we've read
    /// the correct operator. Note that some member can never be valid for any context
    /// (marked with () in the concrete example), these are included just to improve the
    /// recovery for common mistakes
    /// ```
    /// use sq_3_parser::ast::*;
    /// use sq_3_parser::*;
    /// let source = "local a = abc";
    ///
    /// let parse = Parse::new(source);
    /// assert!(parse.errors().is_empty());
    /// let source_file = parse.source_file();
    /// assert_eq!(source_file.statements().count(), 1);
    /// let stmt = source_file.statements().next().unwrap();
    /// let Stmt::LocalVariable(l) = stmt else {
    ///     panic!("Expected local variable")
    /// };
    ///
    /// assert_eq!(l.declarations().count(), 1);
    /// let decl = l.declarations().next().unwrap();
    /// assert!(decl.name().is_some());
    /// assert!(matches!(
    ///     decl.initialiser().unwrap().expression().unwrap(),
    ///     Expr::Name(_)
    /// ));
    /// ```
    ///
    /// ```
    /// use sq_3_parser::ast::*;
    /// use sq_3_parser::*;
    /// let source = "local a <- 123";
    ///
    /// let parse = Parse::new(source);
    /// assert_eq!(parse.errors().len(), 1);
    /// let source_file = parse.source_file();
    /// assert_eq!(source_file.statements().count(), 1);
    /// let stmt = source_file.statements().next().unwrap();
    /// let Stmt::LocalVariable(l) = stmt else {
    ///     panic!("Expected local variable")
    /// };
    ///
    /// assert_eq!(l.declarations().count(), 1);
    /// let decl = l.declarations().next().unwrap();
    /// assert!(decl.name().is_some());
    /// assert!(matches!(
    ///     decl.initialiser().unwrap().expression().unwrap(),
    ///     Expr::Literal(_)
    /// ));
    /// ```
    fn parse_proper_or_error(&mut self, proper: SyntaxKind, message: String) {
        if self.at(proper) {
            self.bump();
        } else {
            self.error_and_advance(message);
        }
    }

    fn parse_guaranteed_name(&mut self) -> Marker {
        let m = self.start();
        // "Rescan" soft keywords as identifiers
        self.tokens[self.lookahead_index].kind = SyntaxKind::Identifier;
        self.bump();
        self.finish(m, SyntaxKind::Name);
        m
    }

    fn parse_name(&mut self, message: &str, recovery: TokenSet) -> Option<Marker> {
        if self.at_set(TokenSet::NAME) {
            return Some(self.parse_guaranteed_name());
        }

        // Need this here since it's used by parse_expression
        assert!(
            self.fuel <= 100_000,
            "Most likely stuck in an infinite loop, number of attempts exceeded"
        );
        self.fuel += 1;

        if self.at(SyntaxKind::DecimalInteger) {
            // It would've been possible to make the identifier recovery where we have a
            // preceding number and identifier afterwards, but this can be valid syntax in
            // squirrel due to optionality of the commas. E.g. local abc = 0, a = [123abc]
            self.error_and_advance(format!(
                "{}. Digit cannot be the starting character of an identifier",
                self.expected_but_got(message),
            ));
        } else if self.at_set(TokenSet::KEYWORDS) && !self.has_preceding_new_line {
            self.error_and_advance(format!(
                "{}. {} is a reserved word that can't be used here",
                self.expected_but_got(message),
                self.token().text()
            ));
        } else {
            self.error_with_recovery(message, recovery);
        }
        None
    }

    // function func[this](a, b, c = 2) { stmts }
    //              ___________________
    fn parse_function_signature(&mut self) {
        let has_env = if self.at(SyntaxKind::OpenBracket) {
            let m = self.start();

            self.expect_or_panic(SyntaxKind::OpenBracket);
            self.parse_expression(TokenSet::STATEMENT_OR_CLOSE_BRACKET);
            self.expect(SyntaxKind::CloseBracket);
            self.finish(m, SyntaxKind::Environment);
            true
        } else {
            false
        };

        let m = self.start();
        if has_env {
            self.expect(SyntaxKind::OpenParenthesis);
        } else {
            self.expect_with_message(SyntaxKind::OpenParenthesis, "'(' or '['");
        }

        if !self.try_bump(SyntaxKind::CloseParenthesis) {
            loop {
                if self.at(SyntaxKind::DotDotDot) {
                    let m = self.start();
                    self.bump();
                    self.finish(m, SyntaxKind::VariedArgs);
                } else {
                    self.parse_variable_declaration(
                        VariableDeclaration::Parameter,
                        "parameter name or '...'",
                    );
                }

                if self.at(SyntaxKind::Eof) || self.at(SyntaxKind::CloseParenthesis) {
                    break;
                }

                if !self.try_bump(SyntaxKind::Comma) {
                    if self.at_set(TokenSet::STATEMENT_WITH_SEMICOLON)
                        || self.at(SyntaxKind::CloseBrace)
                    {
                        break;
                    }

                    self.error_with_recovery(
                        "',' between parameters",
                        TokenSet::PARAMETER_RECOVERY,
                    );
                }
            }
            self.expect(SyntaxKind::CloseParenthesis);
        }
        self.finish(m, SyntaxKind::ParameterList);
    }

    // abc(1, 2, 3) {a = 2}
    //    _________________
    fn parse_call_arguments(&mut self) {
        if self.expect(SyntaxKind::OpenParenthesis) {
            while !self.at_set(TokenSet::CALL_ARGUMENTS_STOP) {
                self.parse_expression(TokenSet::STATEMENT_OR_CLOSE_PARENTHESIS);
                if !self.at_set(TokenSet::SEPARATORS) {
                    continue;
                }

                self.parse_proper_or_error(
                    SyntaxKind::Comma,
                    "Expected ',' between arguments".to_owned(),
                );
                if self.at(SyntaxKind::CloseParenthesis) {
                    self.error_at_token(format!(
                        "{} (trailing comma is not allowed here)",
                        self.expected_but_got("expression")
                    ));
                    break;
                }
            }
            self.expect(SyntaxKind::CloseParenthesis);
        }

        if !self.at(SyntaxKind::OpenBrace) {
            return;
        }

        // This construct is so useless yet it breaks the case where used has forgot to
        // write 'function' keyword
        // function abc(){local a = 2}
        // abc(){local a = 2}
        let m = self.start();
        self.expect_or_panic(SyntaxKind::OpenBrace);
        // This a function declaration with no 'function' keyword before hand
        // if !self.at_set(MEMBER_FIRST) && self.at_set(STATEMENT) {
        //     while !self.at_set(END_OF_BLOCK) {
        //         self.parse_statement(/* parse_end */ true);
        //     }
        //     self.expect(SyntaxKind::CloseBrace);
        //     self.finish(m, SyntaxKind::BlockStatement);
        //     return false;
        // }

        let save_separator = self.object_separator;
        self.object_separator = ParsingObjectSeparator::Comma;
        while !self.at(SyntaxKind::CloseBrace) && !self.at(SyntaxKind::Eof) {
            self.parse_member(MemberObject::PostCallInitialiser);

            if self.at_set(TokenSet::SEPARATORS) {
                self.parse_proper_or_error(
                    SyntaxKind::Comma,
                    "Expected ',' between members in the post-call initialiser".to_owned(),
                );
            }
        }
        self.object_separator = save_separator;
        self.expect(SyntaxKind::CloseBrace);
        self.finish(m, SyntaxKind::PostCallInitialiser);
    }

    // class a { </ a = 2, b = 3, d = "12321"/> }
    //           ______________________________
    fn parse_attributes(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::LessThanSlash);
        while !self.at(SyntaxKind::SlashGreaterThan)
            && !self.at(SyntaxKind::CloseBrace)
            && !self.at(SyntaxKind::Eof)
        {
            self.parse_member(MemberObject::Table);

            if self.at_set(TokenSet::SEPARATORS) {
                self.parse_proper_or_error(
                    SyntaxKind::Comma,
                    "Expected ',' between members in the attributes".to_owned(),
                );
            }
        }
        self.expect(SyntaxKind::SlashGreaterThan);
        self.finish(m, SyntaxKind::Attributes);
    }

    // class a {a = 2; d = 4; [12312] = 2; static function abc(){}})
    //          __________________________________________________
    // enum a { b, c, d = 2 }
    //          ___________
    // local a = { "12321": 1, b = 2 [12] = 5}
    //             __________________________
    // abc(1, 2, 3) {a = 2, b = 4, [14] = 2}
    //               ______________________
    fn parse_member(&mut self, object_kind: MemberObject) -> Marker {
        let m = self.start();

        let has_prefix_construct = if self.at(SyntaxKind::StaticKeyword) {
            if object_kind == MemberObject::Class {
                self.bump();
            } else {
                self.error_and_advance("Static is only allowed in class declarations".to_owned());
            }
            true
        } else if self.at(SyntaxKind::LessThanSlash) {
            if object_kind != MemberObject::Class {
                self.error_at_token("Attributes are only allowed in class declarations".to_owned());
            }
            self.parse_attributes();
            true
        } else {
            false
        };

        match self.token() {
            SyntaxKind::OpenBracket => {
                if object_kind == MemberObject::Enum {
                    self.error_at_token(
                        "Computed property name is not allowed in the enum".to_owned(),
                    );
                }

                let name = self.start();
                self.expect_or_panic(SyntaxKind::OpenBracket);
                self.parse_comma_expression(TokenSet::STATEMENT_OR_CLOSE_BRACKET);
                self.expect(SyntaxKind::CloseBracket);
                self.finish(name, SyntaxKind::ComputedName);

                if self.at_set(TokenSet::INIT_OPERATORS) {
                    self.parse_proper_or_error(
                        SyntaxKind::Equals,
                        "Expected '=' for initialisation".to_owned(),
                    );
                    self.parse_expression(TokenSet::STATEMENT_OR_ATTRIBUTE);
                } else if object_kind != MemberObject::Enum {
                    self.error_at_token(self.expected_but_got("'='"));
                    if !self.has_preceding_new_line && self.at_set(TokenSet::EXPRESSIONS) {
                        self.parse_expression(TokenSet::STATEMENT_OR_ATTRIBUTE);
                    }
                }
                self.finish(m, SyntaxKind::Property);
            }
            SyntaxKind::String | SyntaxKind::VerbatimString => {
                if object_kind != MemberObject::Table {
                    self.error_at_token(
                        "String property names are only allowed in tables / attributes".to_owned(),
                    );
                }

                let name = self.start();
                self.bump();
                self.finish(name, SyntaxKind::StringName);

                if self.at_set(TokenSet::INIT_OPERATORS) {
                    self.parse_proper_or_error(
                        SyntaxKind::Colon,
                        "Expected ':' for initialisation".to_owned(),
                    );
                    self.parse_expression(TokenSet::STATEMENT_OR_ATTRIBUTE);
                } else if object_kind != MemberObject::Enum {
                    self.error_at_token(self.expected_but_got("':'"));
                    if !self.has_preceding_new_line && self.at_set(TokenSet::EXPRESSIONS) {
                        self.parse_expression(TokenSet::STATEMENT_OR_ATTRIBUTE);
                    }
                }
                self.finish(m, SyntaxKind::Property);
            }
            SyntaxKind::ConstructorKeyword => {
                if matches!(
                    object_kind,
                    MemberObject::Enum | MemberObject::PostCallInitialiser
                ) {
                    self.error_at_token(
                        "Constructors are only allowed in tables / classes / attributes".to_owned(),
                    );
                }

                self.bump();
                if self.at_set(TokenSet::INIT_OPERATORS) {
                    self.error_at_token("Expected '(' or '[', 'constructor' cannot be used as a plain property name here".to_owned());
                    self.parse_property_init(m, object_kind, None);
                } else {
                    self.parse_function_signature();
                    self.parse_statement(ParseStatement::MethodBody);
                    self.finish(m, SyntaxKind::Constructor);
                }
            }
            SyntaxKind::FunctionKeyword => {
                if matches!(
                    object_kind,
                    MemberObject::Enum | MemberObject::PostCallInitialiser
                ) {
                    self.error_at_token(
                        "Methods are only allowed in tables / classes / attributes".to_owned(),
                    );
                }
                self.bump();

                self.parse_name("method's name", TokenSet::EVERYTHING);
                self.parse_function_signature();
                self.parse_statement(ParseStatement::MethodBody);
                self.finish(m, SyntaxKind::Method);
            }
            _ => self.parse_simple_name_property(m, object_kind, has_prefix_construct),
        }
        m
    }

    fn parse_simple_name_property(
        &mut self,
        m: Marker,
        object_kind: MemberObject,
        has_prefix_construct: bool,
    ) {
        let name_range = if let Some(name) = self.parse_name(
            match object_kind {
                MemberObject::Table => "property, 'constructor' or 'function'",
                MemberObject::Class if has_prefix_construct => {
                    "property, 'constructor' or 'function'"
                }
                MemberObject::Class => {
                    "'static', '</' or/and property, 'constructor' or 'function'"
                }
                MemberObject::Enum | MemberObject::PostCallInitialiser => "property",
            },
            TokenSet::MEMBER_RECOVERY,
        ) {
            self.precede(name);
            self.finish(name, SyntaxKind::SimpleName);
            Some(self.marker_range(name))
        } else {
            if !self.at_set(TokenSet::MEMBER_RECOVERY) {
                self.drop(m);
                return;
            }
            None
        };

        self.parse_property_init(m, object_kind, name_range);
    }

    fn parse_property_init(
        &mut self,
        m: Marker,
        object_kind: MemberObject,
        name_range: Option<TextRange>,
    ) {
        if self.at_set(TokenSet::INIT_OPERATORS) {
            self.parse_proper_or_error(
                SyntaxKind::Equals,
                "Expected '=' for initialisation".to_owned(),
            );
            self.parse_expression(TokenSet::STATEMENT_OR_ATTRIBUTE);
        } else if object_kind == MemberObject::Enum {
            // For enums '=' is optional, however if we see an
            // expression we parse it as if '=' is missing
            if self.at_set(TokenSet::NON_MEMBER_FIRST_EXPRESSIONS) {
                self.error_at_token(self.expected_but_got("'='"));
                // recovery is unreachable
                self.parse_expression(TokenSet::STATEMENT);
            }
        } else {
            // method() {} recovery
            if self.at(SyntaxKind::OpenParenthesis) {
                if let Some(range) = name_range {
                    self.error(SyntaxError {
                        message: "Method name needs to be prepended with 'function' keyword"
                            .to_owned(),
                        range,
                    });
                } else {
                    self.error_at_token("Method needs to be prepended with a name".to_owned());
                }
                self.parse_function_signature();
                self.parse_statement(ParseStatement::MethodBody);
                self.finish(m, SyntaxKind::Method);
                return;
            }

            self.error_at_token(self.expected_but_got("'='"));
            if self.at_set(TokenSet::NON_MEMBER_FIRST_EXPRESSIONS) {
                // recovery is unreachable
                self.parse_expression(TokenSet::STATEMENT);
            }
        }
        self.finish(m, SyntaxKind::Property);
    }

    // class a extends b { a = 3 ; d = 4; function abc(){} }
    //         _____________________________________________
    fn parse_class_body(&mut self) {
        let message = if self.at(SyntaxKind::ExtendsKeyword) {
            let m = self.start();
            self.bump();
            self.parse_expression(TokenSet::STATEMENT);
            self.finish(m, SyntaxKind::Extends);
            "'{'"
        } else {
            "'extends' or '{'"
        };

        if !self.expect_with_message(SyntaxKind::OpenBrace, message) {
            return;
        }

        let save_separator = self.object_separator;
        self.object_separator = ParsingObjectSeparator::Semicolon;
        while !self.at(SyntaxKind::CloseBrace) && !self.at(SyntaxKind::Eof) {
            self.parse_member(MemberObject::Class);

            if self.at_set(TokenSet::SEPARATORS) {
                self.parse_proper_or_error(
                    SyntaxKind::Semicolon,
                    "Expected ';' between members in the class".to_owned(),
                );
            }
        }
        self.object_separator = save_separator;
        self.expect(SyntaxKind::CloseBrace);
    }

    // 1, 2, 3, 4, [], {}, 6
    fn parse_comma_expression(&mut self, recovery: TokenSet) -> Marker {
        let m = self.start_without_comment_attachment();
        self.parse_expression(recovery);
        while self.try_bump(SyntaxKind::Comma) {
            self.parse_expression(recovery);
            self.finish(m, SyntaxKind::BinaryExpression);
            self.precede(m);
        }
        self.drop(m);
        m
    }

    // abc
    // 1 + 2
    // abc = 12 - 4112
    // a ? b : c
    fn parse_expression(&mut self, recovery: TokenSet) -> Marker {
        let m = self.start_without_comment_attachment();
        let lhs = self.parse_binary_expression(BinaryOperatorPrecedence::Lowest, recovery);
        if self.at_set(TokenSet::ASSIGNMENT_OPERATORS) {
            if !self.is_lhs_expression(lhs) {
                self.error(SyntaxError {
                    message: "The left-hand side of an assignment expression must be a variable or a property access".to_owned(),
                    range: self.marker_range(lhs),
                });
            }
            self.expect_set_or_panic(TokenSet::ASSIGNMENT_OPERATORS);
            self.parse_expression(recovery);
            self.finish(m, SyntaxKind::BinaryExpression);
        } else if self.at(SyntaxKind::Question) {
            self.parse_conditional_expression(m);
        } else {
            self.drop(m);
        }
        m
    }

    fn finish_wrapper_or_drop(&mut self, wrapper: Marker, inner: Marker, kind: SyntaxKind) -> bool {
        if self.is_marker_valid(inner) {
            self.finish(wrapper, kind);
            true
        } else {
            self.drop(wrapper);
            false
        }
    }

    fn parse_conditional_expression(&mut self, m: Marker) {
        self.expect_or_panic(SyntaxKind::Question);

        let then = self.start();
        let expr = self.parse_expression(TokenSet::STATEMENT_OR_COLON);
        self.finish_wrapper_or_drop(then, expr, SyntaxKind::ThenBranch);

        if self.expect(SyntaxKind::Colon) || self.at_set(TokenSet::EXPRESSIONS) {
            let else_ = self.start();
            let expr = self.parse_expression(TokenSet::STATEMENT);
            self.finish_wrapper_or_drop(else_, expr, SyntaxKind::ElseBranch);
        }

        self.finish(m, SyntaxKind::ConditionalExpression);
    }

    // 1 + 2
    // abc() * 12312 + 2 - 124
    fn parse_binary_expression(
        &mut self,
        precedence: BinaryOperatorPrecedence,
        recovery: TokenSet,
    ) -> Marker {
        let m = self.start();
        self.parse_prefix_expression(recovery);
        while let Some(new_precedence) = BinaryOperatorPrecedence::from(self.token()) {
            if new_precedence <= precedence {
                break;
            }

            self.expect_set_or_panic(TokenSet::BINARY_OPERATORS);

            self.parse_binary_expression(new_precedence, recovery);

            self.finish(m, SyntaxKind::BinaryExpression);
            self.precede(m);
        }
        self.drop(m);

        m
    }

    // -213
    // ~512
    // ++5123
    // delete a
    fn parse_prefix_expression(&mut self, recovery: TokenSet) -> Marker {
        match self.token() {
            SyntaxKind::Minus | SyntaxKind::Tilde | SyntaxKind::Exclamation => {
                self.parse_prefix_unary_expression(recovery)
            }
            SyntaxKind::Plus => {
                self.error_and_advance("Leading plus is not supported".to_owned());
                self.parse_prefix_expression(recovery)
            }
            SyntaxKind::PlusPlus | SyntaxKind::MinusMinus => {
                self.parse_prefix_update_expression(recovery)
            }
            SyntaxKind::DeleteKeyword => self.parse_delete_expression(recovery),
            SyntaxKind::TypeOfKeyword => self.parse_type_of_expression(recovery),
            SyntaxKind::ResumeKeyword => self.parse_resume_expression(recovery),
            SyntaxKind::CloneKeyword => self.parse_clone_expression(recovery),
            SyntaxKind::RawCallKeyword => self.parse_raw_call_expression(),
            _ => self.parse_postfix_expression(recovery),
        }
    }

    fn parse_prefix_unary_expression(&mut self, recovery: TokenSet) -> Marker {
        let m = self.start();
        self.expect_set_or_panic(TokenSet::PREFIX_UNARY_OPERATORS);
        self.parse_prefix_expression(recovery);
        self.finish(m, SyntaxKind::PrefixUnaryExpression);
        m
    }

    fn parse_prefix_update_expression(&mut self, recovery: TokenSet) -> Marker {
        let m = self.start();
        self.expect_set_or_panic(TokenSet::UPDATE_OPERATORS);
        let operand = self.parse_prefix_expression(recovery);
        if !self.is_lhs_expression(operand) {
            self.error(SyntaxError {
                message: "The operand of an increment or decrement operator must be a variable or a property access".to_owned(),
                range: self.marker_range(operand),
            });
        }
        self.finish(m, SyntaxKind::PrefixUpdateExpression);
        m
    }

    fn parse_delete_expression(&mut self, recovery: TokenSet) -> Marker {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::DeleteKeyword);
        let operand = self.parse_prefix_expression(recovery);
        if !self.is_lhs_expression(operand) {
            self.error(SyntaxError {
                range: self.marker_range(operand),
                message: "The right-hand side of a delete expression must be a variable or a property access".to_owned()
            });
        }
        self.finish(m, SyntaxKind::DeleteExpression);
        m
    }

    fn parse_type_of_expression(&mut self, recovery: TokenSet) -> Marker {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::TypeOfKeyword);
        self.parse_prefix_expression(recovery);
        self.finish(m, SyntaxKind::TypeOfExpression);
        m
    }

    fn parse_resume_expression(&mut self, recovery: TokenSet) -> Marker {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::ResumeKeyword);
        self.parse_prefix_expression(recovery);
        self.finish(m, SyntaxKind::ResumeExpression);
        m
    }

    fn parse_clone_expression(&mut self, recovery: TokenSet) -> Marker {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::CloneKeyword);
        self.parse_prefix_expression(recovery);
        self.finish(m, SyntaxKind::CloneExpression);
        m
    }

    fn parse_raw_call_expression(&mut self) -> Marker {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::RawCallKeyword);
        self.parse_call_arguments();
        self.finish(m, SyntaxKind::RawCallExpression);
        m
    }

    // abc().a[123]
    // b++
    fn parse_postfix_expression(&mut self, recovery: TokenSet) -> Marker {
        let m = self.start();

        let save_separator = self.object_separator;
        self.object_separator = ParsingObjectSeparator::None;
        let operand = self.parse_primary_expression(recovery);
        self.object_separator = save_separator;

        loop {
            match self.token() {
                SyntaxKind::PlusPlus | SyntaxKind::MinusMinus => {
                    if self.can_parse_end_of_statement() {
                        break;
                    }
                    if !self.is_lhs_expression(operand) {
                        self.error(SyntaxError {
                            message: "The operand of an increment or decrement operator must be a variable or a property access".to_owned(),
                            range: self.marker_range(operand),
                        });
                    }
                    self.parse_postfix_update_expression(m);
                }
                // Recovery for the case where user has written :: to access a member
                SyntaxKind::ColonColon if !self.can_parse_end_of_statement() => {
                    self.parse_member_access_expression(m);
                }
                SyntaxKind::Dot => self.parse_member_access_expression(m),
                SyntaxKind::OpenBracket => self.parse_element_access_expression(m),
                SyntaxKind::OpenParenthesis => self.parse_call_expression(m),
                _ => break,
            }
            self.precede(m);
        }
        self.drop(m);
        m
    }

    fn parse_postfix_update_expression(&mut self, m: Marker) {
        self.expect_set_or_panic(TokenSet::UPDATE_OPERATORS);
        self.finish(m, SyntaxKind::PostfixUpdateExpression);
    }

    fn parse_member_access_expression(&mut self, m: Marker) {
        self.parse_proper_or_error(SyntaxKind::Dot, "Expected '.' for member access".to_owned());

        let member = self.start();
        self.parse_name("member's name", TokenSet::EVERYTHING);
        self.finish(member, SyntaxKind::MemberPart);

        self.finish(m, SyntaxKind::MemberAccessExpression);
    }

    fn parse_element_access_expression(&mut self, m: Marker) {
        if self.has_preceding_new_line {
            let start = self.prev_token.range.end();
            let end = start + TextSize::new(1);
            self.error(SyntaxError {
                message: match self.object_separator {
                    ParsingObjectSeparator::None => {
                        "A line break is not allowed before element access"
                    }
                    ParsingObjectSeparator::Comma => {
                        "Comma is needed before `[...]` property declaration."
                    }
                    ParsingObjectSeparator::Semicolon => {
                        "Semicolon is needed before `[...]` property declaration."
                    }
                }
                .to_owned(),
                range: TextRange::new(start, end),
            });
        }
        let index = self.start();
        self.expect_or_panic(SyntaxKind::OpenBracket);
        self.parse_expression(TokenSet::STATEMENT_OR_CLOSE_BRACKET);
        self.expect(SyntaxKind::CloseBracket);
        self.finish(index, SyntaxKind::Index);
        self.finish(m, SyntaxKind::ElementAccessExpression);
    }

    // abc() { a = 12, b = 3 }
    fn parse_call_expression(&mut self, m: Marker) {
        assert_eq!(self.token(), SyntaxKind::OpenParenthesis);
        self.finish(m, SyntaxKind::Callee);

        self.precede(m);
        self.parse_call_arguments();
        self.finish(m, SyntaxKind::CallExpression);
    }

    // 12321
    // ::abc
    // (function (){})
    fn parse_primary_expression(&mut self, recovery: TokenSet) -> Marker {
        match self.token() {
            SyntaxKind::NullKeyword
            | SyntaxKind::TrueKeyword
            | SyntaxKind::FalseKeyword
            | SyntaxKind::String
            | SyntaxKind::VerbatimString
            | SyntaxKind::DecimalInteger
            | SyntaxKind::OctalInteger
            | SyntaxKind::HexInteger
            | SyntaxKind::Character
            | SyntaxKind::Float => self.parse_literal_expression(),

            SyntaxKind::ColonColon => self.parse_root_access_expression(),
            SyntaxKind::ThisKeyword => self.parse_this_expression(),
            SyntaxKind::BaseKeyword => self.parse_base_expression(),
            SyntaxKind::FileKeyword => self.parse_file_expression(),
            SyntaxKind::LineKeyword => self.parse_line_expression(),
            SyntaxKind::OpenParenthesis => self.parse_parenthesised_expression(),
            SyntaxKind::OpenBracket => self.parse_array_literal_expression(),
            SyntaxKind::OpenBrace => self.parse_table_literal_expression(),
            SyntaxKind::FunctionKeyword => self.parse_function_expression(),
            SyntaxKind::At => self.parse_lambda_expression(),
            SyntaxKind::ClassKeyword => self.parse_class_expression(),
            _ => self
                .parse_name("expression", recovery)
                .unwrap_or_else(|| self.invalid_marker()),
        }
    }

    fn parse_literal_expression(&mut self) -> Marker {
        let m = self.start();
        self.bump();
        self.finish(m, SyntaxKind::LiteralExpression);
        m
    }

    fn parse_root_access_expression(&mut self) -> Marker {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::ColonColon);
        self.parse_name("root variable's name", TokenSet::EVERYTHING);
        self.finish(m, SyntaxKind::RootAccessExpression);
        m
    }

    fn parse_this_expression(&mut self) -> Marker {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::ThisKeyword);
        self.finish(m, SyntaxKind::ThisExpression);
        m
    }

    fn parse_base_expression(&mut self) -> Marker {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::BaseKeyword);
        self.finish(m, SyntaxKind::BaseExpression);
        m
    }

    fn parse_file_expression(&mut self) -> Marker {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::FileKeyword);
        self.finish(m, SyntaxKind::FileExpression);
        m
    }

    fn parse_line_expression(&mut self) -> Marker {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::LineKeyword);
        self.finish(m, SyntaxKind::LineExpression);
        m
    }

    fn parse_parenthesised_expression(&mut self) -> Marker {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::OpenParenthesis);
        self.parse_comma_expression(TokenSet::STATEMENT_OR_CLOSE_PARENTHESIS);
        self.expect(SyntaxKind::CloseParenthesis);
        self.finish(m, SyntaxKind::ParenthesisedExpression);
        m
    }

    fn parse_array_literal_expression(&mut self) -> Marker {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::OpenBracket);
        while !self.at(SyntaxKind::CloseBracket)
            && !self.at(SyntaxKind::Eof)
            && !self.at_set(TokenSet::NON_EXPRESSION_STATEMENT)
        {
            self.parse_expression(TokenSet::NON_EXPRESSION_STATEMENT);
            if self.at_set(TokenSet::SEPARATORS) {
                self.parse_proper_or_error(
                    SyntaxKind::Comma,
                    "Expected ',' between elements".to_owned(),
                );
            }
        }
        self.expect(SyntaxKind::CloseBracket);
        self.finish(m, SyntaxKind::ArrayLiteralExpression);
        m
    }

    // {a = 2, b = 3, d = 5, function abc(){}}
    fn parse_table_literal_expression(&mut self) -> Marker {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::OpenBrace);

        let save_separator = self.object_separator;
        self.object_separator = ParsingObjectSeparator::Comma;
        while !self.at(SyntaxKind::CloseBrace) && !self.at(SyntaxKind::Eof) {
            self.parse_member(MemberObject::Table);

            if self.at_set(TokenSet::SEPARATORS) {
                self.parse_proper_or_error(
                    SyntaxKind::Comma,
                    "Expected ',' between members in the table".to_owned(),
                );
            }
        }
        self.object_separator = save_separator;

        self.expect(SyntaxKind::CloseBrace);
        self.finish(m, SyntaxKind::TableLiteralExpression);
        m
    }

    // (function() {return a + b})
    fn parse_function_expression(&mut self) -> Marker {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::FunctionKeyword);
        if self.at_set(TokenSet::NAME) {
            self.error_and_advance("Function expression must have no name".to_owned());
        }

        self.parse_function_signature();
        self.parse_statement(ParseStatement::MethodBody);

        self.finish(m, SyntaxKind::FunctionExpression);
        m
    }

    // @() a + b
    fn parse_lambda_expression(&mut self) -> Marker {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::At);

        self.parse_function_signature();
        self.parse_expression(TokenSet::STATEMENT);

        self.finish(m, SyntaxKind::LambdaExpression);
        m
    }

    // (class extends a {ads = null;})
    fn parse_class_expression(&mut self) -> Marker {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::ClassKeyword);
        self.parse_class_body();
        self.finish(m, SyntaxKind::ClassExpression);
        m
    }

    fn can_parse_end_of_statement(&self) -> bool {
        self.at_set(TokenSet::END_OF_STATEMENT) || self.has_preceding_new_line
    }

    fn parse_end_of_statement(&mut self) {
        if self.at(SyntaxKind::Semicolon) {
            self.bump();
            return;
        }

        if !self.can_parse_end_of_statement() {
            let start = self.prev_token.range.end();
            let end = start + TextSize::new(1);
            self.error(SyntaxError {
                message:
                    "End of statement expected (use ';' to separate statements on the same line)"
                        .to_owned(),
                range: TextRange::new(start, end),
            });
        }
    }

    fn parse_statement(&mut self, kind: ParseStatement) -> bool {
        // (set, should_error)
        let stop = match kind {
            ParseStatement::MethodBody => (TokenSet::END_OF_METHOD, true),
            ParseStatement::FunctionBody | ParseStatement::StatementBody { .. } => {
                (TokenSet::END_OF_BLOCK, true)
            }
            // These are processed in a loop
            // we don't error since containing 0 statements is valid and set should
            // match at least once to stop the iteration
            ParseStatement::BlockStatements => (TokenSet::END_OF_BLOCK, false),
            ParseStatement::CaseStatements => (TokenSet::END_OF_CASE_CLAUSE, false),
            ParseStatement::TopStatements => (TokenSet::END_OF_FILE, false),
        };

        loop {
            if self.at_set(stop.0) {
                if stop.1 {
                    self.error_at_token(self.expected_but_got("statement"));
                }
                return false;
            }

            if self.at_set(TokenSet::STATEMENT_OR_EXPRESSION) {
                break;
            }

            if self.at(SyntaxKind::CatchKeyword) {
                self.error_at_token("'catch' must be prepended with 'try' block".to_owned());
                let m = self.start();
                self.parse_catch_clause();
                self.finish(m, SyntaxKind::TryStatement);
                return true;
            }

            if self.at(SyntaxKind::ElseKeyword) {
                self.error_and_advance("'else' must be prepended with 'if' block".to_owned());
                // else { } can just be parsed as a block statement
                continue;
            }

            self.error_and_advance(self.expected_but_got("statement"));
        }

        match self.token() {
            SyntaxKind::Semicolon => self.parse_empty_statement(),
            SyntaxKind::OpenBrace => self.parse_block_statement(),
            SyntaxKind::IfKeyword => self.parse_if_statement(),
            SyntaxKind::WhileKeyword => self.parse_while_statement(),
            SyntaxKind::DoKeyword => self.parse_do_statement(),
            SyntaxKind::ForKeyword => self.parse_for_statement(),
            SyntaxKind::ForEachKeyword => self.parse_for_each_statement(),
            SyntaxKind::SwitchKeyword => self.parse_switch_statement(),
            SyntaxKind::LocalKeyword => self.parse_local_statement(),
            SyntaxKind::ConstKeyword => self.parse_const_statement(),
            SyntaxKind::ReturnKeyword => self.parse_return_statement(),
            SyntaxKind::YieldKeyword => self.parse_yield_statement(),
            SyntaxKind::ContinueKeyword => self.parse_continue_statement(),
            SyntaxKind::BreakKeyword => self.parse_break_statement(),
            SyntaxKind::FunctionKeyword => self.parse_function_statement(),
            SyntaxKind::ClassKeyword => self.parse_class_statement(),
            SyntaxKind::EnumKeyword => self.parse_enum_statement(),
            SyntaxKind::TryKeyword => self.parse_try_statement(),
            SyntaxKind::ThrowKeyword => self.parse_throw_statement(),
            _ => self.parse_expression_statement(),
        }

        let parse_end = matches!(
            kind,
            ParseStatement::BlockStatements
                | ParseStatement::StatementBody { parse_end: true }
                | ParseStatement::CaseStatements
                | ParseStatement::TopStatements
        );

        if parse_end && !TokenSet::END_OF_STATEMENT.contains(self.prev_token.kind) {
            self.parse_end_of_statement();
        }

        true
    }
    // ;
    fn parse_empty_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::Semicolon);
        self.finish(m, SyntaxKind::EmptyStatement);
    }

    // { local a = 2; b = 3; function abc(){} }
    fn parse_block_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::OpenBrace);
        while self.parse_statement(ParseStatement::BlockStatements) {}
        self.expect(SyntaxKind::CloseBrace);
        self.finish(m, SyntaxKind::BlockStatement);
    }

    /// Parsing end of the statement here is not an oversight, this
    /// is to mirror the compiler behaviour. Why does the compiler
    /// do it? Because it's a squirrel language
    /// Consider the follwing:
    /// ```
    /// use sq_3_parser::ast::*;
    /// use sq_3_parser::*;
    /// let source = "local a = {function a() if (0) 0;}";
    ///
    /// let parse = Parse::new(source);
    /// assert!(parse.errors().is_empty());
    /// ```
    /// This compiles fine without errors since semicolon in parsed by the if statement,
    ///
    ///
    /// Same for else
    /// local a = {function `a()` if (0) 0; else 0;}
    /// ```
    /// use sq_3_parser::ast::*;
    /// use sq_3_parser::*;
    /// let source = "local a = {function a() if (0) 0; else 0;}";
    ///
    /// let parse = Parse::new(source);
    /// assert!(parse.errors().is_empty());
    /// ```
    ///
    /// However this
    /// ```
    /// use sq_3_parser::ast::*;
    /// use sq_3_parser::*;
    /// let source = "local a = {function a() while (0) 0;}";
    ///
    /// let parse = Parse::new(source);
    /// assert!(!parse.errors().is_empty());
    /// ```
    /// Gives a compiler error since the semicolon is not parsed by the while statement
    /// Normally only `parse_source_file` or `parse_block_statement` should use `parse_end`,
    /// But it's squirrel so what can you do
    fn parse_if_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::IfKeyword);
        self.expect(SyntaxKind::OpenParenthesis);
        self.parse_comma_expression(TokenSet::STATEMENT_OR_CLOSE_PARENTHESIS);
        self.expect(SyntaxKind::CloseParenthesis);

        if !self.parse_statement(ParseStatement::StatementBody { parse_end: true }) {
            self.finish(m, SyntaxKind::IfStatement);
            return;
        }

        if self.at(SyntaxKind::ElseKeyword) {
            let m = self.start();
            self.bump();
            self.parse_statement(ParseStatement::StatementBody { parse_end: true });
            self.finish(m, SyntaxKind::IfElseBranch);
        }
        self.finish(m, SyntaxKind::IfStatement);
    }

    // while (a) { a++ }
    fn parse_while_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::WhileKeyword);
        self.expect(SyntaxKind::OpenParenthesis);
        self.parse_comma_expression(TokenSet::STATEMENT_OR_CLOSE_PARENTHESIS);
        self.expect(SyntaxKind::CloseParenthesis);

        self.parse_statement(ParseStatement::StatementBody { parse_end: false });

        self.finish(m, SyntaxKind::WhileStatement);
    }

    // do { stuff } while (a--)
    fn parse_do_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::DoKeyword);

        if !self.parse_statement(ParseStatement::StatementBody { parse_end: false }) {
            self.finish(m, SyntaxKind::DoWhileStatement);
            return;
        }

        self.expect(SyntaxKind::WhileKeyword);
        self.expect(SyntaxKind::OpenParenthesis);
        self.parse_comma_expression(TokenSet::STATEMENT_OR_CLOSE_PARENTHESIS);
        self.expect(SyntaxKind::CloseParenthesis);

        self.finish(m, SyntaxKind::DoWhileStatement);
    }

    // for (local function a(){}; a != null; i++) { break }
    fn parse_for_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::ForKeyword);

        // Also parses '('
        self.parse_for_initialiser();
        self.parse_for_condition();
        // Also parses ')'
        self.parse_for_increment();

        self.parse_statement(ParseStatement::StatementBody { parse_end: false });

        self.finish(m, SyntaxKind::ForStatement);
    }

    fn parse_for_initialiser(&mut self) {
        self.expect(SyntaxKind::OpenParenthesis);
        if self.try_bump(SyntaxKind::Semicolon) {
            return;
        }

        let m = self.start();
        if self.at(SyntaxKind::LocalKeyword) {
            self.parse_local_statement();
        } else if self.at_set(TokenSet::EXPRESSIONS) {
            // Guaranteed to parse
            self.parse_comma_expression(TokenSet::STATEMENT);
        } else {
            self.error_with_recovery(
                "expression, 'local' or ';'",
                TokenSet::STATEMENT_OR_CLOSE_PARENTHESIS,
            );
            self.drop(m);
            return;
        }

        self.finish(m, SyntaxKind::ForInitialiser);
        self.expect(SyntaxKind::Semicolon);
    }

    fn parse_for_condition(&mut self) {
        if !self.try_bump(SyntaxKind::Semicolon) {
            if self.at_set(TokenSet::EXPRESSIONS) {
                let m = self.start();
                self.parse_comma_expression(TokenSet::STATEMENT);
                self.finish(m, SyntaxKind::ForCondition);
                self.expect(SyntaxKind::Semicolon);
            } else {
                self.error_with_recovery(
                    "expression or ';'",
                    TokenSet::STATEMENT_OR_CLOSE_PARENTHESIS,
                );
            }
        }
    }

    fn parse_for_increment(&mut self) {
        if !self.try_bump(SyntaxKind::CloseParenthesis) {
            if self.at_set(TokenSet::EXPRESSIONS) {
                let m = self.start();
                self.parse_comma_expression(TokenSet::STATEMENT);
                self.finish(m, SyntaxKind::ForIncrement);
                self.expect(SyntaxKind::CloseParenthesis);
            } else {
                self.error_with_recovery("expression or ')'", TokenSet::STATEMENT);
            }
        }
    }

    // foreach (v in array) { continue }
    // foreach (k, v in table) { letsgo++ }
    fn parse_for_each_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::ForEachKeyword);

        self.expect(SyntaxKind::OpenParenthesis);

        let key_or_value = self.start();
        let key_or_value_name =
            self.parse_name("key's or value's name", TokenSet::FOREACH_RECOVERY);

        if self.at_set(TokenSet::SEPARATORS) {
            if key_or_value_name.is_some() {
                self.finish(key_or_value, SyntaxKind::ForeachKey);
            } else {
                self.drop(key_or_value);
            }

            self.parse_proper_or_error(
                SyntaxKind::Comma,
                "Expected ',' to separate key and value".to_owned(),
            );

            let value = self.start();
            let value_name = self.parse_name("value's name", TokenSet::FOREACH_RECOVERY);
            if value_name.is_some() {
                self.finish(value, SyntaxKind::ForeachValue);
            } else {
                self.drop(value);
            }

            self.expect(SyntaxKind::InKeyword);
            // foreach (k v in ...)
        } else if self.at_set(TokenSet::NAME) {
            if key_or_value_name.is_some() {
                self.finish(key_or_value, SyntaxKind::ForeachKey);
            } else {
                self.drop(key_or_value);
            }

            self.error_at_token("Expected ',' to separate key and value".to_owned());
            let value = self.start();
            self.parse_guaranteed_name();
            self.finish(value, SyntaxKind::ForeachValue);

            self.expect(SyntaxKind::InKeyword);
        } else {
            if key_or_value_name.is_some() {
                self.finish(key_or_value, SyntaxKind::ForeachValue);
            } else {
                self.drop(key_or_value);
            }

            self.expect_with_message(SyntaxKind::InKeyword, "',' or 'in'");
        }

        self.parse_expression(TokenSet::STATEMENT_OR_CLOSE_PARENTHESIS);
        self.expect(SyntaxKind::CloseParenthesis);

        self.parse_statement(ParseStatement::StatementBody { parse_end: false });

        self.finish(m, SyntaxKind::ForEachStatement);
    }

    // switch (a) {case abc: wow++; break; default: return no }
    fn parse_switch_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::SwitchKeyword);
        self.expect(SyntaxKind::OpenParenthesis);
        self.parse_expression(TokenSet::STATEMENT_OR_CLOSE_PARENTHESIS);
        self.expect(SyntaxKind::CloseParenthesis);

        self.expect(SyntaxKind::OpenBrace);
        while !self.at_set(TokenSet::END_OF_BLOCK) {
            match self.token() {
                SyntaxKind::CaseKeyword => {
                    let m = self.start();
                    self.expect_or_panic(SyntaxKind::CaseKeyword);
                    self.parse_expression(TokenSet::STATEMENT_OR_COLON);
                    self.expect(SyntaxKind::Colon);
                    self.parse_case_body();
                    self.finish(m, SyntaxKind::CaseClause);
                }
                SyntaxKind::DefaultKeyword => {
                    let m = self.start();
                    self.expect_or_panic(SyntaxKind::DefaultKeyword);
                    self.expect(SyntaxKind::Colon);
                    self.parse_case_body();
                    self.finish(m, SyntaxKind::DefaultClause);
                }
                _ if !self.at_set(TokenSet::STATEMENT_OR_EXPRESSION) => {
                    self.error_at_token(self.expected_but_got("'case' or 'default'"));
                    // Skip over nonsense until we find something valid
                    while !self.at_set(TokenSet::SWITCH_RECOVERY) {
                        self.bump();
                    }
                }
                _ => {
                    // Case where user has written statements on top of the switch block
                    // but hasn't written 'case' above it yet
                    self.error_at_token("Statement must be prepended with 'case' label".to_owned());
                    let m = self.start();
                    self.parse_case_body();
                    self.finish(m, SyntaxKind::CaseClause);
                }
            }
        }
        self.expect(/* parse_end */ SyntaxKind::CloseBrace);

        self.finish(m, SyntaxKind::SwitchStatement);
    }

    // switch (a) {case abc: wow++; break; default: return no }
    //                       _____________          _________
    fn parse_case_body(&mut self) {
        while self.parse_statement(ParseStatement::CaseStatements) {}
    }

    // Used in places where we expect an identifier and optionally an '=' sign
    fn parse_variable_declaration(&mut self, kind: VariableDeclaration, message: &str) {
        let m = self.start();
        let recovery = match kind {
            VariableDeclaration::Local => TokenSet::VARIABLE_RECOVERY,
            VariableDeclaration::Parameter => TokenSet::PARAMETER_RECOVERY,
            VariableDeclaration::Catch => TokenSet::CATCH_RECOVERY,
        };
        self.parse_name(message, recovery);
        if self.at_set(TokenSet::INIT_OPERATORS) {
            if kind == VariableDeclaration::Catch {
                // We parse it anyways for better recovery
                // Perhaps it shouldn't omit errors for parse_expression to not be misleading?
                let err = self.start();
                self.error_and_advance("Assignment is not allowed here".to_owned());
                self.parse_expression(recovery);
                self.finish(err, SyntaxKind::Error);
            } else {
                let m = self.start();
                self.parse_proper_or_error(
                    SyntaxKind::Equals,
                    "Expected '=' for initialisation".to_owned(),
                );
                self.parse_expression(recovery);
                self.finish(m, SyntaxKind::Initialiser);
            }
        } else if !self.has_preceding_new_line && self.at_set(TokenSet::EXPRESSIONS) {
            let m = self.start();
            self.error_at_token("Expected '=' before expression".to_owned());
            self.parse_expression(recovery);
            self.finish(m, SyntaxKind::Initialiser);
        }

        self.finish(m, SyntaxKind::VariableDeclaration);
    }

    // local abc = 2, d
    // local function func() {}
    fn parse_local_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::LocalKeyword);

        if self.at(SyntaxKind::FunctionKeyword) {
            self.expect_or_panic(SyntaxKind::FunctionKeyword);

            self.parse_name("function's name", TokenSet::FUNCTION_NAME_RECOVERY);
            if self.at_set(TokenSet::NAME_QUALIFIER) {
                self.error_and_advance(
                    "Name qualification is only allowed for function statements.".to_owned(),
                );
            }

            self.parse_function_signature();
            self.parse_statement(ParseStatement::FunctionBody);

            self.finish(m, SyntaxKind::LocalFunctionDeclaration);
            return;
        }

        self.parse_variable_declaration(VariableDeclaration::Local, "variable name or 'function'");
        while self.try_bump(SyntaxKind::Comma) {
            self.parse_variable_declaration(VariableDeclaration::Local, "variable name");
        }
        self.finish(m, SyntaxKind::LocalVariableDeclaration);
    }

    /// Parsing end of the statement here is not an oversight, this
    /// is to mirror the compiler behaviour. Why does the compiler
    /// do it? Because it's a squirrel language
    /// Consider the follwing:
    /// ```
    /// use sq_3_parser::ast::*;
    /// use sq_3_parser::*;
    /// let source = "local a = {function a() const abc = 1;}";
    ///
    /// let parse = Parse::new(source);
    /// assert!(parse.errors().is_empty());
    /// ```
    /// This compiles fine without errors since semicolon in parsed by the const statement,
    ///
    /// However this
    /// ```
    /// use sq_3_parser::ast::*;
    /// use sq_3_parser::*;
    /// let source = "local a = {function a() foreach (k, v in this) 0;}";
    ///
    /// let parse = Parse::new(source);
    /// assert!(!parse.errors().is_empty());
    /// ```
    /// Gives a compiler error since the semicolon is not parsed by the while statement
    /// Normally only `parse_source_file` or `parse_block_statement` should use `parse_end`,
    /// But it's squirrel so what can you do
    ///
    /// const can only take literals as value since it needs to be known at
    /// compile time, this however is handled in
    fn parse_const_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::ConstKeyword);
        self.parse_name("constant's name", TokenSet::VARIABLE_RECOVERY);

        if self.at_set(TokenSet::INIT_OPERATORS) {
            let m = self.start();
            self.parse_proper_or_error(
                SyntaxKind::Equals,
                "Expected '=' for initialisation".to_owned(),
            );
            self.parse_expression(TokenSet::STATEMENT_WITH_SEMICOLON);
            self.finish(m, SyntaxKind::Initialiser);
        } else if self.at_set(TokenSet::EXPRESSIONS) {
            let m = self.start();
            self.error_at_token("Expected '=' before expression".to_owned());
            self.parse_expression(TokenSet::STATEMENT_WITH_SEMICOLON);
            self.finish(m, SyntaxKind::Initialiser);
        }

        self.finish(m, SyntaxKind::ConstStatement);
        // Here is the only place where statement itself parses end
        // Why? Because it's a squirrel lang
        self.parse_end_of_statement();
    }

    // return
    // return 12321 + 2
    fn parse_return_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::ReturnKeyword);
        if !self.can_parse_end_of_statement() {
            self.parse_comma_expression(TokenSet::STATEMENT);
        }

        self.finish(m, SyntaxKind::ReturnStatement);
    }

    // yield
    // yield gidagedi()
    fn parse_yield_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::YieldKeyword);
        if !self.can_parse_end_of_statement() {
            self.parse_comma_expression(TokenSet::STATEMENT_WITH_SEMICOLON);
        }

        self.finish(m, SyntaxKind::YieldStatement);
    }

    // continue
    fn parse_continue_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::ContinueKeyword);
        self.finish(m, SyntaxKind::ContinueStatement);
    }

    // break
    fn parse_break_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::BreakKeyword);
        self.finish(m, SyntaxKind::BreakStatement);
    }

    // function abc() {local a= 2; return a}
    fn parse_function_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::FunctionKeyword);

        self.parse_qualified_name();
        self.parse_function_signature();

        self.parse_statement(ParseStatement::FunctionBody);

        self.finish(m, SyntaxKind::FunctionStatement);
    }

    // function a::b::c() {}
    //          _______
    fn parse_qualified_name(&mut self) -> Marker {
        let m = self.start();
        let mut part = self.start();
        let name = self.parse_name("name", TokenSet::FUNCTION_NAME_RECOVERY);
        // Didn't parse the name
        if name.is_none() && !self.at_set(TokenSet::NAME_QUALIFIER) {
            self.drop(part);
            self.drop(m);
            return m;
        }

        while self.at_set(TokenSet::NAME_QUALIFIER) {
            self.parse_proper_or_error(
                SyntaxKind::ColonColon,
                "Expected '::' to qualify a name".to_owned(),
            );
            self.finish(part, SyntaxKind::QualifiedNamePart);

            part = self.start();
            self.parse_name("name", TokenSet::FUNCTION_NAME_RECOVERY);
        }

        self.drop(part);

        self.finish(m, SyntaxKind::QualifiedName);

        m
    }

    // class a extends b { member = 2 function method() {} }
    fn parse_class_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::ClassKeyword);
        if self.at(SyntaxKind::ExtendsKeyword) {
            self.error_at_token("Class statement must have a name".to_owned());
        } else {
            let name = self.parse_expression(TokenSet::STATEMENT);
            if !self.is_lhs_expression(name) {
                self.error(SyntaxError {
                    message: "The class name must be a variable or a property access".to_owned(),
                    range: self.marker_range(name),
                });
            }
        }
        self.parse_class_body();
        self.finish(m, SyntaxKind::ClassStatement);
    }

    // enum can only accept literals as it's member values but it's not handled here
    // enum a {a, b, c, d = 2}
    fn parse_enum_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::EnumKeyword);
        self.parse_name("enum's name", TokenSet::STATEMENT_OR_EXPRESSION);
        if !self.expect(SyntaxKind::OpenBrace) {
            self.finish(m, SyntaxKind::EnumStatement);
            return;
        }

        let save_separator = self.object_separator;
        self.object_separator = ParsingObjectSeparator::Comma;
        while !self.at(SyntaxKind::CloseBrace) && !self.at(SyntaxKind::Eof) {
            self.parse_member(MemberObject::Enum);

            if self.at_set(TokenSet::SEPARATORS) {
                self.parse_proper_or_error(
                    SyntaxKind::Comma,
                    "Expected ',' between members in the enum".to_owned(),
                );
            }
        }
        self.object_separator = save_separator;

        self.expect(SyntaxKind::CloseBrace);
        self.finish(m, SyntaxKind::EnumStatement);
    }

    // Not sure what this is used for, seems like an outdated error handling remnant
    // try { blowup() } catch (e) { error(e) }
    fn parse_try_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::TryKeyword);

        if !self.parse_statement(ParseStatement::StatementBody { parse_end: false }) {
            self.finish(m, SyntaxKind::TryStatement);
            return;
        }

        if self.at(SyntaxKind::CatchKeyword) {
            self.parse_catch_clause();
        } else {
            self.error_at_token(self.expected_but_got("'catch'"));
        }

        self.finish(m, SyntaxKind::TryStatement);
    }

    // try { blowup() } catch (e) { error(e) }
    //                  ______________________
    fn parse_catch_clause(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::CatchKeyword);
        self.expect(SyntaxKind::OpenParenthesis);
        self.parse_variable_declaration(VariableDeclaration::Catch, "error's name");
        self.expect(SyntaxKind::CloseParenthesis);
        self.parse_statement(ParseStatement::StatementBody { parse_end: false });
        self.finish(m, SyntaxKind::CatchClause);
    }

    // throw abc + "2132"
    fn parse_throw_statement(&mut self) {
        let m = self.start();
        self.expect_or_panic(SyntaxKind::ThrowKeyword);
        self.parse_comma_expression(TokenSet::STATEMENT_WITH_SEMICOLON);
        self.finish(m, SyntaxKind::ThrowStatement);
    }

    // abc = 312 + 2
    fn parse_expression_statement(&mut self) {
        let m = self.start_without_comment_attachment();
        self.parse_comma_expression(TokenSet::STATEMENT_WITH_SEMICOLON);
        self.finish(m, SyntaxKind::ExpressionStatement);
    }
}
