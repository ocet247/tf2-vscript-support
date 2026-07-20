use line_index::{LineIndex, TextRange};
use lsp_types::{
    InlayHint, InlayHintKind, InlayHintLabel, InlayHintLabelPart, InlayHintParams,
    InlayHintTooltip, Location, MarkupContent, MarkupKind,
};
use resolver::{
    ArenaId, ExpressionKind, FunctionBack, FunctionIdResolution, LocalKind, Primitive, Source,
    SourceCtx, SymbolId, SymbolKind, Type, TypeFlags, VScriptDatabase, parse,
};
use sq_3_parser::{
    AstNode as _, SyntaxNode,
    ast::{self, Expr, ExpressionWrapper, HasOperand, LiteralExpressionKind, PrefixUnaryOperator},
};

use crate::positions;

pub fn handle_inlay_hint<Db: VScriptDatabase>(
    db: &Db,
    params: InlayHintParams,
) -> anyhow::Result<Option<Vec<InlayHint>>> {
    if !db.config().type_hints && !db.config().parameter_hints {
        return Ok(None);
    }

    let uri = params.text_document.uri;
    let file = db
        .get_file(&uri)
        .ok_or_else(|| anyhow::format_err!("File not found in workspace"))?;
    let ctx = SourceCtx::new(db, file);

    let syntax = parse(db, file).syntax();
    let line_idx = positions::line_index(db, file);
    let range = positions::text_range(line_idx, params.range)
        .ok_or_else(|| anyhow::format_err!("Range is out of bounds"))?;

    let mut hints = Vec::new();
    if db.config().type_hints {
        hints.extend(type_hints(
            line_idx,
            &ctx,
            &range,
            &syntax,
            db.config().enum_member_value_hints,
        ));
    }

    if db.config().parameter_hints {
        hints.extend(parameter_hints(line_idx, &ctx, range, &syntax));
    }

    if db.config().return_value_hints {
        hints.extend(return_value_hints(&syntax, line_idx, &ctx, range));
    }

    if hints.is_empty() {
        Ok(None)
    } else {
        Ok(Some(hints))
    }
}

fn symbol_location(ctx: &SourceCtx, symbol_id: SymbolId) -> Option<Location> {
    let file = symbol_id.file();
    let symbol = ctx.get(symbol_id);
    let uri = ctx.db().get_url(&file)?;
    let line_idx = positions::line_index(ctx.db(), file);
    let range = positions::range(line_idx, symbol.name_range)?;
    Some(Location { uri, range })
}

fn type_hints(
    line_idx: &LineIndex,
    ctx: &SourceCtx,
    range: &TextRange,
    syntax: &SyntaxNode,
    enum_member_value_allowed: bool,
) -> impl Iterator<Item = InlayHint> {
    ctx.all_symbols().filter_map(move |(_, symbol)| {
        if !range.contains_range(symbol.name_range) {
            return None;
        }

        let node = symbol.node.to_node(syntax);
        match symbol.kind {
            SymbolKind::Local(
                LocalKind::Exception | LocalKind::Parameter | LocalKind::Variable,
            )
            | SymbolKind::Property {
                show_inlay_hint: true,
            } => {
                // skip if type is any or null - nothing useful to show
                if !symbol.typ.is_useful() {
                    return None;
                }

                if let Some(var) = ast::VariableDeclaration::cast(node.clone())
                    && var
                        .initialiser()
                        .and_then(|i| i.expression())
                        .is_some_and(|e| expr_obviously_has_type(ctx, &e, &symbol.typ))
                {
                    return None;
                }

                if let Some(var) = ast::Property::cast(node.clone())
                    && var
                        .value()
                        .is_some_and(|e| expr_obviously_has_type(ctx, &e, &symbol.typ))
                {
                    return None;
                }

                if let Some(var) = ast::BinaryExpression::cast(node)
                    && var
                        .rhs()
                        .is_some_and(|e| expr_obviously_has_type(ctx, &e, &symbol.typ))
                {
                    return None;
                }

                let position = positions::range(line_idx, symbol.name_range)?.end;
                let label_text = format!(": {}", ctx.type_to_str(&symbol.typ));
                let (label, tooltip) = if let Ok(id) = symbol.typ.to_instance()
                    && let Some(class_symbol_id) = ctx.get(id).symbol
                {
                    if let Some(location) = symbol_location(ctx, class_symbol_id) {
                        (
                            InlayHintLabel::LabelParts(vec![InlayHintLabelPart {
                                value: label_text,
                                tooltip: None,
                                location: Some(location),
                                command: None,
                            }]),
                            None,
                        )
                    } else {
                        let content = ctx.symbol_markdown(class_symbol_id, symbol.name_range.end());
                        let tooltip = Some(InlayHintTooltip::MarkupContent(MarkupContent {
                            kind: MarkupKind::Markdown,
                            value: content,
                        }));
                        (InlayHintLabel::String(label_text), tooltip)
                    }
                } else {
                    (InlayHintLabel::String(label_text), None)
                };

                Some(InlayHint {
                    position,
                    label,
                    kind: Some(InlayHintKind::TYPE),
                    text_edits: None,
                    tooltip,
                    padding_left: Some(false),
                    padding_right: Some(false),
                    data: None,
                })
            }
            SymbolKind::EnumMember => {
                if !enum_member_value_allowed {
                    return None;
                }

                let var = ast::Property::cast(node)?;
                if var.value().is_some() {
                    return None;
                }

                let Type::Primitive(Primitive::Integer(Some(value))) = symbol.typ else {
                    return None;
                };

                let position = positions::range(line_idx, symbol.name_range)?.end;

                Some(InlayHint {
                    position,
                    label: InlayHintLabel::String(format!(" = {value}")),
                    kind: Some(InlayHintKind::TYPE),
                    text_edits: None,
                    tooltip: None,
                    padding_left: Some(false),
                    padding_right: Some(false),
                    data: None,
                })
            }
            _ => None,
        }
    })
}

fn expr_obviously_has_type(ctx: &SourceCtx, expr: &Expr, typ: &Type) -> bool {
    let Ok(primitive) = Primitive::try_from(typ) else {
        return false;
    };

    match expr {
        Expr::Literal(literal) => {
            let Some((kind, _)) = literal.token() else {
                return false;
            };

            matches!(
                (kind, primitive),
                (
                    LiteralExpressionKind::DecimalInteger
                        | LiteralExpressionKind::HexInteger
                        | LiteralExpressionKind::OctalInteger
                        | LiteralExpressionKind::Character,
                    Primitive::Integer(_)
                ) | (
                    LiteralExpressionKind::String | LiteralExpressionKind::VerbatimString,
                    Primitive::String { .. }
                ) | (LiteralExpressionKind::Float, Primitive::Float(_))
                    | (
                        LiteralExpressionKind::True | LiteralExpressionKind::False,
                        Primitive::Bool(_)
                    )
                    | (LiteralExpressionKind::Null, Primitive::Null)
            )
        }
        Expr::PrefixUnary(prefix) => {
            let Some((operator_kind, _)) = prefix.operator() else {
                return false;
            };

            if operator_kind == PrefixUnaryOperator::LogicalNot {
                return matches!(primitive, Primitive::Bool(_));
            }

            let Some(Expr::Literal(literal)) = prefix.operand() else {
                return false;
            };

            let Some((kind, _)) = literal.token() else {
                return false;
            };

            matches!(
                (kind, primitive),
                (
                    LiteralExpressionKind::DecimalInteger
                        | LiteralExpressionKind::HexInteger
                        | LiteralExpressionKind::OctalInteger,
                    Primitive::Integer(_)
                ) | (LiteralExpressionKind::Float, Primitive::Float(_))
            )
        }
        Expr::Class(_) => {
            matches!(primitive, Primitive::Class(_))
        }
        Expr::Function(_) | Expr::Lambda(_) => {
            matches!(primitive, Primitive::Function(_))
        }
        Expr::TableLiteral(_) => {
            matches!(primitive, Primitive::Table(_))
        }
        Expr::ArrayLiteral(_) => {
            matches!(primitive, Primitive::Array(None))
        }
        Expr::Call(call) => {
            // Constructor call
            let Primitive::Instance(Some(id)) = primitive else {
                return false;
            };

            let Some(callee) = call.callee().and_then(|c| c.expression()) else {
                return false;
            };

            ctx.symbol_at(callee.syntax().text_range())
                .is_some_and(|symbol_id| {
                    let Ok(class) = ctx.get(symbol_id).typ.to_class() else {
                        return false;
                    };

                    class == id
                })
        }
        _ => false,
    }
}

fn parameter_hints(
    line_idx: &LineIndex,
    ctx: &SourceCtx,
    range: TextRange,
    syntax: &SyntaxNode,
) -> impl Iterator<Item = InlayHint> {
    syntax
        .descendants()
        .filter_map(move |n| {
            let call = ast::CallExpression::cast(n)?;
            let callee = call.callee()?;
            if !range.contains_range(callee.syntax().text_range())
                && !call
                    .arguments()
                    .any(|a| range.contains_range(a.syntax().text_range()))
            {
                return None;
            }

            let kind = ctx.expr_kind_at(callee.syntax().text_range());
            let typ = match kind {
                Some(ExpressionKind::Literal(typ)) => typ,
                Some(ExpressionKind::Symbol(id)) => &ctx.get(*id).typ,
                None => return None,
            };

            let Some(FunctionIdResolution::Function(func_id)) =
                ctx.to_function_id(typ, callee.syntax().text_range().end())
            else {
                return None;
            };

            let sg = &ctx.get(func_id).signature;

            Some(
                call.arguments()
                    .zip(sg.params.iter().copied())
                    .filter_map(move |(arg, param_id)| {
                        if !range.contains_range(arg.syntax().text_range()) {
                            return None;
                        }

                        let param = ctx.get(param_id);

                        if param.name.starts_with('_') {
                            return None;
                        }

                        if sg.params.len() == 1 {
                            let flags = ctx.get(sg.params[0]).typ.type_flags();

                            if !flags.intersects(TypeFlags::BOOL)
                                && !flags.intersects(TypeFlags::NULL)
                            {
                                return None;
                            }
                        }

                        if let ast::Expr::Name(n) = &arg
                            && n.identifier().is_some_and(|t| {
                                t.text().to_lowercase().contains(&param.name.to_lowercase())
                            })
                        {
                            return None;
                        }

                        let position = positions::range(line_idx, arg.syntax().text_range())?.start;
                        let label_text = format!("{}:", param.name);
                        let (label, tooltip) = if let Some(location) =
                            symbol_location(ctx, param_id)
                        {
                            (
                                InlayHintLabel::LabelParts(vec![InlayHintLabelPart {
                                    value: label_text,
                                    tooltip: None,
                                    location: Some(location),
                                    command: None,
                                }]),
                                None,
                            )
                        } else {
                            let content = ctx.symbol_markdown(param_id, param.name_range.end());
                            let tooltip = Some(InlayHintTooltip::MarkupContent(MarkupContent {
                                kind: MarkupKind::Markdown,
                                value: content,
                            }));
                            (InlayHintLabel::String(label_text), tooltip)
                        };

                        Some(InlayHint {
                            position,
                            label,
                            kind: Some(InlayHintKind::PARAMETER),
                            text_edits: None,
                            tooltip,
                            padding_left: Some(false),
                            padding_right: Some(true),
                            data: None,
                        })
                    })
                    .collect::<Vec<_>>(),
            )
        })
        .flatten()
}

fn return_value_hints(
    root: &SyntaxNode,
    line_idx: &LineIndex,
    ctx: &SourceCtx,
    range: TextRange,
) -> impl Iterator<Item = InlayHint> {
    ctx.all_functions().filter_map(move |(_, func)| {
        let parameter_list = func
            .node
            .to_node(root)
            .children()
            .find_map(ast::ParameterList::cast)?;

        let offset = parameter_list.syntax().text_range().end();
        if !range.contains(offset) {
            return None;
        }

        let position = positions::position(line_idx, offset)?;

        let text = match &func.signature.back {
            FunctionBack::Return(typ) => {
                if *typ == Type::NULL {
                    return None;
                }

                format!("-> {}", ctx.type_to_str(typ))
            }
            FunctionBack::Yield(typ) => {
                format!("~> {}", ctx.type_to_str(typ))
            }
        };

        Some(InlayHint {
            position,
            label: InlayHintLabel::String(text),
            kind: Some(InlayHintKind::PARAMETER),
            text_edits: None,
            tooltip: None,
            padding_left: Some(true),
            padding_right: Some(false),
            data: None,
        })
    })
}
