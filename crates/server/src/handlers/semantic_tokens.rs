use line_index::{LineIndex, TextRange};
use lsp_types::{
    SemanticToken, SemanticTokens, SemanticTokensParams, SemanticTokensRangeParams,
    SemanticTokensRangeResult, SemanticTokensResult,
};
use resolver::{
    DisplayType, LocalKind, Source, SourceCtx, Symbol, SymbolFlags, SymbolKind, Type,
    VScriptDatabase,
};

use crate::positions;

enum TokenType {
    Variable = 0,
    Parameter = 1,
    Function = 2,
    Class = 3,
    Property = 4,
    Enum = 5,
    EnumMember = 6,
}

bitflags::bitflags! {
    pub struct TokenModifier: u8 {
        const READONLY = 1 << 0;
        const STATIC = 1 << 1;
        const DEPRECATED = 1 << 2;
    }
}

pub fn handle_semantic_tokens_full<Db: VScriptDatabase>(
    db: &Db,
    params: SemanticTokensParams,
) -> anyhow::Result<Option<SemanticTokensResult>> {
    let uri = params.text_document.uri;
    let file = db
        .get_file(&uri)
        .ok_or_else(|| anyhow::format_err!("File not found in workspace"))?;
    let ctx = SourceCtx::new(db, file);

    let line_idx = positions::line_index(db, file);

    let mut entries: Vec<_> = ctx.range_to_symbol().clone().into_iter().collect();
    entries.sort_by_key(|(range, _)| range.start());

    let mut prev_line = 0u32;
    let mut prev_start = 0u32;

    let tokens = entries
        .into_iter()
        .filter_map(|(text_range, id)| {
            let symbol = ctx.get(id);
            symbol_to_semantic_token(
                symbol,
                line_idx,
                text_range,
                &mut prev_line,
                &mut prev_start,
            )
            .transpose()
        })
        .collect::<anyhow::Result<Vec<_>>>()?;

    if tokens.is_empty() {
        Ok(None)
    } else {
        Ok(Some(SemanticTokensResult::Tokens(SemanticTokens {
            result_id: None,
            data: tokens,
        })))
    }
}

pub fn handle_semantic_tokens_range<Db: VScriptDatabase>(
    db: &Db,
    params: SemanticTokensRangeParams,
) -> anyhow::Result<Option<SemanticTokensRangeResult>> {
    let uri = params.text_document.uri;
    let file = db
        .get_file(&uri)
        .ok_or_else(|| anyhow::format_err!("File not found in workspace"))?;
    let ctx = SourceCtx::new(db, file);

    let line_idx = positions::line_index(db, file);
    let highlight_range = positions::text_range(line_idx, params.range)
        .ok_or_else(|| anyhow::format_err!("Range is out of bounds"))?;

    let mut entries: Vec<_> = ctx.range_to_symbol().clone().into_iter().collect();
    entries.sort_by_key(|(range, _)| range.start());

    let mut prev_line = 0u32;
    let mut prev_start = 0u32;

    let tokens = entries
        .into_iter()
        .filter(|(text_range, _)| highlight_range.contains_range(*text_range))
        .filter_map(|(text_range, id)| {
            let symbol = ctx.get(id);
            symbol_to_semantic_token(
                symbol,
                line_idx,
                text_range,
                &mut prev_line,
                &mut prev_start,
            )
            .transpose()
        })
        .collect::<anyhow::Result<Vec<_>>>()?;

    if tokens.is_empty() {
        Ok(None)
    } else {
        Ok(Some(SemanticTokensRangeResult::Tokens(SemanticTokens {
            result_id: None,
            data: tokens,
        })))
    }
}

fn symbol_to_semantic_token(
    symbol: &Symbol,
    line_idx: &LineIndex,
    text_range: TextRange,
    prev_line: &mut u32,
    prev_start: &mut u32,
) -> anyhow::Result<Option<SemanticToken>> {
    let mut modifiers = TokenModifier::empty();

    if symbol.flags.intersects(SymbolFlags::CONST) {
        modifiers |= TokenModifier::READONLY;
    }

    if symbol.flags.intersects(SymbolFlags::DEPRECATED) {
        modifiers |= TokenModifier::DEPRECATED;
    }

    if symbol.flags.intersects(SymbolFlags::STATIC) {
        modifiers |= TokenModifier::STATIC;
    }

    let token_type = match symbol.kind {
        SymbolKind::SignatureParameter => return Ok(None),
        SymbolKind::Local(kind) => match DisplayType::from(symbol) {
            DisplayType::Function => TokenType::Function,
            DisplayType::Class => TokenType::Class,
            _ => {
                if kind == LocalKind::Parameter {
                    TokenType::Parameter
                } else {
                    TokenType::Variable
                }
            }
        },
        SymbolKind::Property { .. } => match DisplayType::from(symbol) {
            DisplayType::Function => TokenType::Function,
            DisplayType::Class => TokenType::Class,
            _ => TokenType::Property,
        },
        SymbolKind::EnumMember => {
            modifiers |= TokenModifier::READONLY;
            TokenType::EnumMember
        }
        SymbolKind::Constant => {
            modifiers |= TokenModifier::READONLY;

            if matches!(symbol.typ, Type::Enum(_)) {
                TokenType::Enum
            } else {
                TokenType::Variable
            }
        }
    };

    let range = positions::range(line_idx, text_range)
        .ok_or_else(|| anyhow::format_err!("Couldn't convert text range to lsp range"))?;

    let line = range.start.line;
    let start = range.start.character;
    let length = text_range.len();

    let delta_line = line - *prev_line;
    let delta_start = if delta_line == 0 {
        start - *prev_start
    } else {
        start
    };

    *prev_line = line;
    *prev_start = start;

    Ok(Some(SemanticToken {
        delta_line,
        delta_start,
        length: length.into(),
        token_type: token_type as u32,
        token_modifiers_bitset: u32::from(modifiers.bits()),
    }))
}
