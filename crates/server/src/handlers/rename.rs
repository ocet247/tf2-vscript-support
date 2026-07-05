use std::collections::HashMap;

use db::file_iter;
use lsp_types::{RenameParams, TextEdit, Url, WorkspaceEdit};
use resolver::{
    LocalKind, Source, SourceCtx, SymbolKind, VScriptDatabase, parse, token_name_range,
};

use crate::positions;

pub fn handle_rename<Db: VScriptDatabase>(
    db: &Db,
    params: RenameParams,
) -> anyhow::Result<Option<WorkspaceEdit>> {
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

    let Some(symbol_id) = ctx.symbol_at(range) else {
        return Ok(None);
    };

    if ctx.get(symbol_id).kind == SymbolKind::Local(LocalKind::VariedArgs) {
        return Ok(None);
    }

    let name = file.text(db)[range.start().into()..range.end().into()].to_string();
    let new_name = params.new_name;

    let mut changes: HashMap<Url, Vec<TextEdit>> = HashMap::new();

    if matches!(ctx.get(symbol_id).kind, SymbolKind::Local(_)) {
        if let Some(ranges) = ctx.symbol_to_ranges().get(&symbol_id) {
            for &text_range in ranges {
                let range = positions::range(line_idx, text_range).ok_or_else(|| {
                    anyhow::format_err!("Couldn't convert text range to lsp range")
                })?;

                changes.entry(uri.clone()).or_default().push(TextEdit {
                    range,
                    new_text: new_name.clone(),
                });
            }
        }

        if changes.is_empty() {
            return Ok(None);
        }

        return Ok(Some(WorkspaceEdit {
            changes: Some(changes),
            ..Default::default()
        }));
    }

    for (uri, candidate_file) in file_iter(db) {
        let text = candidate_file.text(db);
        if !text.contains(&*name) {
            continue;
        }

        let candidate_ctx = SourceCtx::new(db, candidate_file);

        let Some(ranges) = candidate_ctx.symbol_to_ranges().get(&symbol_id) else {
            continue;
        };

        let candidate_line_idx = positions::line_index(db, candidate_file);

        for &text_range in ranges {
            let range = positions::range(candidate_line_idx, text_range)
                .ok_or_else(|| anyhow::format_err!("Couldn't convert text range to lsp range"))?;

            changes.entry(uri.clone()).or_default().push(TextEdit {
                range,
                new_text: new_name.clone(),
            });
        }
    }

    if changes.is_empty() {
        Ok(None)
    } else {
        Ok(Some(WorkspaceEdit {
            changes: Some(changes),
            ..Default::default()
        }))
    }
}
