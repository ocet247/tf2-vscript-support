import {
	createConnection,
	TextDocuments,
	Diagnostic,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	TextDocumentSyncKind,
	InitializeResult,
	DocumentDiagnosticReportKind,
	DocumentDiagnosticReport,
	CodeActionKind,
	DiagnosticSeverity,
	DiagnosticTag
} from 'vscode-languageserver/node';
import { Range, TextDocument } from 'vscode-languageserver-textdocument';

import { isTokenAComment, Lexer, Token, TokenIterator, TokenKind } from 'squirrel';

import onHoverHandler from './onHover';
import { onCompletionHandler, onCompletionResolveHandler } from './onCompletion';
import onSignatureHelpHandler from './onSignatureHelp';
import onCodeActionHandler from './onCodeAction';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
export const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
// let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;
	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!capabilities.workspace?.configuration;
	hasWorkspaceFolderCapability = !!capabilities.workspace?.workspaceFolders;
	// hasDiagnosticRelatedInformationCapability = !!capabilities.textDocument?.publishDiagnostics?.relatedInformation;

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				triggerCharacters: [ '.', '@' ],
				resolveProvider: true
			},
			hoverProvider: true,
			signatureHelpProvider: {
				triggerCharacters: [ '(', ',']
			},
			diagnosticProvider: {
				interFileDependencies: false,
				workspaceDiagnostics: false
			},
			codeActionProvider: {
				codeActionKinds: [CodeActionKind.QuickFix],
				resolveProvider: false
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface Settings {
	enableSignatureHelp?: boolean,
	enableDiagnostics?: boolean,
	enableCompletions?: boolean,
	enableHover?: boolean,
	completionAutoParantheses?: boolean,
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: Settings = {
	enableSignatureHelp: true,
	enableDiagnostics: true,
	enableCompletions: true,
	enableHover: true,
	completionAutoParantheses: true
};

const documentSettings = new Map<string, Thenable<Settings>>();
let globalSettings: Settings = defaultSettings;

interface DocumentInfo {
	lexer: Lexer,
}

export const documentInfo = new Map<string, DocumentInfo>();


export function getDocumentSettings(resource: string): Thenable<Settings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'squirrel'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		documentSettings.clear();
	} else {
		globalSettings = change.settings["squirrel"] || defaultSettings;
	}

	connection.languages.diagnostics.refresh();
});

connection.languages.diagnostics.on(async (params): Promise<DocumentDiagnosticReport> => {
	const document = documents.get(params.textDocument.uri);
	if (!document) {
		return {
			kind: DocumentDiagnosticReportKind.Full,
			items: []
		};
	}

	return {
		kind: DocumentDiagnosticReportKind.Full,
		items: await validateTextDocument(document)
	};
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});


documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
	documentInfo.delete(e.document.uri);
});

documents.listen(connection);

connection.onDidChangeWatchedFiles(_change => {
	connection.console.log('We received a file change event');
});

connection.onRequest('getToken', (params: { uri: string, offset: number }): Token | null => {
	const info = documentInfo.get(params.uri);
	if (!info) {
		return null;
	}

	return info.lexer.findTokenAtPosition(params.offset).token;
}); 


async function validateTextDocument(document: TextDocument): Promise<Diagnostic[]> {
	const settings = await getDocumentSettings(document.uri);
	const text = document.getText();
	const lexer = new Lexer(text);
	for (let token = lexer.lex(); token.kind !== TokenKind.EOF; token = lexer.lex()) {
		// lex
	}

	documentInfo.set(document.uri, {
		lexer
	});

	if (!settings.enableDiagnostics) {
		return [];
	}

	const diagnostics: Diagnostic[] = [];

	diagnostics.push(...runParse(document));
	
	for (const error of lexer.getErrors()) {
		diagnostics.push({
			range: {
				// Conversion from 0 based offset
				start: document.positionAt(error.start),
				end: document.positionAt(error.end)
			},
			message: error.message,
			source: "lexer"
		});
	}

	return diagnostics;
}

function runParse(document: TextDocument): Diagnostic[] {
	const info = documentInfo.get(document.uri);
	if (!info) {
		return [];
	}

	const diagnostics: Diagnostic[] = [];

	const iterator = new TokenIterator(info.lexer.getTokens());
	while (iterator.hasNext()) {
		const token = iterator.next();
		if (token.kind != TokenKind.IDENTIFIER) {
			continue;
		}

		const lastIndex = iterator.getIndex();
		// 2 steps back because the we're on the token after the identifier, while we need a token before it
		iterator.setIndex(lastIndex - 2);
		const doc = iterator.findMethodDoc(token.value);

		iterator.setIndex(lastIndex);
		if (!doc) {
			continue;
		}

		const signature = doc.detail;
		const range: Range = {
			start: document.positionAt(token.start),
			end: document.positionAt(token.end)
		};
		
		if ("successor" in doc) {
			const diagnostic: Diagnostic = {
				range,
				message: `'${signature}' is deprecated.`,
				severity: DiagnosticSeverity.Hint,
				tags: [DiagnosticTag.Deprecated],
				source: 'parser'
			};
			diagnostics.push(diagnostic);
		}

		const usedParamCount = getUsedParamCount(iterator);
		if (usedParamCount === -1) {
			iterator.setIndex(lastIndex);
			continue;
		}
		iterator.setIndex(lastIndex + 1);

		const { minParamCount, maxParamCount } = getParamCount(signature);
		
		let message: string;
		if (maxParamCount === -1) {
			if (usedParamCount >= minParamCount) {
				continue;
			}

			message = `Expected at least ${minParamCount} arguments, but got ${usedParamCount}.`;
		} else {
			if (usedParamCount <= maxParamCount && usedParamCount >= minParamCount) {
				continue;
			}

			message = minParamCount === maxParamCount ?
				`Expected ${minParamCount} arguments, but got ${usedParamCount}.` :
				`Expected ${minParamCount}-${maxParamCount} arguments, but got ${usedParamCount}.`;
		}

		diagnostics.push({
			range,
			message,
			severity: DiagnosticSeverity.Error,
			source: 'parser'
		});
	}

	return diagnostics;
}

function getParamCount(signature: string): { minParamCount: number, maxParamCount: number } {
	const open = signature.indexOf('(');
	const close = signature.lastIndexOf(')');

	// If close + 2 is further than open it means we have no parameters
	// E.g GetListenServerHost() -> GetListenServerHost )( 
	if (open === -1 || close === -1 || close < open + 2) {
		return {
			minParamCount: 0,
			maxParamCount: 0
		};
	}
	
	const lexer = new Lexer(signature.slice(open + 1, close));

	let paramCount = 1;
	let defaultParamCount = 0;
	let isVariadic = false;
	for (let token = lexer.lex(); token.kind != TokenKind.EOF; token = lexer.lex()) {
		switch (token.kind) {
		case TokenKind.COMMA:
			paramCount++;
			break;
		case TokenKind.ASSIGN:
			defaultParamCount++;
			break;
		case TokenKind.VARPARAMS:
			isVariadic = true;
			break;
		}
	}

	return {
		minParamCount: paramCount - defaultParamCount - (isVariadic ? 1 : 0),
		maxParamCount: isVariadic ? -1 : paramCount
	};
}

function getUsedParamCount(iterator: TokenIterator): number {
	// Find the (
	while (iterator.hasNext()) {
		const token = iterator.next();
		if (isTokenAComment(token) || token.kind === TokenKind.LINE_FEED) {
			continue;
		}
		if (token.kind === TokenKind.LEFT_ROUND) {
			break;
		}

		return -1;
	}
	

	let depth = 1;
	let paramCount = 0;
	let foundParam = false;
	
	while (iterator.hasNext()) {
		const token = iterator.next();
		switch (token.kind) {
		case TokenKind.RIGHT_ROUND:
		case TokenKind.RIGHT_CURLY:
		case TokenKind.RIGHT_SQUARE:
			depth--;
			if (depth === 0) {
				return foundParam ? paramCount + 1 : 0;
			}
			break;
		case TokenKind.LEFT_ROUND:
		case TokenKind.LEFT_CURLY:
		case TokenKind.LEFT_SQUARE:
			depth++;
			break;
		case TokenKind.COMMA:
			if (depth === 1) {
				paramCount++;
			}
			break;
		}

		if (!foundParam && !isTokenAComment(token) && token.kind != TokenKind.LINE_FEED) {
			foundParam = true;
		}
	}

	return foundParam ? paramCount + 1 : 0;
}

connection.onCompletion(onCompletionHandler);
connection.onCompletionResolve(onCompletionResolveHandler);
connection.onHover(onHoverHandler);
connection.onSignatureHelp(onSignatureHelpHandler);
connection.onCodeAction(onCodeActionHandler);

connection.listen();
