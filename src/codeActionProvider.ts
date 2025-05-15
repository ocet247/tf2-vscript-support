import { CancellationToken, CodeAction, CodeActionContext, Position, CodeActionKind, CodeActionProvider, Command, DiagnosticTag, ProviderResult, Range, Selection, TextDocument, WorkspaceEdit } from "vscode";
import * as vscriptGlobals from './globals';
import { Token, TokenIterator, TokenKind } from "./lexer";
import CurrentDocument from "./documentState";


export default class TF2VScriptCodeActionProvider implements CodeActionProvider {
	public provideCodeActions(document: TextDocument, range: Range, context: CodeActionContext, token: CancellationToken): CodeAction[] {
		const fixes: CodeAction[] = []
		for (const diagnostic of context.diagnostics) {
			if (!diagnostic.tags?.includes(DiagnosticTag.Deprecated)) {
				continue;
			}
			
			const name = document.getText(diagnostic.range);
			const entry = vscriptGlobals.allDeprecatedMethods.get(name);
			if (!entry) {
				const entry = vscriptGlobals.allDeprecatedFunctions.get(name);
				if (!entry) {
					continue;
				}
				
				const lexer = CurrentDocument.getLexer();
				const tokenIndex = lexer.getTokenAtPosition(document.offsetAt(diagnostic.range.end)).index;
				const iterator = new TokenIterator(lexer.getTokens(), tokenIndex);

				const param = this.getFirstParam(document, iterator);
				
				if (!param) {
					continue;
				}

				const fix = new CodeAction(
					`Replace with method call`,
					CodeActionKind.QuickFix
				);


				fix.edit = new WorkspaceEdit();
				fix.edit.delete(document.uri, param.deleteRange);
				fix.edit.insert(document.uri, diagnostic.range.start, param.text + '.');

				fixes.push(fix);
				
				continue;
			}


			const successor = entry.successor;
			if (!successor) {
				continue;
			}

			const fix = new CodeAction(
				`Replace with '${successor}'`,
				CodeActionKind.QuickFix
			);

			fix.edit = new WorkspaceEdit();
			fix.edit.replace(document.uri, diagnostic.range, successor);

			// Yes a hardcode
			if (successor === "SetAbsAngles") {
				const lexer = CurrentDocument.getLexer();
				const tokenIndex = lexer.getTokenAtPosition(document.offsetAt(diagnostic.range.end)).index;
				const iterator = new TokenIterator(lexer.getTokens(), tokenIndex);

				const bodyRange = this.getCallBodyRange(document, iterator);
				if (bodyRange) {
					fix.edit.insert(document.uri, bodyRange.start, "QAngle(");
					fix.edit.insert(document.uri, bodyRange.end, ")");
				}
			}
			

			fix.diagnostics = [diagnostic];

			fixes.push(fix);
		}
		return fixes;
	}

	private getFirstParam(document: TextDocument, iterator: TokenIterator): { deleteRange: Range, text: string } | undefined {
		let depth = 0;
		let startPos: Position | null = null;
		let token: Token | null = null;
		while (iterator.hasNext()) {
			token = iterator.next();

			switch (token.kind) {
			case TokenKind.RIGHT_ROUND:
			case TokenKind.RIGHT_CURLY:
			case TokenKind.RIGHT_SQUARE:
				depth--;
				if (depth === 0 && startPos) {
					const deleteRange = new Range(startPos, document.positionAt(token.start));
					const text = document.getText(deleteRange);

					return {
						deleteRange,
						text
					}
				}
				break;
			case TokenKind.LEFT_CURLY:
			case TokenKind.LEFT_SQUARE:
			case TokenKind.LEFT_ROUND:
				if (depth === 0) {
					startPos = document.positionAt(token.end);
				}
				depth++;
				break;
			case TokenKind.COMMA:
				if (startPos) {
					const text = document.getText(new Range(startPos, document.positionAt(token.start)));

					token = iterator.next();
					const deleteRange = new Range(startPos, document.positionAt(token.start));
					
					return {
						deleteRange,
						text
					}
				}
			}
		}

		if (!startPos || !token) {
			return;
		}

		const deleteRange = new Range(startPos, document.positionAt(token.end));
		const text = document.getText(deleteRange);

		return {
			deleteRange,
			text
		}
	}
	
	private getCallBodyRange(document: TextDocument, iterator: TokenIterator): Range | undefined {
		let depth = 0;
		let startPos: Position | null = null;
		let token: Token | null = null;
		while (iterator.hasNext()) {
			token = iterator.next();

			switch (token.kind) {
			case TokenKind.RIGHT_ROUND:
			case TokenKind.RIGHT_CURLY:
			case TokenKind.RIGHT_SQUARE:
				depth--;
				if (depth === 0 && startPos) {
					return new Range(startPos, document.positionAt(token.start));
				}
				break;
			case TokenKind.LEFT_CURLY:
			case TokenKind.LEFT_SQUARE:
			case TokenKind.LEFT_ROUND:
				if (depth === 0) {
					startPos = document.positionAt(token.end);
				}
				depth++;
				break;
			}
		}

		if (!startPos || !token) {
			return;
		}

		return new Range(startPos, document.positionAt(token.end))
		
	}
}