use lsp_types::{PrepareRenameResponse, TextDocumentPositionParams};
use resolver::{Source, SourceCtx, VScriptDatabase, parse, token_name_range};

use crate::positions;

pub fn handle_prepare_rename<Db: VScriptDatabase>(
    db: &Db,
    params: TextDocumentPositionParams,
) -> anyhow::Result<Option<PrepareRenameResponse>> {
    let uri = params.text_document.uri;
    let file = db
        .get_file(&uri)
        .ok_or_else(|| anyhow::format_err!("File not found in workspace"))?;
    let ctx = SourceCtx::new(db, file);

    let line_idx = positions::line_index(db, file);
    let offset = positions::text_size(line_idx, params.position)
        .ok_or_else(|| anyhow::format_err!("Position is out of bounds"))?;

    let syntax = parse(db, file).syntax();
    let token = syntax
        .token_at_offset(offset)
        .right_biased()
        .ok_or_else(|| anyhow::format_err!("No token found"))?;

    let text_range = token_name_range(&token);

    if ctx.symbol_at(text_range).is_none() {
        return Ok(None);
    }

    let range = positions::range(line_idx, text_range)
        .ok_or_else(|| anyhow::format_err!("Couldn't convert text range to lsp range"))?;

    Ok(Some(PrepareRenameResponse::Range(range)))
}
