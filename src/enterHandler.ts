import { Position, Range, Selection, TextDocumentChangeEvent, window } from "vscode";
import { CharCode, ForwardIterator } from "./textProcessing";
import CurrentDocument from "./documentState";
import { Lexer, TokenKind, Token } from "./lexer";


function isCommentClosed(lexer: Lexer, token: Token): boolean {
	const diagnostics = lexer.getDiagnostics();
	if (diagnostics.length === 0) {
		return token.value.indexOf('/*', 2) === -1;
	}

	return diagnostics[diagnostics.length - 1].message !== "'*/' expected.";
}

function getIndentData(event: TextDocumentChangeEvent): { offset: number, indent: string } | null {
	for (const change of event.contentChanges) {
		if (change.text.slice(0, 1) === '\n') {
			return {
				offset: change.rangeOffset,
				indent: change.text.slice(1)
			};
		}

		if (change.text.slice(0, 2) === '\r\n') {
			return {
				offset: change.rangeOffset,
				indent: change.text.slice(2)
			};
		}
	}
	return null;
}

export default async function TF2VScriptEnterHandler(event: TextDocumentChangeEvent) {
	if (!CurrentDocument.isInNut()) {
		return;
	}

	const editor = window.activeTextEditor;
	if (!editor) {
		return;
	}
	
	const indentData = getIndentData(event);
	if (!indentData) {
		return;
	}

	const { offset, indent } = indentData;

	const lexer = CurrentDocument.getLexer();
	const token = lexer.getTokenAtPosition(offset);
	if (!token) {
		return;
	}

	const document = editor.document;
	const position = editor.selection.active;

	const newlinePos = new Position(position.line + 1, indent.length);

	if (token.kind === TokenKind.STRING) {
		await editor.edit(editBuilder => {
			editBuilder.insert(position, '" +')
			editBuilder.insert(newlinePos, '"')
		});
		
		return;
	}

	if (token.kind === TokenKind.BLOCK_COMMENT) {
		if (!isCommentClosed(lexer, token)) {
			await editor.edit(editBuilder => {
				editBuilder.insert(newlinePos, `\r\n${indent} */`);
			});
	
			const newPosition = new Position(position.line + 1, indent.length);
			editor.selection = new Selection(newPosition, newPosition);
		}

		return;
	}

	if (token.kind === TokenKind.DOC) {
		if (!isCommentClosed(lexer, token)) {
			await editor.edit(editBuilder => {
				editBuilder.insert(newlinePos, ` * \r\n${indent} */`);
			});

			const newPosition = new Position(position.line + 1, 3 + indent.length);
			editor.selection = new Selection(newPosition, newPosition);
		} else {
			const docPos = document.positionAt(token.start);
			const line = document.lineAt(docPos.line).text;
			const iterator = new ForwardIterator(line);
			let ident = '';
			while (iterator.hasNext()) {
				const char = iterator.next();
				if (CharCode.isWhitespace(char)) {
					ident += String.fromCharCode(char);
				} else {
					break;
				}
			}

			await editor.edit(editBuilder => {
				editBuilder.replace(new Range(new Position(newlinePos.line, 0), newlinePos), `${ident} * `);
			});

			const newPosition = new Position(position.line + 1, ident.length + 3);
			editor.selection = new Selection(newPosition, newPosition);
		}

		return;
	}
}
