use lsp_types::{
    DocumentSymbol, DocumentSymbolParams, DocumentSymbolResponse, SymbolKind as LspSymbolKind,
    SymbolTag,
};
use resolver::{DisplayType, Source, SourceCtx, Symbol, SymbolFlags, VScriptDatabase};

use crate::positions;

pub fn handle_document_symbol<Db: VScriptDatabase>(
    db: &Db,
    params: DocumentSymbolParams,
) -> anyhow::Result<Option<DocumentSymbolResponse>> {
    let uri = params.text_document.uri;
    let file = db
        .get_file(&uri)
        .ok_or_else(|| anyhow::format_err!("File not found in workspace"))?;
    let ctx = SourceCtx::new(db, file);

    let line_idx = positions::line_index(db, file);

    let mut symbols: Vec<_> = ctx.all_symbols().map(|(_, symbol)| symbol).collect();

    symbols.sort_by(|a, b| {
        let a_range = a.node.text_range();
        let b_range = b.node.text_range();
        a_range
            .start()
            .cmp(&b_range.start())
            .then(b_range.len().cmp(&a_range.len()))
    });

    let mut stack: Vec<(&Symbol, Vec<DocumentSymbol>)> = Vec::new();
    let mut roots = Vec::new();
    let mut build_symbol = |stack: &mut Vec<(&Symbol, Vec<DocumentSymbol>)>,
                            symbol: &Symbol,
                            children: Vec<DocumentSymbol>| {
        let Some(range) = positions::range(line_idx, symbol.node.text_range()) else {
            return;
        };

        let Some(name_range) = positions::range(line_idx, symbol.name_range) else {
            return;
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

        let name = if symbol.name.is_empty() {
            "<unnamed>".to_owned()
        } else {
            symbol.name.to_string()
        };

        if !symbol.node.text_range().contains_range(symbol.name_range) {
            log::error!("'name_range' is outside of 'range'");
            return;
        }

        #[allow(deprecated)]
        let doc_symbol = DocumentSymbol {
            name,
            detail: Some(ctx.type_to_str(&symbol.typ).into_string()),
            kind,
            range,
            selection_range: name_range,
            children: if children.is_empty() {
                None
            } else {
                Some(children)
            },
            tags: symbol
                .flags
                .contains(SymbolFlags::DEPRECATED)
                .then(|| vec![SymbolTag::DEPRECATED]),
            deprecated: None,
        };

        if let Some((_, parent_children)) = stack.last_mut() {
            parent_children.push(doc_symbol);
        } else {
            roots.push(doc_symbol);
        }
    };

    for symbol in &symbols {
        while let Some((parent, _)) = stack.last() {
            if parent
                .node
                .text_range()
                .contains_range(symbol.node.text_range())
            {
                break;
            }
            let (psymbol, children) = stack
                .pop()
                .expect("We can enter this point only after .last is Some");
            build_symbol(&mut stack, psymbol, children);
        }
        stack.push((symbol, Vec::new()));
    }

    while let Some((symbol, children)) = stack.pop() {
        build_symbol(&mut stack, symbol, children);
    }

    if roots.is_empty() {
        Ok(None)
    } else {
        Ok(Some(DocumentSymbolResponse::Nested(roots)))
    }
}
