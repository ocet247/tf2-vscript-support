use lsp_types::{Location, ReferenceParams};
use resolver::{Source, SourceCtx, SymbolKind, VScriptDatabase, parse, token_name_range};

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

    // can't do token.text() if the token is a string that got unquoted
    let reference_file = SourceCtx::new(db, ctx.file());
    let reference = reference_file.get(reference_id);
    let name = reference.name.as_ref();
    let name_range = reference.name_range;
    let mut all_locations = Vec::new();

    if let Some(ranges) = reference_file.symbol_to_ranges().get(&reference_id) {
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

    if matches!(reference.kind, SymbolKind::Local(_)) {
        if all_locations.is_empty() {
            return Ok(None);
        }

        return Ok(Some(all_locations));
    }

    for entry in db.get_files() {
        let (url, &candidate_file) = entry.pair();

        if candidate_file == file {
            continue;
        }

        let text = candidate_file.text(db);
        if !text.contains(name) {
            continue;
        }

        let candidate = SourceCtx::new(db, candidate_file);

        let Some(ranges) = candidate.symbol_to_ranges().get(&reference_id) else {
            continue;
        };

        let line_idx = positions::line_index(db, candidate_file);

        for text_range in ranges {
            let Some(range) = positions::range(line_idx, *text_range) else {
                continue;
            };

            all_locations.push(Location {
                range,
                uri: url.clone(),
            });
        }
    }

    Ok(Some(all_locations))
}
