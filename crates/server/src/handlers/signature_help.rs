use lsp_types::{
    Documentation, MarkupContent, MarkupKind, ParameterInformation, ParameterLabel, SignatureHelp,
    SignatureHelpParams, SignatureInformation,
};
use resolver::{
    ExpressionKind, FunctionIdResolution, FunctionMarkdown, ParamsState, Primitive, Source,
    SourceCtx, Type, TypeState, VScriptDatabase, parse,
};
use sq_3_parser::{AstNode, ast};
use std::fmt::Write as _;

use crate::positions;

pub fn handle_signature_help<Db: VScriptDatabase>(
    db: &Db,
    params: SignatureHelpParams,
) -> anyhow::Result<Option<SignatureHelp>> {
    let uri = params.text_document_position_params.text_document.uri;
    let file = db
        .get_file(&uri)
        .ok_or_else(|| anyhow::format_err!("File not found in workspace"))?;
    let ctx = SourceCtx::new(db, file);

    let line_idx = positions::line_index(db, file);
    let offset = positions::text_size(line_idx, params.text_document_position_params.position)
        .ok_or_else(|| anyhow::format_err!("Position is out of bounds"))?;

    let syntax = parse(db, file).syntax();
    let node = syntax
        .token_at_offset(offset)
        .right_biased()
        .and_then(|t| t.parent())
        .ok_or_else(|| anyhow::format_err!("No node found"))?;

    let Some(call) = node.ancestors().find_map(ast::CallExpression::cast) else {
        return Ok(None);
    };

    let Some(callee) = call.callee() else {
        return Ok(None);
    };

    let kind = ctx.expr_kind_at(callee.syntax().text_range());
    let (name, typ) = match kind {
        Some(ExpressionKind::Literal(typ)) => (String::new(), typ),
        Some(ExpressionKind::Symbol(id)) => {
            let symbol = ctx.get(*id);
            (symbol.name.to_string(), &symbol.typ)
        }
        None => return Ok(None),
    };

    let id = match ctx.to_function_id(typ, offset) {
        Some(FunctionIdResolution::Function(id)) => id,
        Some(FunctionIdResolution::DefaultConstructor) => {
            return Ok(Some(SignatureHelp {
                signatures: vec![SignatureInformation {
                    label: format!("{name}()"),
                    parameters: None,
                    documentation: None,
                    active_parameter: None,
                }],
                active_signature: Some(0),
                active_parameter: None,
            }));
        }
        None => return Ok(None),
    };

    let mut active_param = 0;
    for (i, arg) in call.arguments().enumerate() {
        if arg.syntax().text_range().contains_inclusive(offset) {
            active_param = i;
            break;
        }

        if arg.syntax().text_range().end() < offset {
            active_param = i + 1;
        }
    }

    let func = ctx.get(id);
    let mut label = format!("{name}(");
    let mut param_infos: Vec<ParameterInformation> = Vec::new();
    let default_after = if let ParamsState::Default(after) = func.params_state {
        Some(after)
    } else {
        None
    };

    for (i, &param_id) in func.params.iter().enumerate() {
        if i > 0 {
            label.push_str(", ");
        }

        let start = u32::try_from(label.len()).unwrap_or(u32::MAX);
        let param = ctx.get(param_id);

        label.push_str(&param.name);
        if let Some(default_after) = default_after
            && i >= default_after
        {
            label.push('?');
        }
        let _ = write!(label, ": {}", ctx.type_to_str(&param.typ));

        param_infos.push(ParameterInformation {
            label: ParameterLabel::LabelOffsets([
                start,
                u32::try_from(label.len()).unwrap_or(u32::MAX),
            ]),
            documentation: param.description.clone().map(|d| {
                Documentation::MarkupContent(MarkupContent {
                    kind: MarkupKind::Markdown,
                    value: d,
                })
            }),
        });
    }

    if let ParamsState::VarArgs(after, vararg_id) = func.params_state {
        if !func.params.is_empty() {
            label.push_str(", ");
        }

        if active_param > after {
            active_param = after;
        }

        let start = u32::try_from(label.len()).unwrap_or(u32::MAX);
        let vararg = ctx.get(vararg_id);

        label.push_str("...vargv");
        if let Type::Primitive(Primitive::Array(Some(arr_id))) = &vararg.typ {
            let _ = write!(label, ": {}", ctx.type_to_str(&ctx.get(*arr_id).kind));
        }

        param_infos.push(ParameterInformation {
            label: ParameterLabel::LabelOffsets([
                start,
                u32::try_from(label.len()).unwrap_or(u32::MAX),
            ]),
            documentation: vararg.description.clone().map(|d| {
                Documentation::MarkupContent(MarkupContent {
                    kind: MarkupKind::Markdown,
                    value: d,
                })
            }),
        });
    }

    label.push(')');
    if func.throws != TypeState::Absent {
        label.push('!');
    }

    match &func.ret {
        TypeState::Absent => {}
        TypeState::NotExplicit(typ) | TypeState::Explicit(typ) => {
            if *typ != Type::NULL {
                let _ = write!(label, " -> {}", ctx.type_to_str(typ));
            }
        }
    }

    Ok(Some(SignatureHelp {
        signatures: vec![SignatureInformation {
            label,
            parameters: Some(param_infos),
            documentation: func
                .symbol
                .and_then(|s| ctx.get(s).description.clone())
                .map(|d| {
                    Documentation::MarkupContent(MarkupContent {
                        kind: MarkupKind::Markdown,
                        value: d,
                    })
                }),
            active_parameter: None,
        }],
        active_signature: Some(0),
        active_parameter: Some(u32::try_from(active_param).unwrap_or(u32::MAX)),
    }))
}
