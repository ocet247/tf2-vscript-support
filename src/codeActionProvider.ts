import { CancellationToken, CodeAction, CodeActionContext, Position, CodeActionKind, CodeActionProvider, Command, DiagnosticTag, ProviderResult, Range, Selection, TextDocument, WorkspaceEdit } from "vscode";
import * as vscriptGlobals from './globals';
import { CharCode, ForwardIterator } from "./textProcessing";


export default class TF2VScriptCodeActionProvider implements CodeActionProvider {
	private getParamRange(document: TextDocument, position: Position): { deleteRange: Range, insertText: string } | undefined {
		const iterator = new ForwardIterator(ForwardIterator.textFromPosition(document, position));
		const offset = document.offsetAt(position);

		while (true) {
			if (!iterator.hasNext()) {
				return;
			}
			const char = iterator.next();

			if (char === CharCode.LEFT_ROUND) {
				break;
			} else if (!CharCode.isWhitespace(char)) {
				return;
			}
		}
		const deleteStartPos = document.positionAt(offset + iterator.getCursor());

		let depth = 1;
		while (iterator.hasNext()) {
			let char = iterator.next();

			switch (char) {
			case CharCode.RIGHT_ROUND:
			case CharCode.RIGHT_CURLY:
			case CharCode.RIGHT_SQUARE:
				depth--;
				if (depth === 0) {
					const deleteEndPos = document.positionAt(offset + iterator.getCursor() - 1);
					const deleteRange = new Range(deleteStartPos, deleteEndPos);
					const insertText = document.getText(deleteRange).trim();

					return {
						deleteRange,
						insertText
					}
				}
				break;
			case CharCode.LEFT_CURLY:
			case CharCode.LEFT_SQUARE:
			case CharCode.LEFT_ROUND:
				depth++;
				break;
			case CharCode.DOUBLE_QUOTE:
			case CharCode.QUOTE:
			case CharCode.BACKTICK:
				const opening = char;
				// find the closing quote
				while (iterator.hasNext()) {
					char = iterator.next();
							
					// Ignore escape chars
					if (char === CharCode.BACKSLASH) {
						if (!iterator.hasNext()) {
							break;
						}

						iterator.next();
					}

					if (char === opening) {
						break;
					}
				}
				break;
			case CharCode.COMMA:
				if (depth !== 1) {
					continue;
				}

				const insertEndPos = document.positionAt(offset + iterator.getCursor() - 1);
				const insertText = document.getText(new Range(deleteStartPos, insertEndPos)).trim();
				
				while (iterator.hasNext()) {
					if (!CharCode.isWhitespace(iterator.next())) {
						break;
					}
				}

				const deleteEndPos = document.positionAt(offset + iterator.getCursor() - 1);
				const deleteRange = new Range(deleteStartPos, deleteEndPos);

				return {
					deleteRange,
					insertText
				}
			}
		}

		const deleteEndPos = document.positionAt(offset + iterator.getCursor());
		const deleteRange = new Range(deleteStartPos, deleteEndPos);
		const insertText = document.getText(deleteRange).trim();

		return {
			deleteRange,
			insertText
		}
	}

	private getCallBodyRange(document: TextDocument, position: Position): Range | undefined {
		const iterator = new ForwardIterator(ForwardIterator.textFromPosition(document, position));
		const offset = document.offsetAt(position);

		while (true) {
			if (!iterator.hasNext()) {
				return;
			}
			const char = iterator.next();

			if (char === CharCode.LEFT_ROUND) {
				break;
			} else if (!CharCode.isWhitespace(char)) {
				return;
			}
		}
		const startPos = document.positionAt(offset + iterator.getCursor());

		let depth = 1;
		while (iterator.hasNext()) {
			let char = iterator.next();

			switch (char) {
			case CharCode.RIGHT_ROUND:
			case CharCode.RIGHT_CURLY:
			case CharCode.RIGHT_SQUARE:
				depth--;
				if (depth === 0) {
					const endPos = document.positionAt(offset + iterator.getCursor() - 1);

					return new Range(startPos, endPos);
				}
				break;
			case CharCode.LEFT_CURLY:
			case CharCode.LEFT_SQUARE:
			case CharCode.LEFT_ROUND:
				depth++;
				break;
			case CharCode.DOUBLE_QUOTE:
			case CharCode.QUOTE:
			case CharCode.BACKTICK:
				const opening = char;
				// find the closing quote
				while (iterator.hasNext()) {
					char = iterator.next();
							
					// Ignore escape chars
					if (char === CharCode.BACKSLASH) {
						if (!iterator.hasNext()) {
							break;
						}

						iterator.next();
					}

					if (char === opening) {
						break;
					}
				}
			}
		}

		const endPos = document.positionAt(offset + iterator.getCursor());

		return new Range(startPos, endPos);
	}

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
				
				const ranges = this.getParamRange(document, diagnostic.range.end);
				
				if (!ranges) {
					continue;
				}

				const fix = new CodeAction(
					`Replace with method call`,
					CodeActionKind.QuickFix
				);


				fix.edit = new WorkspaceEdit();
				fix.edit.delete(document.uri, ranges.deleteRange);
				fix.edit.insert(document.uri, diagnostic.range.start, ranges.insertText + '.');

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
				const bodyRange = this.getCallBodyRange(document, diagnostic.range.end);
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
	
}