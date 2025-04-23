import { CompletionItemProvider, CompletionItem, CompletionItemKind, CancellationToken, TextEdit, TextDocument, Position, MarkdownString, SnippetString, CompletionContext, Range } from 'vscode';
import * as vscriptGlobals from './globals'
import { BackwardIterator, CharCode } from './textProcessing';

export default class TF2VScriptCompletionProvider implements CompletionItemProvider {
	public provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken, _context: CompletionContext): Promise<CompletionItem[]> {
		const items: CompletionItem[] = [];
		const iterator = new BackwardIterator(BackwardIterator.textFromPosition(document, position));

		const dotRange = this.getDotRange(document, iterator);
		if (dotRange) {
			const read = this.readDotLeftHand(iterator);
			if (typeof read === "string") {
				const methods = vscriptGlobals.instancesMethods[read];
				if (methods) {
					this.addFunctionItem(items, methods, CompletionItemKind.Method);
					return Promise.resolve(items);
				}

				if (read === "Constants") {
					this.addFunctionItem(items, vscriptGlobals.builtInEnums, CompletionItemKind.Enum);
					return Promise.resolve(items);
				}

				const variables = vscriptGlobals.enumMembers[read];
				if (variables) {
					this.addFunctionItem(items, variables, CompletionItemKind.EnumMember);
					return Promise.resolve(items);
				}

				// If we have not found this instance name in our saved completions
				this.addFunctionItem(items, vscriptGlobals.allMethods, CompletionItemKind.Method);
				return Promise.resolve(items);
			}
			// No name but a dot means that we're searching for a shortcut
			// If the last symbol was paranthesis it means that we have a method call which could return an entity
			if (read != CharCode.RIGHT_ROUND) {
				for (const [instance, docs] of Object.entries(vscriptGlobals.instancesMethods)) {
					this.addFunctionItem(items, docs, CompletionItemKind.Method, dotRange, instance + ".");
				}
				for (const [instance, docs] of Object.entries(vscriptGlobals.enumMembers)) {
					this.addFunctionItem(items, docs, CompletionItemKind.EnumMember, dotRange, `Constants.${instance}.`);
				}
				
				return Promise.resolve(items);
			}

			this.addFunctionItem(items, vscriptGlobals.allMethods, CompletionItemKind.Method);
			return Promise.resolve(items);
		}

		// Dotless completions

		this.addFunctionItem(items, vscriptGlobals.allFunctions, CompletionItemKind.Function);
		this.addFunctionItem(items, vscriptGlobals.builtInConstants, CompletionItemKind.Constant);
		this.addFunctionItem(items, vscriptGlobals.builtInVariables, CompletionItemKind.Variable);

		// It's possible to rescope your methods so that they appear as global functions
		// In this case we always stick to show available methods which are bound to instances
		for (const docs of Object.values(vscriptGlobals.instancesMethods)) {
			this.addFunctionItem(items, docs, CompletionItemKind.Method);
		}

		for (const docs of Object.values(vscriptGlobals.enumMembers)) {
			this.addFunctionItem(items, docs, CompletionItemKind.EnumMember);
		}

		for (const keyword of vscriptGlobals.keywords) {
			const item = new CompletionItem(keyword, CompletionItemKind.Keyword);
			items.push(item);
		}

		return Promise.resolve(items);
	}

	private addFunctionItem(items: CompletionItem[], docs: vscriptGlobals.Docs, itemKind: CompletionItemKind, dotRange?: Range, append: string = "") {
		for (const [funcName, info] of Object.entries(docs)) {
			const item = new CompletionItem(funcName, itemKind);

			item.detail = info.signature;
			/*
			if (info.description && typeof info.description === "string") {
				item.documentation = new MarkdownString(info.description);
			}*/
			item.insertText = new SnippetString(append + funcName);

			if (dotRange) {
				item.additionalTextEdits = [TextEdit.delete(dotRange)];
			}

			items.push(item);
		}
	}

	private getDotRange(document: TextDocument, iterator: BackwardIterator): Range | null {
		while (iterator.hasNext()) {
			const ch = iterator.next();
			if (CharCode.isAlphaNumeric(ch)) {
				continue;
			}

			if (ch === CharCode.DOT) {
				const dotPosition = document.positionAt(iterator.getCursor() + 1);
				return new Range(
					dotPosition,
					dotPosition.translate(0, 1)
				);
			}
				
			// Not allowing \r \n here for consistency as below in findFirstLetter method
			if (!CharCode.isIndentation(ch)) {
				return null;
			}

			let indent = 1;
			while (iterator.hasNext()) {
				const ch = iterator.next();
				if (CharCode.isIndentation(ch)) {
					indent++;
					continue;
				}
				if (ch === CharCode.DOT) {
					const dotPosition = document.positionAt(iterator.getCursor() + 1);
					return new Range(
						dotPosition,
						dotPosition.translate(0, indent + 1)
					);
				}
				
				break;
			}

			break;
		}

		return null;
	}

	private readDotLeftHand(iterator: BackwardIterator): string | number {
		const firstChar = this.findFirstChar(iterator);
		if (!CharCode.isAlphaNumeric(firstChar)) {
			return firstChar;
		}

		let name = String.fromCharCode(firstChar);
		while (iterator.hasNext()) {
			const ch = iterator.next();
			if (!CharCode.isAlphaNumeric(ch)) {
				break;
			}

			name = String.fromCharCode(ch) + name;
		}

		return name;
	}

	private findFirstChar(iterator: BackwardIterator): number {
		while (iterator.hasNext()) {
			const ch = iterator.next();
			// We do not allow a traversal between lines in this case
			// So \n or \r are invalid characters
			// Otherwise non semicolon code will not give correct results
			//
			// local a = Constants.ETFTeam.TF_TEAM_RED
			// .
			//
			// will read TF_TEAM_RED instead of the empty space
			if (CharCode.isIndentation(ch)) {
				continue;
			}
			return ch;
		}
		return -1;
	}
}