use lsp_types::{DocumentHighlight, DocumentHighlightKind, DocumentHighlightParams};
use resolver::{Source, SourceCtx, VScriptDatabase, parse, token_name_range};

use crate::positions;

pub fn handle_document_highlight<Db: VScriptDatabase>(
    db: &Db,
    params: DocumentHighlightParams,
) -> anyhow::Result<Option<Vec<DocumentHighlight>>> {
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

    let Some(id) = ctx.symbol_at(range) else {
        return Ok(None);
    };

    let Some(ranges) = ctx.symbol_to_ranges().get(&id) else {
        return Ok(None);
    };

    ranges
        .iter()
        .map(|&text_range| {
            let range = positions::range(line_idx, text_range)
                .ok_or_else(|| anyhow::format_err!("Couldn't convert text range to lsp range"))?;
            Ok(DocumentHighlight {
                kind: Some(DocumentHighlightKind::TEXT),
                range,
            })
        })
        .collect::<anyhow::Result<Vec<_>>>()
        .map(|h| if h.is_empty() { None } else { Some(h) })
}
