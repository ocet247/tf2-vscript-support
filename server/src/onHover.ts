import { Hover, MarkupKind, TextDocumentPositionParams } from 'vscode-languageserver';
import { documents, getDocumentSettings, documentInfo } from './server';
import { TokenIterator, TokenKind, isTokenAComment } from 'squirrel';


export default async function onHoverHandler(params: TextDocumentPositionParams): Promise<Hover | null> {
	const document = documents.get(params.textDocument.uri);
	if (!document) {
		return null;
	}

	const settings = await getDocumentSettings(document.uri);
	if (!settings.enableHover) {
		return null;
	}

	const info = documentInfo.get(document.uri);
	if (!info) {
		return null;
	}
	const { lexer } = info;


	const position = params.position;
	const offset = document.offsetAt(position) - 1;

	const result = lexer.findTokenAtPosition(offset);
	if (!result.token || isTokenAComment(result.token) || result.token.kind !== TokenKind.IDENTIFIER) {
		return null;
	}

	const name = result.token.value;
	

	const iterator = new TokenIterator(lexer.getTokens(), result.index - 1);
	const doc = iterator.findDoc(name);
	if (!doc) {
		return null;
	}

	let contents = "```squirrelDoc\n" + doc.detail + "\n```\n";
	if (doc.desc) {
		contents += doc.desc;
	}

	return {
		contents: {
			kind: MarkupKind.Markdown,
			value: contents
		}
	};
}