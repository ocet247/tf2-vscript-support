import { CompletionItem, CompletionItemKind, CompletionItemTag, InsertTextFormat, MarkupKind, TextDocumentPositionParams, TextEdit } from 'vscode-languageserver';
import { Range, TextDocument } from 'vscode-languageserver-textdocument';
import { documents, getDocumentSettings, documentInfo } from './server';
import { TokenIterator, TokenKind, globals } from 'squirrel';

enum ItemKind {
	Keywords,
	Methods,
	DeprecatedMethods,
	Functions,
	DeprecatedFunctions,
	Events,
	BuiltInConstants,
	BuiltInVariables,
	InstancesMethods,
	InstancesVariables,
	DocSnippets
}

const itemKindToDocs = new Map<ItemKind, globals.Docs>([
	[ItemKind.Keywords, globals.keywords],
	[ItemKind.Methods, globals.methods],
	[ItemKind.DeprecatedMethods, globals.deprecatedMethods],
	[ItemKind.Functions, globals.functions],
	[ItemKind.DeprecatedFunctions, globals.deprecatedFunctions],
	[ItemKind.Events, globals.events],
	[ItemKind.BuiltInConstants, globals.builtInConstants],
	[ItemKind.BuiltInVariables, globals.builtInVariables],
	[ItemKind.InstancesMethods, globals.otherMethods],
	[ItemKind.InstancesVariables, globals.otherVariables],
	[ItemKind.DocSnippets, globals.docSnippets]
]);

// track the document the completion items were added in to later use it in resolve
let document: TextDocument | undefined;
let dotRange: Range | undefined;
let shortCut = false;

export async function onCompletionHandler(params: TextDocumentPositionParams): Promise<CompletionItem[]> {
	document = documents.get(params.textDocument.uri);
	if (!document) {
		return [];
	}

	const settings = await getDocumentSettings(document.uri);
	if (!settings.enableCompletions) {
		return [];
	}

	const info = documentInfo.get(document.uri);
	if (!info) {
		return [];
	}
	const { lexer } = info;

	const position = params.position;
	const offset = document.offsetAt(position) - 1;

	const result = lexer.findTokenAtPosition(offset);
	if (result.token) {
		const kind = result.token.kind;
		if (kind === TokenKind.LINE_COMMENT || kind === TokenKind.BLOCK_COMMENT) {
			return [];
		}

		if (kind === TokenKind.DOC) {
			const items: CompletionItem[] = [];
			addCompletionItems(items, ItemKind.DocSnippets, CompletionItemKind.Snippet);
			return items;
		}

		// TODO: Possibly add string completions like assets/attributes
	}

	const items: CompletionItem[] = [];
	
	const iterator = new TokenIterator(lexer.getTokens(), result.index);
	const range = getDotRange(iterator);
	shortCut = false;

	if (range) {
		dotRange = {
			start: document.positionAt(range.start),
			end: document.positionAt(range.end)
		};
		const name = iterator.readIdentity(false);
		if (name) {
			const methods = globals.instancesMethods.get(name);
			if (methods) {
				addCompletionItems(items, ItemKind.InstancesMethods, CompletionItemKind.Method, methods);
				return items;
			}

			const variables = globals.instancesVariables.get(name);
			if (variables) {
				addCompletionItems(items, ItemKind.InstancesVariables, CompletionItemKind.EnumMember, variables);
				return items;
			}

			// If we have not found this instance name in our saved completions then we assume it has every other method
			addCompletionItems(items, ItemKind.Methods, CompletionItemKind.Method);
			addCompletionItems(items, ItemKind.Events, CompletionItemKind.Event);
			addCompletionItems(items, ItemKind.DeprecatedMethods, CompletionItemKind.Method);

			return items;
		}
		// No name but a dot means that we're searching for a shortcut
		// If the last symbol was closing paranthesis it means that we have a method call which could return an entity
		// Or we've possibly done table/class accessing with []

		const lastToken = iterator.next();
		if (!lastToken || lastToken.kind !== TokenKind.RIGHT_ROUND && lastToken.kind !== TokenKind.RIGHT_SQUARE) {
			shortCut = true;
			addCompletionItems(items, ItemKind.InstancesMethods, CompletionItemKind.Method);
			addCompletionItems(items, ItemKind.InstancesVariables, CompletionItemKind.EnumMember);

			return items;
		}

		addCompletionItems(items, ItemKind.Methods, CompletionItemKind.Method);
		addCompletionItems(items, ItemKind.Events, CompletionItemKind.Event);
		addCompletionItems(items, ItemKind.DeprecatedMethods, CompletionItemKind.Method);

		return items;
	}


	addCompletionItems(items, ItemKind.Functions, CompletionItemKind.Function);
	addCompletionItems(items, ItemKind.Events, CompletionItemKind.Event);
	addCompletionItems(items, ItemKind.DeprecatedFunctions, CompletionItemKind.Function);

	addCompletionItems(items, ItemKind.BuiltInConstants, CompletionItemKind.Constant);
	addCompletionItems(items, ItemKind.BuiltInVariables, CompletionItemKind.Variable);

	// It's possible to rescope your methods so that they appear as global functions
	// In this case we always stick to show available methods which are bound to instances
	addCompletionItems(items, ItemKind.InstancesMethods, CompletionItemKind.Method);
	addCompletionItems(items, ItemKind.InstancesVariables, CompletionItemKind.EnumMember);

	addCompletionItems(items, ItemKind.Keywords, CompletionItemKind.Keyword);

	return items;
}

function addCompletionItems(items: CompletionItem[], itemKind: ItemKind, completionItemKind: CompletionItemKind, docs?: globals.Docs): void {
	if (!docs) {
		docs = itemKindToDocs.get(itemKind);
		if (!docs) {
			return;
		}
	}

	const tags: CompletionItemTag[] = [];
	if (itemKind === ItemKind.DeprecatedFunctions || itemKind === ItemKind.DeprecatedMethods) {
		tags.push(CompletionItemTag.Deprecated);
	}

	for (const label of docs.keys()) {
		items.push({
			label: label,
			kind: completionItemKind,
			tags: tags,
			data: itemKind,
		});
	}
}

function getDotRange(iterator: TokenIterator): { start: number, end: number } | undefined {
	if (!iterator.hasPrevious()) {
		return;
	}

	let token = iterator.previous();
	if (token.kind === TokenKind.DOT) {
		return { start: token.start, end: token.end };
	}
	if (token.kind !== TokenKind.IDENTIFIER) {
		return;
	}

	if (!iterator.hasPrevious()) {
		return;
	}

	const end = token.start;
	token = iterator.previous();
	if (token.kind === TokenKind.DOT) {
		return { start: token.start, end };
	}

	return;
}

const noSpaceKeywords = new Set<string>([
	"base",
	"break",
	"case",
	"constructor",
	"continue",
	"default",
	"false",
	"function",
	"false",
	"return",
	"this",
	"true",
	"null"
]);

const paranthesisKeywords = new Set<string>([
	"if",
	"for",
	"while",
	"foreach",
	"switch"
]);

export async function onCompletionResolveHandler(item: CompletionItem): Promise<CompletionItem> {
	if (!document) {
		return item;
	}

	const doc = itemKindToDocs.get(item.data)?.get(item.label);
	if (!doc) {
		return item;
	}

	item.detail = doc.detail;
	if (doc.desc) {
		item.documentation = {
			kind: MarkupKind.Markdown,
			value: doc.desc
		};
	}

	if (item.kind === CompletionItemKind.Snippet && doc.snippet) {
		item.insertText = item.label + " " + doc.snippet;
		item.insertTextFormat = InsertTextFormat.Snippet;
		return item;
	}

	const settings = await getDocumentSettings(document.uri);

	if (item.kind === CompletionItemKind.Keyword) {
		if (noSpaceKeywords.has(item.label)) {
			return item;
		}

		item.insertText = item.label + " ";

		if (settings.completionAutoParantheses && paranthesisKeywords.has(item.label)) {
			item.insertText += "($0)";
			item.insertTextFormat = InsertTextFormat.Snippet;
		}

		return item;
	}

	/** */

	if (shortCut && dotRange) {
		item.additionalTextEdits = [
			TextEdit.insert(dotRange.start, doc.append!),
			TextEdit.del(dotRange),
		];
	}

	if (!settings.completionAutoParantheses ||
		item.kind !== CompletionItemKind.Function &&
		item.kind !== CompletionItemKind.Method
	) {
		return item;
	}
	
	const open = item.detail.indexOf('(');
	const close = item.detail.lastIndexOf(')');
	// If close + 2 is further than open it means we have no parameters
	// E.g GetListenServerHost() -> GetListenServerHost )( 
	if (close < open + 2) {
		item.insertText = item.label + "()";
		return item;
	}

	item.insertText = item.label + "($0)";
	item.insertTextFormat = InsertTextFormat.Snippet;
	item.command = {
		title: "Trigger Parameter Hints",
		command: "editor.action.triggerParameterHints"
	};

	return item;
}