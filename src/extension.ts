import * as vscode from 'vscode';

import TF2VScriptSignatureHelpProvider from './signatureHelpProvider';
import TF2VScriptHoverProvider from './hoverProvider';
import { TF2VScriptCompletionProvider, DocCompletionProvider } from './completionItemProvider';
import TF2VScriptDiagnosticsProvider from './diagnosticsProvider';
import TF2VScriptEnterHandler from './enterHandler';
import CurrentDocument from './documentState';

export function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration();
	const enableDiagnostics = config.get<boolean>('TF2VScript.enableDiagnostics', true);
	const enableSignatureHelp = config.get<boolean>('TF2VScript.enableSignatureHelp', true);

	if (enableSignatureHelp) {
		context.subscriptions.push(vscode.languages.registerSignatureHelpProvider('nut', new TF2VScriptSignatureHelpProvider(), '(', ','));
	}

	if (enableDiagnostics) {
		context.subscriptions.push(new TF2VScriptDiagnosticsProvider());
	}

	context.subscriptions.push(vscode.languages.registerHoverProvider('nut', new TF2VScriptHoverProvider()));
	context.subscriptions.push(vscode.languages.registerCompletionItemProvider('nut', new TF2VScriptCompletionProvider(), '.'));
	context.subscriptions.push(vscode.languages.registerCompletionItemProvider('nut', new DocCompletionProvider(), '@'));
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => TF2VScriptEnterHandler(event)));
	context.subscriptions.push(...CurrentDocument.disposables);
}

export function deactivate() { } 