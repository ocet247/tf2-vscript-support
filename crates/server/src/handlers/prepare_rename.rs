use lsp_types::{PrepareRenameResponse, TextDocumentPositionParams};
use resolver::{
    METAMETHODS, Source, SourceCtx, SymbolKind, VScriptDatabase, parse, token_name_range,
};

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

    let range = token_name_range(&token);

    let Some(symbol_id) = ctx.symbol_at(range) else {
        return Ok(None);
    };

    let symbol = ctx.get(symbol_id);
    if matches!(symbol.kind, SymbolKind::Property { .. }) {
        let name = file.text(db)[range.start().into()..range.end().into()].to_string();

        if name == "constructor" || METAMETHODS.contains(&name) {
            return Err(anyhow::format_err!(
                "Renaming a metamethod or constructor is not allowed because it might break implicit behavior."
            ));
        }
    }

    let range = positions::range(line_idx, range)
        .ok_or_else(|| anyhow::format_err!("Couldn't convert text range to lsp range"))?;

    Ok(Some(PrepareRenameResponse::Range(range)))
}
