use db::{Url, key_to_url};
use lsp_types::{
    Diagnostic, DiagnosticSeverity, DiagnosticTag, DocumentDiagnosticParams,
    DocumentDiagnosticReport, DocumentDiagnosticReportResult, FullDocumentDiagnosticReport,
    RelatedFullDocumentDiagnosticReport, WorkspaceDiagnosticParams, WorkspaceDiagnosticReport,
    WorkspaceDiagnosticReportResult, WorkspaceDocumentDiagnosticReport,
    WorkspaceFullDocumentDiagnosticReport,
};
use resolver::{Source as _, SourceCtx, VScriptDatabase, parse};

use crate::positions;

#[allow(clippy::needless_pass_by_value)]
pub fn handle_diagnostics<Db: VScriptDatabase>(
    db: &Db,
    params: DocumentDiagnosticParams,
) -> anyhow::Result<DocumentDiagnosticReportResult> {
    let uri = &params.text_document.uri;

    let mut diagnostics = compute_syntax_diagnostics(db, uri)?;
    diagnostics.extend(compute_semantic_diagnostics(db, uri)?);

    Ok(DocumentDiagnosticReportResult::Report(
        DocumentDiagnosticReport::Full(RelatedFullDocumentDiagnosticReport {
            related_documents: None,
            full_document_diagnostic_report: FullDocumentDiagnosticReport {
                result_id: None,
                items: diagnostics,
            },
        }),
    ))
}

pub fn handle_workspace_diagnostics<Db: VScriptDatabase>(
    db: &Db,
    _params: WorkspaceDiagnosticParams,
) -> anyhow::Result<WorkspaceDiagnosticReportResult> {
    if !db.config().workspace_diagnostics {
        let items = db
            .get_keys()
            .iter()
            .map(|key| {
                WorkspaceDocumentDiagnosticReport::Full(WorkspaceFullDocumentDiagnosticReport {
                    uri: key_to_url(&key),
                    version: None,
                    full_document_diagnostic_report: FullDocumentDiagnosticReport {
                        result_id: None,
                        items: Vec::new(),
                    },
                })
            })
            .collect();

        return Ok(WorkspaceDiagnosticReportResult::Report(
            WorkspaceDiagnosticReport { items },
        ));
    }

    let mut items = Vec::new();

    for entry in db.get_files() {
        let url = key_to_url(entry.key());

        let mut diagnostics = compute_syntax_diagnostics(db, &url)?;
        diagnostics.extend(compute_semantic_diagnostics(db, &url)?);

        items.push(WorkspaceDocumentDiagnosticReport::Full(
            WorkspaceFullDocumentDiagnosticReport {
                uri: url,
                version: None,
                full_document_diagnostic_report: FullDocumentDiagnosticReport {
                    result_id: None,
                    items: diagnostics,
                },
            },
        ));
    }

    Ok(WorkspaceDiagnosticReportResult::Report(
        WorkspaceDiagnosticReport { items },
    ))
}

fn compute_syntax_diagnostics<Db: VScriptDatabase>(
    db: &Db,
    url: &Url,
) -> anyhow::Result<Vec<Diagnostic>> {
    let file = db
        .get_file(url)
        .ok_or_else(|| anyhow::format_err!("File not found in workspace"))?;

    let line_idx = positions::line_index(db, file);
    let parse = parse(db, file);

    Ok(parse
        .errors()
        .iter()
        .filter_map(|error| {
            Some(Diagnostic {
                message: error.message().to_owned(),
                range: positions::range(line_idx, error.range())?,
                ..Default::default()
            })
        })
        .collect())
}

fn compute_semantic_diagnostics<Db: VScriptDatabase>(
    db: &Db,
    url: &Url,
) -> anyhow::Result<Vec<Diagnostic>> {
    let file = db
        .get_file(url)
        .ok_or_else(|| anyhow::format_err!("File not found in workspace"))?;
    let ctx = SourceCtx::new(db, file);

    let line_idx = positions::line_index(db, file);

    Ok(ctx
        .diagnostics()
        .iter()
        .filter_map(|diagnostic| {
            let (severity, tags) = match diagnostic.severity {
                resolver::DiagnosticSeverity::Error => (DiagnosticSeverity::ERROR, None),
                resolver::DiagnosticSeverity::Warning => (DiagnosticSeverity::WARNING, None),
                resolver::DiagnosticSeverity::Information => {
                    (DiagnosticSeverity::INFORMATION, None)
                }
                resolver::DiagnosticSeverity::UnnecessaryWarn => (
                    DiagnosticSeverity::WARNING,
                    Some(vec![DiagnosticTag::UNNECESSARY]),
                ),
                resolver::DiagnosticSeverity::UnnecessaryHint => (
                    DiagnosticSeverity::HINT,
                    Some(vec![DiagnosticTag::UNNECESSARY]),
                ),
                resolver::DiagnosticSeverity::Deprecated => (
                    DiagnosticSeverity::HINT,
                    Some(vec![DiagnosticTag::DEPRECATED]),
                ),
            };
            Some(Diagnostic {
                message: diagnostic.message.clone(),
                range: positions::range(line_idx, diagnostic.range)?,
                severity: Some(severity),
                tags,
                ..Default::default()
            })
        })
        .collect())
}
