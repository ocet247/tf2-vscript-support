pub mod ast;
mod cst;
mod doc_comment;
mod lexer;
mod parser;
mod token_set;

use crate::{ast::SourceFile, doc_comment::DocComment, lexer::Lexer, parser::Parser};
use rowan::GreenNodeBuilder;

pub use crate::cst::{SyntaxElement, SyntaxKind, SyntaxNode, SyntaxNodePtr, SyntaxToken};
pub use rowan::{
    GreenNode, NodeOrToken, TextRange, TextSize,
    ast::{AstChildren, AstNode, AstPtr},
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyntaxError {
    message: String,
    range: TextRange,
}

impl SyntaxError {
    #[must_use]
    pub fn message(&self) -> &str {
        &self.message
    }

    #[must_use]
    pub const fn range(&self) -> TextRange {
        self.range
    }
}

#[derive(Debug, Clone, Copy)]
enum Event {
    Pending,
    Start { kind: SyntaxKind },
    Finish,
    Token { kind: SyntaxKind, range: TextRange },
}

#[derive(Debug, Clone, Copy)]
struct Marker(pub usize);

#[derive(Debug, PartialEq, Eq)]
pub struct Parse {
    green_node: GreenNode,
    errors: Vec<SyntaxError>,
}

impl Parse {
    #[must_use]
    #[allow(clippy::missing_panics_doc)]
    pub fn new(text: &str) -> Self {
        let (tokens, mut lex_errors) = Lexer::tokenise(text);
        let (events, parse_errors) = Parser::parse(tokens);

        lex_errors.extend(parse_errors);

        let mut builder = GreenNodeBuilder::new();
        for event in events {
            match event {
                Event::Start { kind } => builder.start_node(kind.into()),
                Event::Finish => builder.finish_node(),
                Event::Token { kind, range } => {
                    if kind != SyntaxKind::DocComment {
                        builder.token(kind.into(), &text[range]);
                        continue;
                    }

                    builder.start_node(SyntaxKind::DocCommentNode.into());

                    let (events, errors) = DocComment::parse(&text[range]);
                    lex_errors.extend(errors.into_iter().map(|e| SyntaxError {
                        range: e.range + range.start(),
                        ..e
                    }));

                    for event in events {
                        match event {
                            Event::Start { kind } => builder.start_node(kind.into()),
                            Event::Finish => builder.finish_node(),
                            Event::Pending => {
                                panic!("Pending event found, current tree: {:#?}", builder.finish())
                            }
                            Event::Token {
                                kind,
                                range: token_range,
                            } => {
                                builder.token(kind.into(), &text[token_range + range.start()]);
                            }
                        }
                    }

                    builder.finish_node();
                }
                Event::Pending => {
                    panic!("Pending event found, current tree: {:#?}", builder.finish())
                }
            }
        }

        Self {
            green_node: builder.finish(),
            errors: lex_errors,
        }
    }

    #[must_use]
    pub fn errors(&self) -> &[SyntaxError] {
        &self.errors
    }

    #[must_use]
    pub fn syntax(&self) -> SyntaxNode {
        SyntaxNode::new_root(self.green_node.clone())
    }

    #[must_use]
    #[allow(clippy::missing_panics_doc)]
    pub fn source_file(&self) -> SourceFile {
        SourceFile::cast(self.syntax())
            .expect("Parse syntax node is guaranteed to be a source file node")
    }

    #[must_use]
    pub fn into_syntax(self) -> SyntaxNode {
        SyntaxNode::new_root(self.green_node)
    }

    #[must_use]
    pub fn finish(self) -> (SourceFile, Vec<SyntaxError>) {
        (self.source_file(), self.errors)
    }
}
