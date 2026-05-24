use line_index::TextRange;
use lsp_types::{SelectionRange, SelectionRangeParams};
use resolver::{VScriptDatabase, parse};
use sq_3_parser::NodeOrToken;

use crate::positions;

pub fn handle_selection_range<Db: VScriptDatabase>(
    db: &Db,
    params: SelectionRangeParams,
) -> anyhow::Result<Option<Vec<SelectionRange>>> {
    let uri = params.text_document.uri;
    let file = db
        .get_file(&uri)
        .ok_or_else(|| anyhow::format_err!("File not found in workspace"))?;

    let line_idx = positions::line_index(db, file);

    let syntax = parse(db, file).syntax();

    let result: Vec<SelectionRange> = params
        .positions
        .into_iter()
        .filter_map(|position| {
            let offset = positions::text_size(line_idx, position)?;
            let range = TextRange::empty(offset);
            let mut current = syntax.child_or_token_at_range(range)?;
            let mut current_selection = SelectionRange {
                range: positions::range(line_idx, current.text_range())?,
                parent: None,
            };

            loop {
                current = match current {
                    NodeOrToken::Node(n) => {
                        let Some(next) = n.child_or_token_at_range(range) else {
                            break;
                        };
                        next
                    }
                    NodeOrToken::Token(_) => break,
                };

                current_selection = SelectionRange {
                    range: positions::range(line_idx, current.text_range())?,
                    parent: Some(Box::new(current_selection)),
                }
            }

            Some(current_selection)
        })
        .collect();

    if result.is_empty() {
        Ok(None)
    } else {
        Ok(Some(result))
    }
}
