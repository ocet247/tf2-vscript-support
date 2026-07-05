use lsp_types::{Hover, HoverContents, HoverParams, MarkupContent, MarkupKind};
use resolver::{Source, SourceCtx, VScriptDatabase, parse, token_name_range};
use sq_3_parser::SyntaxKind;

use crate::positions;

pub fn handle_hover<Db: VScriptDatabase>(
    db: &Db,
    params: HoverParams,
) -> anyhow::Result<Option<Hover>> {
    let uri = params.text_document_position_params.text_document.uri;
    let file = db
        .get_file(&uri)
        .ok_or_else(|| anyhow::format_err!("File not found in workspace"))?;
    let ctx = SourceCtx::new(db, file);

    let line_idx = positions::line_index(db, file);
    let offset = positions::text_size(line_idx, params.text_document_position_params.position)
        .ok_or_else(|| anyhow::format_err!("Position is out of bounds"))?;

    let syntax = parse(db, file).syntax();
    let token = syntax
        .token_at_offset(offset)
        .right_biased()
        .ok_or_else(|| anyhow::format_err!("No token found"))?;

    let range = token_name_range(&token);

    let content = if let Some(id) = ctx.symbol_at(range) {
        ctx.symbol_markdown(id)
    } else if token.kind() == SyntaxKind::Identifier {
        format!("```sqDoc\n{}: any\n```", token.text())
    } else {
        return Ok(None);
    };

    Ok(Some(Hover {
        contents: HoverContents::Markup(MarkupContent {
            kind: MarkupKind::Markdown,
            value: content,
        }),
        range: positions::range(line_idx, range),
    }))
}
