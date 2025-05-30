import * as path from 'path';
import { Token } from 'squirrel';
import { workspace, ExtensionContext } from 'vscode';

import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import onEnterHandler from './onEnter';


let client: LanguageClient;

export function activate(context: ExtensionContext) {
	const serverModule = context.asAbsolutePath(
		path.join('out', 'server.js')
	);

	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
		}
	};

	const clientOptions: LanguageClientOptions = {
		documentSelector: [{ scheme: 'file', language: 'squirrel' }],
		synchronize: {
			fileEvents: workspace.createFileSystemWatcher('**/*.nut')
		}
	};

	client = new LanguageClient(
		'tf2vscript',
		'Team Fortress 2 VScript',
		serverOptions,
		clientOptions
	);

	client.start();

	context.subscriptions.push(
		workspace.onDidChangeTextDocument(async (event) => {
			const changes = event.contentChanges;
			if (!changes.length || !changes[0].text.includes('\n')) {
				return;
			}

			const indent = changes[0].text;
			if (indent.match(/\S+/)) {
				return;
			}
			const document = event.document;
			const offset = changes[0].rangeOffset;

			client.sendRequest('getToken', { uri: document.uri.toString(), offset: offset - 1 })
			.then(async (response) => {
				if (!response) {
					return;
				}

				const token = response as Token;
				await onEnterHandler(document, offset, indent, token);
			});
		})
	);
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	
	return client.stop();
}


