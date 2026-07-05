use std::path::PathBuf;

use lsp_types::{DocumentLink, DocumentLinkParams};
use resolver::{ExpressionKind, Primitive, Source, SourceCtx, StringKind, Type, VScriptDatabase};

use crate::positions;

pub fn handle_document_link<Db: VScriptDatabase>(
    db: &Db,
    params: DocumentLinkParams,
) -> anyhow::Result<Option<Vec<DocumentLink>>> {
    let uri = params.text_document.uri;
    let file = db
        .get_file(&uri)
        .ok_or_else(|| anyhow::format_err!("File not found in workspace"))?;
    let ctx = SourceCtx::new(db, file);

    let line_idx = positions::line_index(db, file);

    let links: Vec<_> = ctx
        .range_to_expr()
        .values()
        .filter_map(|expr| {
            let ExpressionKind::Literal(Type::Primitive(Primitive::String {
                kind,
                literal: Some(literal),
            })) = expr
            else {
                return None;
            };

            if *kind != StringKind::Script {
                return None;
            }

            let literal = ctx.get(*literal);
            let rel_path = PathBuf::from(literal.text.replace("\\\\", "/"));
            let script = ctx.db().get_script(rel_path).ok()?;
            let url = db.get_url(&script)?;

            Some(DocumentLink {
                range: positions::range(line_idx, literal.unquoted_range)?,
                target: Some(url),
                tooltip: Some("Open file".to_owned()),
                data: None,
            })
        })
        .collect();

    if links.is_empty() {
        Ok(None)
    } else {
        Ok(Some(links))
    }
}
