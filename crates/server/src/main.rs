mod handlers;
mod positions;
mod session;
#[allow(
    unused,
    clippy::all,
    clippy::nursery,
    clippy::pedantic,
    clippy::unwrap_used,
    unsafe_code
)]
mod vendored;
use std::{panic::RefUnwindSafe, path::PathBuf};

use anyhow::Result;
use lsp_server::Connection;
use lsp_types::{
    CompletionOptions, DiagnosticOptions, DiagnosticServerCapabilities, DocumentLinkOptions,
    FileChangeType, HoverProviderCapability, InitializeParams, InitializeResult, NumberOrString,
    OneOf, RenameOptions, SelectionRangeProviderCapability, SemanticTokenModifier,
    SemanticTokenType, SemanticTokensFullOptions, SemanticTokensLegend, SemanticTokensOptions,
    SemanticTokensServerCapabilities, ServerCapabilities, SignatureHelpOptions,
    TextDocumentSyncCapability, TextDocumentSyncKind, TypeDefinitionProviderCapability,
    WorkDoneProgressOptions,
    notification::{
        Cancel, DidChangeConfiguration, DidChangeTextDocument, DidChangeWatchedFiles,
        DidCloseTextDocument, DidOpenTextDocument, DidSaveTextDocument, LogTrace, SetTrace,
    },
    request::{
        Completion, DocumentDiagnosticRequest, DocumentHighlightRequest, DocumentLinkRequest,
        DocumentSymbolRequest, GotoDefinition, GotoTypeDefinition, HoverRequest,
        InlayHintRefreshRequest, InlayHintRequest, PrepareRenameRequest, References, Rename,
        SelectionRangeRequest, SemanticTokensFullRequest, SemanticTokensRangeRequest,
        SignatureHelpRequest, WorkspaceDiagnosticRefresh, WorkspaceDiagnosticRequest,
        WorkspaceSymbolRequest,
    },
};
use resolver::{
    Database, UnreachableCode, UnusedVariables, VScriptDatabase, VScriptDbConfig,
    VScriptDbInitConfig,
};
use salsa::Setter as _;
use serde_json::Value;

use crate::session::{NotificationHandlers, RequestHandlers, Session};

fn main() -> Result<()> {
    let (connection, io_threads) = Connection::stdio();

    stderrlog::new()
        .modules([module_path!(), "resolver"])
        .verbosity(4)
        .init()
        .expect("It's the first logger we initialise");

    let (id, init_result) = connection.initialize_start()?;
    let params: InitializeParams = serde_json::from_value(init_result)?;

    let init_config = extract_init_config(&params);
    let mut db = Database::new(init_config);

    let config = extract_config(params.initialization_options.as_ref());
    db.update_config(config);

    let server_capabilities = ServerCapabilities {
        text_document_sync: Some(TextDocumentSyncCapability::Kind(
            TextDocumentSyncKind::INCREMENTAL,
        )),
        diagnostic_provider: Some(DiagnosticServerCapabilities::Options(DiagnosticOptions {
            identifier: Some("vscript-native".to_owned()),
            inter_file_dependencies: true,
            workspace_diagnostics: true,
            work_done_progress_options: WorkDoneProgressOptions::default(),
        })),
        completion_provider: Some(CompletionOptions {
            trigger_characters: Some(vec![
                ".".to_owned(),
                "\"".to_owned(),
                "@".to_owned(),
                "{".to_owned(),
                "[".to_owned(),
                "|".to_owned(),
                "*".to_owned(),
            ]),
            ..Default::default()
        }),
        definition_provider: Some(OneOf::Left(true)),
        hover_provider: Some(HoverProviderCapability::Simple(true)),
        semantic_tokens_provider: Some(SemanticTokensServerCapabilities::SemanticTokensOptions(
            SemanticTokensOptions {
                legend: SemanticTokensLegend {
                    token_types: vec![
                        SemanticTokenType::VARIABLE,
                        SemanticTokenType::PARAMETER,
                        SemanticTokenType::FUNCTION,
                        SemanticTokenType::CLASS,
                        SemanticTokenType::PROPERTY,
                        SemanticTokenType::ENUM,
                        SemanticTokenType::ENUM_MEMBER,
                    ],
                    token_modifiers: vec![
                        SemanticTokenModifier::READONLY,
                        SemanticTokenModifier::STATIC,
                        SemanticTokenModifier::DEPRECATED,
                    ],
                },
                full: Some(SemanticTokensFullOptions::Bool(true)),
                range: Some(true),
                ..Default::default()
            },
        )),
        document_symbol_provider: Some(OneOf::Left(true)),
        references_provider: Some(OneOf::Left(true)),
        workspace_symbol_provider: Some(OneOf::Left(true)),
        rename_provider: Some(OneOf::Right(RenameOptions {
            prepare_provider: Some(true),
            work_done_progress_options: WorkDoneProgressOptions::default(),
        })),
        signature_help_provider: Some(SignatureHelpOptions {
            trigger_characters: Some(vec!["(".to_owned(), ",".to_owned()]),
            ..Default::default()
        }),
        inlay_hint_provider: Some(OneOf::Left(true)),
        type_definition_provider: Some(TypeDefinitionProviderCapability::Simple(true)),
        document_link_provider: Some(DocumentLinkOptions {
            resolve_provider: Some(false),
            work_done_progress_options: WorkDoneProgressOptions::default(),
        }),
        selection_range_provider: Some(SelectionRangeProviderCapability::Simple(true)),
        document_highlight_provider: Some(OneOf::Left(true)),
        ..Default::default()
    };

    let init_value = serde_json::to_value(InitializeResult {
        capabilities: server_capabilities,
        ..Default::default()
    })?;
    connection.initialize_finish(id, init_value)?;

    let session = Session::new(connection, db);

    let mut request_registry = RequestHandlers::<Database>::default();
    let mut notification_registry = NotificationHandlers::<Database>::default();

    session.main_loop(
        on_requests(&mut request_registry),
        on_notifications(&mut notification_registry),
    )?;
    io_threads.join()?;

    eprintln!("shutting down server");
    Ok(())
}

fn on_requests<Db: VScriptDatabase + Clone + RefUnwindSafe>(
    registry: &mut RequestHandlers<Db>,
) -> &mut RequestHandlers<Db> {
    registry
        .on_latency_sensitive::<Completion>(handlers::handle_completion)
        .on_latency_sensitive::<HoverRequest>(handlers::handle_hover)
        .on_latency_sensitive::<PrepareRenameRequest>(handlers::handle_prepare_rename)
        .on_latency_sensitive::<SemanticTokensFullRequest>(handlers::handle_semantic_tokens_full)
        .on_latency_sensitive::<SemanticTokensRangeRequest>(handlers::handle_semantic_tokens_range)
        .on_latency_sensitive::<SignatureHelpRequest>(handlers::handle_signature_help)
        .on::<DocumentDiagnosticRequest>(handlers::handle_diagnostics)
        .on::<WorkspaceDiagnosticRequest>(handlers::handle_workspace_diagnostics)
        .on::<DocumentLinkRequest>(handlers::handle_document_link)
        .on::<DocumentSymbolRequest>(handlers::handle_document_symbol)
        .on::<References>(handlers::handle_references)
        .on::<WorkspaceSymbolRequest>(handlers::handle_workspace_symbol)
        .on::<GotoDefinition>(handlers::handle_go_to_definition)
        .on::<GotoTypeDefinition>(handlers::handle_go_to_type_definition)
        .on::<InlayHintRequest>(handlers::handle_inlay_hint)
        .on::<Rename>(handlers::handle_rename)
        .on::<SelectionRangeRequest>(handlers::handle_selection_range)
        .on::<DocumentHighlightRequest>(handlers::handle_document_highlight)
}

fn on_notifications<Db: VScriptDatabase + Clone + RefUnwindSafe>(
    registry: &mut NotificationHandlers<Db>,
) -> &mut NotificationHandlers<Db> {
    registry
        .on_mut::<DidOpenTextDocument>(|session, params| {
            let uri = &params.text_document.uri;
            let text = params.text_document.text;
            if let Some(file) = session.db.get_file(uri) {
                file.set_text(&mut session.db).to(text);
            } else {
                session.db.open_file(uri, text);
            }

            Ok(())
        })
        .on_mut::<DidChangeTextDocument>(|session, params| {
            let uri = &params.text_document.uri;
            let file = session
                .db
                .get_file(uri)
                .ok_or_else(|| anyhow::format_err!("File not found in workspace"))?;

            let new_version = file.version(&session.db) + 1;
            if params.text_document.version != new_version {
                return Err(anyhow::format_err!("Document versions are out of sync"));
            }

            let mut text = file.text(&session.db).clone();
            let line_index = positions::line_index(&session.db, file);

            let mut changes: Vec<_> = params
                .content_changes
                .into_iter()
                .filter_map(|change| {
                    let Some(range) = change.range else {
                        text = change.text;
                        return None;
                    };
                    let text_range = positions::text_range(line_index, range)?;
                    let range: std::ops::Range<usize> = text_range.into();
                    if range.end > text.len() {
                        log::error!(
                            "Invalid edit range {:?}, document length {}",
                            range,
                            text.len()
                        );
                        return None;
                    }

                    Some((range, change.text))
                })
                .collect();

            changes.sort_by_key(|(range, _)| range.start);
            for (range, new_text) in changes.into_iter().rev() {
                text.replace_range(range, &new_text);
            }

            file.set_text(&mut session.db).to(text);
            file.set_version(&mut session.db).to(new_version);

            Ok(())
        })
        .on_mut::<DidChangeConfiguration>(|session, params| {
            let settings = params.settings;
            let config = extract_config(Some(&settings));
            session.db.update_config(config);
            session.refresh_request::<WorkspaceDiagnosticRefresh>();
            session.refresh_request::<InlayHintRefreshRequest>();
            Ok(())
        })
        .on_mut::<DidChangeWatchedFiles>(|session, params| {
            for change in params.changes {
                let uri = &change.uri;
                match change.typ {
                    FileChangeType::CHANGED | FileChangeType::CREATED => {
                        let Ok(path) = uri.to_file_path() else {
                            continue;
                        };
                        let Ok(text) = std::fs::read_to_string(&path) else {
                            continue;
                        };

                        if let Some(file) = session.db.get_file(uri) {
                            file.set_text(&mut session.db).to(text);
                        } else {
                            session.db.open_file(uri, text);
                        }
                    }
                    FileChangeType::DELETED => {
                        let file = session.db.delete_file(uri);
                        if let Some(file) = file {
                            file.set_text(&mut session.db).to(String::new());
                        }
                    }
                    _ => {}
                }
            }
            Ok(())
        })
        .on_mut::<Cancel>(|s, p| {
            let id: lsp_server::RequestId = match p.id {
                NumberOrString::Number(id) => id.into(),
                NumberOrString::String(id) => id.into(),
            };
            if let Some(response) = s.req_queue.incoming.cancel(id) {
                s.connection.sender.send(response.into())?;
            }
            Ok(())
        })
        .on::<DidCloseTextDocument>(|_s, _p| Ok(()))
        .on::<DidSaveTextDocument>(|_s, _p| Ok(()))
        .on::<SetTrace>(|_s, _p| Ok(()))
        .on::<LogTrace>(|_s, _p| Ok(()))
}

fn extract_init_config(params: &InitializeParams) -> VScriptDbInitConfig {
    let options = params.initialization_options.as_ref();

    VScriptDbInitConfig {
        std_lib_path: options
            .and_then(|o| o.get("stdLibPath"))
            .and_then(|v| v.as_str())
            .map(PathBuf::from),
    }
}

fn extract_config(options: Option<&Value>) -> VScriptDbConfig {
    VScriptDbConfig {
        tf2_root_path: options
            .and_then(|o| o.get("tf2RootPath"))
            .and_then(|v| v.as_str())
            .map(PathBuf::from),
        unused_variables: match options
            .and_then(|o| o.get("unusedVariables"))
            .and_then(|v| v.as_str())
            .unwrap_or("hint")
        {
            "warn" => UnusedVariables::Warn,
            "off" => UnusedVariables::Off,
            _ => UnusedVariables::Hint,
        },
        unreachable_code: match options
            .and_then(|o| o.get("unreachableCode"))
            .and_then(|v| v.as_str())
            .unwrap_or("warn")
        {
            "hint" => UnreachableCode::Hint,
            "off" => UnreachableCode::Off,
            _ => UnreachableCode::Warn,
        },
        type_hints: options
            .and_then(|o| o.get("inlayHints"))
            .and_then(|o| o.get("typeHints"))
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true),
        enum_member_value_hints: options
            .and_then(|o| o.get("inlayHints"))
            .and_then(|o| o.get("enumMemberValue"))
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true),
        parameter_hints: options
            .and_then(|o| o.get("inlayHints"))
            .and_then(|o| o.get("parameterHints"))
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true),
        return_value_hints: options
            .and_then(|o| o.get("inlayHints"))
            .and_then(|o| o.get("returnValueHints"))
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true),
        workspace_diagnostics: options
            .and_then(|o| o.get("workspaceDiagnostics"))
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false),
    }
}
