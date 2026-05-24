use lsp_types::{
    Location,
    request::{GotoTypeDefinitionParams, GotoTypeDefinitionResponse},
};
use resolver::{ArenaId, Source, SourceCtx, VScriptDatabase, parse, token_name_range};

use crate::positions;

pub fn handle_go_to_type_definition<Db: VScriptDatabase>(
    db: &Db,
    params: GotoTypeDefinitionParams,
) -> anyhow::Result<Option<GotoTypeDefinitionResponse>> {
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

    let Some(symbol_id) = ctx.symbol_at(range) else {
        return Ok(None);
    };

    let symbol = ctx.get(symbol_id);
    let Some(type_id) = ctx.type_to_symbol(&symbol.typ) else {
        return Ok(None);
    };

    let file = type_id.file();
    let line_idx = positions::line_index(db, file);
    let name_range = ctx.get(type_id).name_range;

    let uri = db
        .get_url(&file)
        .ok_or_else(|| anyhow::format_err!("Definition file wasn't found in workspace"))?;

    let range = positions::range(line_idx, name_range).ok_or_else(|| {
        anyhow::format_err!("Couldn't convert text range to lsp range for definition file")
    })?;

    Ok(Some(GotoTypeDefinitionResponse::Scalar(Location {
        range,
        uri,
    })))
}
