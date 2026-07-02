use rowan::{TextRange, TextSize};

use crate::{Event, Marker, SyntaxError, SyntaxKind};

#[derive(Debug, Default)]
pub struct DocComment<'a> {
    text: &'a str,
    pos: TextSize,
    code_block_state: CodeBlockState,
    connected_backticks: usize,
    events: Vec<Event>,
    errors: Vec<SyntaxError>,
}

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
enum CodeBlockState {
    #[default]
    None,
    SingleLine,
    MultiLine,
}

impl<'a> DocComment<'a> {
    pub fn parse(text: &'a str) -> (Vec<Event>, Vec<SyntaxError>) {
        let mut this = Self {
            text,
            // + 3 for /**
            pos: TextSize::new(3),
            ..Default::default()
        };
        this.finish_token(TextSize::new(0), SyntaxKind::DocSlashAsteriskAsterisk);
        this.body();
        let mut chars = this.text[this.pos.into()..].chars();
        if chars.next() == Some('*') && chars.next() == Some('/') {
            let start = this.start_token();
            this.pos += TextSize::new(2);
            this.finish_token(start, SyntaxKind::DocAsteriskSlash);
        }
        (this.events, this.errors)
    }

    fn start(&mut self) -> Marker {
        let index = self.events.len();
        self.events.push(Event::Pending);
        Marker(index)
    }

    fn finish(&mut self, marker: Marker, kind: SyntaxKind) {
        self.events[marker.0] = Event::Start { kind };
        self.events.push(Event::Finish);
    }

    fn drop(&mut self, marker: Marker) {
        self.events.remove(marker.0);
    }

    const fn start_token(&self) -> TextSize {
        self.pos
    }

    fn finish_token(&mut self, start: TextSize, kind: SyntaxKind) {
        self.events.push(Event::Token {
            kind,
            range: TextRange::new(start, self.pos),
        });
    }

    fn char_token(&mut self, kind: SyntaxKind) -> Option<char> {
        let start = self.start_token();
        let char = self.next();
        self.finish_token(start, kind);
        char
    }

    fn expect(&mut self, ch: char, kind: SyntaxKind) -> bool {
        if self.peek() != Some(ch) {
            self.errors.push(SyntaxError {
                message: format!("Expected '{ch}'"),
                range: self.next_char_range(),
            });
            return false;
        }

        self.char_token(kind);
        true
    }

    fn next(&mut self) -> Option<char> {
        let ch = self.peek()?;
        self.pos += TextSize::new(u32::try_from(ch.len_utf8()).unwrap_or(u32::MAX));
        Some(ch)
    }

    fn peek(&self) -> Option<char> {
        let mut chars = self.text[self.pos.into()..].chars();
        let ch = chars.next()?;
        if ch == '*' && chars.next() == Some('/') {
            return None;
        }
        Some(ch)
    }

    fn next_char_range(&self) -> TextRange {
        let next_pos = self.peek().map_or(self.pos, |ch| {
            self.pos + TextSize::new(u32::try_from(ch.len_utf8()).unwrap_or(u32::MAX))
        });

        TextRange::new(self.pos, next_pos)
    }

    fn skip_trivia(&mut self) {
        let start = self.start_token();
        while let Some(char) = self.peek() {
            match char {
                ' ' | '\t' | '\r' => {
                    self.next();
                }
                _ => break,
            }
        }

        if start != self.pos {
            self.finish_token(start, SyntaxKind::Whitespace);
        }
    }

    fn description(&mut self) {
        self.skip_trivia();
        // Skip leading blank lines before any content
        while self.peek() == Some('\n') {
            self.new_line();
        }

        if matches!(self.peek(), None | Some('@')) {
            return;
        }

        let m = self.start();
        loop {
            let line_m = self.start();
            let start = self.start_token();
            loop {
                if self.peek() == Some('`') {
                    self.next();
                    self.connected_backticks += 1;
                    match (self.code_block_state, self.connected_backticks) {
                        (CodeBlockState::None, 1) => {
                            self.code_block_state = CodeBlockState::SingleLine;
                        }
                        (CodeBlockState::SingleLine, 3) => {
                            self.connected_backticks = 0;
                            self.code_block_state = CodeBlockState::MultiLine;
                        }
                        (CodeBlockState::SingleLine, 1) | (CodeBlockState::MultiLine, 3) => {
                            self.connected_backticks = 0;
                            self.code_block_state = CodeBlockState::None;
                        }
                        _ => {}
                    }
                    continue;
                }

                if self.code_block_state == CodeBlockState::SingleLine
                    && self.connected_backticks == 2
                {
                    self.code_block_state = CodeBlockState::None;
                }
                self.connected_backticks = 0;
                match self.peek() {
                    Some('@') if self.code_block_state != CodeBlockState::None => {
                        self.next();
                    }
                    None | Some('@') => {
                        if start == self.pos {
                            self.drop(line_m);
                        } else {
                            self.finish_token(start, SyntaxKind::DocText);
                            self.finish(line_m, SyntaxKind::DocDescriptionLine);
                        }
                        self.finish(m, SyntaxKind::DocDescription);
                        if self.code_block_state != CodeBlockState::None {
                            self.errors.push(SyntaxError {
                                message: "Unterminated code block".to_owned(),
                                range: self.next_char_range(),
                            });
                            self.code_block_state = CodeBlockState::None;
                        }
                        return;
                    }
                    Some('\n') => {
                        if self.code_block_state == CodeBlockState::SingleLine {
                            self.errors.push(SyntaxError {
                                message: "Unterminated code block".to_owned(),
                                range: self.next_char_range(),
                            });
                            self.code_block_state = CodeBlockState::None;
                        }
                        self.next();
                        self.finish_token(start, SyntaxKind::DocText);
                        self.finish(line_m, SyntaxKind::DocDescriptionLine);
                        self.after_new_line();
                        break;
                    }
                    Some('\\') if self.code_block_state == CodeBlockState::None => {
                        self.next();
                        self.next();
                    }
                    _ => {
                        self.next();
                    }
                }
            }
        }
    }

    fn identifier(&mut self, message: String) -> TextRange {
        if !self
            .peek()
            .is_some_and(|c| c.is_ascii_alphabetic() || c == '_')
        {
            self.errors.push(SyntaxError {
                message,
                range: self.next_char_range(),
            });
            return TextRange::empty(self.pos);
        }

        let start = self.start_token();
        self.next();
        while self
            .peek()
            .is_some_and(|c| c.is_ascii_alphanumeric() || c == '_')
        {
            self.next();
        }
        self.finish_token(start, SyntaxKind::DocIdentifier);

        TextRange::new(start, self.pos)
    }

    fn possible_type(&mut self) -> bool {
        self.skip_trivia();
        if self.peek() == Some('{') {
            self.parse_tag_type();
            true
        } else {
            false
        }
    }

    fn possible_type_with_name(&mut self, error_keyword: &str) {
        let has_type = self.possible_type();

        self.skip_trivia();
        let name = self.start();
        self.identifier(if has_type {
            format!("Expected {error_keyword}'s name")
        } else {
            format!("Expected type ('{{...}}') or {error_keyword}'s name")
        });

        self.finish(name, SyntaxKind::DocName);
    }

    // @param {type} name description
    fn parse_tag(&mut self) {
        let tag = self.start();

        let item = self.start();

        assert_eq!(self.char_token(SyntaxKind::DocAt), Some('@'));

        let ident_range = self.identifier("Expected tag's name".to_owned());
        let tag_text = &self.text[ident_range];
        self.finish(item, SyntaxKind::DocTagItem);

        let kind = match tag_text {
            "param" => {
                self.possible_type_with_name("parameter");
                SyntaxKind::ParamTag
            }
            "var" => {
                self.possible_type_with_name("variable");
                SyntaxKind::VarTag
            }
            "type" => {
                self.parse_tag_type();
                SyntaxKind::TypeTag
            }
            "returns" | "return" => {
                self.possible_type();
                SyntaxKind::ReturnTag
            }
            "throws" | "throw" => {
                self.possible_type();
                SyntaxKind::ThrowTag
            }
            "yields" | "yield" => {
                self.possible_type();
                SyntaxKind::YieldTag
            }
            "varargs" | "vargv" => {
                self.possible_type();
                SyntaxKind::VarArgsTag
            }
            "extends" => {
                self.parse_tag_type();
                SyntaxKind::ExtendsTag
            }
            "this" => {
                self.parse_tag_type();
                SyntaxKind::ThisTag
            }
            "override" => SyntaxKind::OverrideTag,
            "nodiscard" => SyntaxKind::NoDiscardTag,
            "native" => SyntaxKind::NativeTag,
            "deprecated" => SyntaxKind::DeprecatedTag,
            "hide" => SyntaxKind::HideTag,
            "const" => SyntaxKind::ConstTag,
            "static" => SyntaxKind::StaticTag,
            _ => {
                self.errors.push(SyntaxError {
                    message: format!("Unknown tag '{tag_text}'"),
                    range: ident_range,
                });
                SyntaxKind::UnknownTag
            }
        };

        self.description();
        self.finish(tag, kind);
    }

    fn parse_types(&mut self) {
        self.skip_trivia();
        // if !first_necessary
        //     && !self
        //         .peek()
        //         .is_some_and(|ch| ch.is_alphabetic() || ch == '_' || ch == '[')
        // {
        //     return;
        // }

        loop {
            let m = self.start();
            if self.peek() == Some('[') {
                assert_eq!(self.char_token(SyntaxKind::DocOpenBracket), Some('['));
                self.parse_types();
                self.expect(']', SyntaxKind::DocCloseBracket);

                self.finish(m, SyntaxKind::DocTypeArray);
            } else {
                let ident = self.identifier("Expected type's name".to_owned());
                if ident.is_empty() {
                    self.drop(m);
                } else {
                    self.finish(m, SyntaxKind::DocTypeName);
                }
            }

            self.skip_trivia();
            match self.peek() {
                Some('|') => {
                    self.char_token(SyntaxKind::DocPipe);
                    self.skip_trivia();
                }
                Some(ch) if ch.is_alphabetic() || ch == '_' || ch == '[' => {
                    self.errors.push(SyntaxError {
                        message: "Expected '|' between types".to_owned(),
                        range: self.next_char_range(),
                    });
                }
                _ => return,
            }
        }
    }

    fn parse_tag_type(&mut self) {
        self.skip_trivia();

        let m = self.start();

        if self.expect('{', SyntaxKind::DocOpenBrace) {
            self.parse_types();
            self.expect('}', SyntaxKind::DocCloseBrace);
            self.finish(m, SyntaxKind::DocTagType);
        } else {
            self.drop(m);
        }
    }

    fn body(&mut self) {
        self.skip_trivia();
        while let Some(ch) = self.peek() {
            match ch {
                '@' => self.parse_tag(),
                '\n' => self.new_line(),

                _ => self.description(),
            }
        }
    }

    fn new_line(&mut self) {
        assert_eq!(self.char_token(SyntaxKind::DocNewLine), Some('\n'));
        self.after_new_line();
    }

    fn after_new_line(&mut self) {
        self.skip_trivia();
        match self.peek() {
            Some('*') => {
                self.char_token(SyntaxKind::DocAsterisk);
                self.skip_trivia();
            }
            Some(_) => {
                self.errors.push(SyntaxError {
                    message: "Expected '*' after the new line".to_owned(),
                    range: self.next_char_range(),
                });
            }
            None => {}
        }
    }
}
