use db::file_iter;
use lsp_types::{Location, ReferenceParams};
use resolver::{
    ArenaId, Container, Source, SourceCtx, SymbolKind, VScriptDatabase, parse, token_name_range,
};

use crate::positions;

pub fn handle_references<Db: VScriptDatabase>(
    db: &Db,
    params: ReferenceParams,
) -> anyhow::Result<Option<Vec<Location>>> {
    let uri = params.text_document_position.text_document.uri;
    let file = db
        .get_file(&uri)
        .ok_or_else(|| anyhow::format_err!("File not found in workspace"))?;
    let ctx = SourceCtx::new(db, file);

    let line_idx = positions::line_index(db, file);
    let offset = positions::text_size(line_idx, params.text_document_position.position)
        .ok_or_else(|| anyhow::format_err!("Position is out of bounds"))?;

    let syntax = parse(db, file).syntax();
    let token = syntax
        .token_at_offset(offset)
        .right_biased()
        .ok_or_else(|| anyhow::format_err!("No token found"))?;

    let range = token_name_range(&token);

    let Some(reference_id) = ctx.symbol_at(range) else {
        return Ok(None);
    };
    let reference = ctx.get(reference_id);
    // can't do token.text() if the token is a string that got unquoted
    let name_range = reference.name_range;

    let mut all_locations = Vec::new();
    if matches!(reference.kind, SymbolKind::Local(_)) {
        if let Some(ranges) = ctx.symbol_to_ranges().get(&reference_id) {
            for text_range in ranges {
                if *text_range == name_range {
                    continue;
                }

                let Some(range) = positions::range(line_idx, *text_range) else {
                    continue;
                };

                all_locations.push(Location {
                    range,
                    uri: uri.clone(),
                });
            }
        }

        if all_locations.is_empty() {
            return Ok(None);
        }

        return Ok(Some(all_locations));
    }

    let name = reference.name.as_ref();
    let class_name = if name == "constructor" {
        reference.typ.to_function().ok().and_then(|function_id| {
            match ctx.get(function_id).imp.as_ref().map(|i| i.container) {
                Some(Container::Class(class_id) | Container::Instance(class_id)) => {
                    ctx.get(class_id).symbol.map(|s| ctx.get(s).name.as_ref())
                }
                None | Some(Container::Table(_) | Container::Enum(_)) => None,
            }
        })
    } else {
        None
    };

    for (uri, candidate_file) in file_iter(db) {
        let text = candidate_file.text(db);
        if !text.contains(name) && class_name.is_none_or(|name| !text.contains(name)) {
            continue;
        }

        let candidate_ctx = SourceCtx::new(db, candidate_file);

        let Some(ranges) = candidate_ctx.symbol_to_ranges().get(&reference_id) else {
            continue;
        };

        let line_idx = positions::line_index(db, candidate_file);

        for &text_range in ranges {
            if candidate_file == reference_id.file() && text_range == name_range {
                continue;
            }

            let Some(range) = positions::range(line_idx, text_range) else {
                continue;
            };

            all_locations.push(Location {
                range,
                uri: uri.clone(),
            });
        }
    }

    if all_locations.is_empty() {
        Ok(None)
    } else {
        Ok(Some(all_locations))
    }
}
