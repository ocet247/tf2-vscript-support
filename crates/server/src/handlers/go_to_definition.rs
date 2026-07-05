use std::path::PathBuf;

use lsp_types::{GotoDefinitionParams, GotoDefinitionResponse, Location, Range};
use resolver::{
    ArenaId, ExpressionKind, Primitive, Source, SourceCtx, StringKind, Type, VScriptDatabase,
    parse, token_name_range,
};

use crate::positions;

pub fn handle_go_to_definition<Db: VScriptDatabase>(
    db: &Db,
    params: GotoDefinitionParams,
) -> anyhow::Result<Option<GotoDefinitionResponse>> {
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

    if let Some(ExpressionKind::Literal(Type::Primitive(Primitive::String {
        kind,
        literal: Some(literal),
    }))) = ctx.expr_kind_at(token.text_range())
        && *kind == StringKind::Script
    {
        let path = PathBuf::from(ctx.get(*literal).text.to_string());
        if let Ok(script) = ctx.db().get_script(path) {
            let uri = db
                .get_url(&script)
                .ok_or_else(|| anyhow::format_err!("Definition file wasn't found in workspace"))?;

            return Ok(Some(GotoDefinitionResponse::Scalar(Location {
                range: Range::default(),
                uri,
            })));
        }
    }

    let range = token_name_range(&token);
    let Some(id) = ctx.symbol_at(range) else {
        return Ok(None);
    };

    let file = id.file();
    let line_idx = positions::line_index(db, file);
    let symbol = ctx.get(id);

    let uri = db
        .get_url(&file)
        .ok_or_else(|| anyhow::format_err!("Definition file wasn't found in workspace"))?;

    let range = positions::range(line_idx, symbol.name_range).ok_or_else(|| {
        anyhow::format_err!("Couldn't convert text range to lsp range for definition file")
    })?;

    Ok(Some(GotoDefinitionResponse::Scalar(Location {
        range,
        uri,
    })))
}
