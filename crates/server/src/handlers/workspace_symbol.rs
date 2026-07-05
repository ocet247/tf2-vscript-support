use crate::positions;
use lsp_types::{
    Location, SymbolInformation, SymbolKind as LspSymbolKind, SymbolTag, WorkspaceSymbolParams,
    WorkspaceSymbolResponse,
};
use resolver::{DisplayType, Source, SourceCtx, SymbolFlags, SymbolKind, VScriptDatabase};

#[allow(clippy::unnecessary_wraps, clippy::needless_pass_by_value)]
pub fn handle_workspace_symbol<Db: VScriptDatabase>(
    db: &Db,
    params: WorkspaceSymbolParams,
) -> anyhow::Result<Option<WorkspaceSymbolResponse>> {
    let query = params.query.to_lowercase();
    let mut symbols = Vec::new();

    for entry in db.get_files() {
        let (key, &file) = entry.pair();
        let uri = db::key_to_url(key);

        // Quick text filter before running full analysis
        let text = file.text(db);
        if !query.is_empty() && !text.to_lowercase().contains(&query) {
            continue;
        }

        let ctx = SourceCtx::new(db, file);
        let line_idx = positions::line_index(db, file);

        for (_, symbol) in ctx.all_symbols() {
            // Only top-level symbols worth showing
            if let SymbolKind::Local(_) = symbol.kind {
                continue;
            }

            if !query.is_empty() && !symbol.name.to_lowercase().contains(&query) {
                continue;
            }

            let Some(range) = positions::range(line_idx, symbol.name_range) else {
                continue;
            };

            let kind = match DisplayType::from(symbol) {
                DisplayType::Function => LspSymbolKind::FUNCTION,
                DisplayType::Class => LspSymbolKind::CLASS,
                DisplayType::Variable => LspSymbolKind::VARIABLE,
                DisplayType::Constant => LspSymbolKind::CONSTANT,
                DisplayType::Field => LspSymbolKind::FIELD,
                DisplayType::Enum => LspSymbolKind::ENUM,
                DisplayType::EnumMember => LspSymbolKind::ENUM_MEMBER,
            };

            #[allow(deprecated)]
            symbols.push(SymbolInformation {
                name: symbol.name.to_string(),
                kind,
                location: Location {
                    uri: uri.clone(),
                    range,
                },
                tags: symbol
                    .flags
                    .contains(SymbolFlags::DEPRECATED)
                    .then(|| vec![SymbolTag::DEPRECATED]),
                container_name: None,
                deprecated: None,
            });
        }
    }

    if symbols.is_empty() {
        return Ok(None);
    }

    Ok(Some(WorkspaceSymbolResponse::Flat(symbols)))
}
