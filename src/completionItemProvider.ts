import { CompletionItemProvider, CompletionItem, CompletionItemKind, CancellationToken, TextEdit, TextDocument, Position, MarkdownString, SnippetString, CompletionContext, Range, CompletionItemTag, CompletionList, ProviderResult } from 'vscode';
import * as vscriptGlobals from './globals'
import { BackwardIterator, CharCode } from './textProcessing';
import CurrentDocument from './documentState';
import { TokenKind } from './lexer';

export class TF2VScriptCompletionProvider implements CompletionItemProvider {
	public provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken, _context: CompletionContext): Promise<CompletionItem[]> {
		if (!CurrentDocument.isInNut()) {
			return Promise.resolve([]);
		}
		
		const token = CurrentDocument.getLexer().getTokenAtPosition(document.offsetAt(position) - 1);
		if (token && token.isComment()) {
			return Promise.resolve([]);
		}

		const items: CompletionItem[] = [];
		const iterator = new BackwardIterator(BackwardIterator.textFromPosition(document, position));

		const dotRange = this.getDotRange(document, iterator);
		if (dotRange) {
			const name = iterator.readIdentity(false);
			if (name) {
				const methods = vscriptGlobals.instancesMethods.get(name);
				if (methods) {
					this.addItems(items, methods, CompletionItemKind.Method);
					return Promise.resolve(items);
				}

				if (name === "Constants") {
					this.addItems(items, vscriptGlobals.builtInEnums, CompletionItemKind.Enum);
					return Promise.resolve(items);
				}

				const variables = vscriptGlobals.enumMembers.get(name);
				if (variables) {
					this.addItems(items, variables, CompletionItemKind.EnumMember);
					return Promise.resolve(items);
				}

				// If we have not found this instance name in our saved completions then we assume it has every other method
				this.addItems(items, vscriptGlobals.allMethods, CompletionItemKind.Method);
				this.addDeprecatedItems(items, vscriptGlobals.allDeprecatedMethods, CompletionItemKind.Method);
				
				return Promise.resolve(items);
			}
			// No name but a dot means that we're searching for a shortcut
			// If the last symbol was closing paranthesis it means that we have a method call which could return an entity
			// Or we've possibly done table/class accessing with []
			const lastChar = iterator.back();
			if (lastChar != CharCode.RIGHT_ROUND && lastChar != CharCode.RIGHT_SQUARE) {
				for (const [instance, docs] of vscriptGlobals.instancesMethods) {
					this.addShortcutItems(items, docs, CompletionItemKind.Method, dotRange, instance + ".");
				}
				for (const [instance, docs] of vscriptGlobals.enumMembers) {
					this.addShortcutItems(items, docs, CompletionItemKind.EnumMember, dotRange, `Constants.${instance}.`);
				}
				
				return Promise.resolve(items);
			}

			this.addItems(items, vscriptGlobals.allMethods, CompletionItemKind.Method);
			this.addDeprecatedItems(items, vscriptGlobals.allDeprecatedMethods, CompletionItemKind.Method);

			return Promise.resolve(items);
		}

		// Dotless completions

		this.addItems(items, vscriptGlobals.allFunctions, CompletionItemKind.Function);
		this.addDeprecatedItems(items, vscriptGlobals.allDeprecatedFunctions, CompletionItemKind.Function);

		this.addItems(items, vscriptGlobals.builtInConstants, CompletionItemKind.Constant);
		this.addItems(items, vscriptGlobals.builtInVariables, CompletionItemKind.Variable);

		// It's possible to rescope your methods so that they appear as global functions
		// In this case we always stick to show available methods which are bound to instances
		for (const docs of vscriptGlobals.instancesMethods.values()) {
			this.addItems(items, docs, CompletionItemKind.Method);
		}

		for (const docs of vscriptGlobals.enumMembers.values()) {
			this.addItems(items, docs, CompletionItemKind.EnumMember);
		}

		for (const keyword of vscriptGlobals.keywords) {
			const item = new CompletionItem(keyword, CompletionItemKind.Keyword);
			items.push(item);
		}

		return Promise.resolve(items);
	}

	private addItems(items: CompletionItem[], docs: vscriptGlobals.Docs, itemKind: CompletionItemKind) {
		for (const [funcName, info] of docs) {
			const item = new CompletionItem(funcName, itemKind);

			item.detail = info.signature;
			/*
			if (info.description && typeof info.description === "string") {
				item.documentation = new MarkdownString(info.description);
			}*/
			item.insertText = new SnippetString(funcName);
			items.push(item);
		}
	}

	private addDeprecatedItems(items: CompletionItem[], docs: vscriptGlobals.Docs, itemKind: CompletionItemKind) {
		for (const [funcName, info] of docs) {
			const item = new CompletionItem(funcName, itemKind);

			item.detail = info.signature;
			item.insertText = new SnippetString(funcName);
			item.tags = [CompletionItemTag.Deprecated];
			items.push(item);
		}
	}

	private addShortcutItems(items: CompletionItem[], docs: vscriptGlobals.Docs, itemKind: CompletionItemKind, dotRange: Range, append: string) {
		for (const [funcName, info] of docs) {
			const item = new CompletionItem(funcName, itemKind);

			item.detail = info.signature;
			item.insertText = new SnippetString(append + funcName);
			item.additionalTextEdits = [TextEdit.delete(dotRange)];

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
}

export class DocCompletionProvider implements CompletionItemProvider {
	public provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken, _context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
		const token = CurrentDocument.getLexer().getTokenAtPosition(document.offsetAt(position) - 1);
		if (!token || token.kind !== TokenKind.DOC) {
			return Promise.resolve([]);
		}

		const completionItems = [];

		for (const [name, entry] of vscriptGlobals.docSnippets) {
			const item = new CompletionItem(name, CompletionItemKind.Snippet);

			item.documentation = new MarkdownString(entry.desc);
			if (entry.detail) {
				item.detail = entry.detail;
			}

			if (entry.snippet) {
				item.insertText = new SnippetString(`${name} ${entry.snippet}`);
			} else {
				item.insertText = name; // fallback: just insert the name
			}
			completionItems.push(item);
		}

		return Promise.resolve(completionItems);
	}
}