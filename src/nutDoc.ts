import { CancellationToken, commands, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, MarkdownString, Position, Selection, SnippetString, TextDocument, window } from "vscode";
import { BackwardIterator, CharCode, ForwardIterator } from "./textProcessing";

function isInBlockComment(iterator: BackwardIterator): { inComment: boolean, inDoc: boolean } {
	// If the last thing we've found was /** and after that there were no more /* until we've hit the */ or the end of the file
	// it means that we're inside the doc. We cannot return immediately after finding /* or /** since it has an edgecase
	// of having /* or /** inside a block comment
	/*    /** /**
	 * /* etc
	 */
	let inComment = false;
	let inDoc = false;
	// if we have /* inside a line comment
	let lastInComment = false;
	let lastInDoc = false;
	while (iterator.hasNext()) {
		let char = iterator.next();
		switch (char) {
		case CharCode.QUOTE:
		case CharCode.DOUBLE_QUOTE:
		case CharCode.BACKTICK:
			while (iterator.hasNext() && char !== iterator.next()) {
				// find the closing quote or double quote
			}
			continue;
		case CharCode.LINE_FEED:
			lastInComment = inComment;
			lastInDoc = inDoc;
			continue;
		case CharCode.SLASH:
			if (!iterator.hasNext()) {
				return {
					inComment: false,
					inDoc: false
				};
			}
			char = iterator.next();
			if (char === CharCode.ASTERISK) {
				// Found */
				return {
					inComment,
					inDoc
				};
			}
			if (char === CharCode.SLASH) {
				// Found //
				inComment = lastInComment;
				inDoc = lastInDoc;
			}
			continue;
		case CharCode.ASTERISK:
			if (!iterator.hasNext()) {
				return {
					inComment: false,
					inDoc: false
				};
			}
			char = iterator.next();

			if (char !== CharCode.ASTERISK) {
				if (char === CharCode.SLASH) {
					inComment = true;
					inDoc = false;
				}
				continue;
			}

			if (!iterator.hasNext()) {
				return {
					inComment,
					inDoc
				};
			}

			char = iterator.next();
			if (char === CharCode.SLASH) {
				inComment = true;
				inDoc = true;
			}
			continue;
		}
	}

	return {
		inComment,
		inDoc
	}
}

function isCommentClosed(iterator: ForwardIterator) {
	while (iterator.hasNext()) {
		let char = iterator.next();
		if (char === CharCode.SLASH) {
			if (!iterator.hasNext()) {
				return false;
			}
			char = iterator.next();
			if (char === CharCode.ASTERISK) {
				// found /*
				return false;
			}
		} else if (char === CharCode.ASTERISK) {
			if (!iterator.hasNext()) {
				return false;
			}
			char = iterator.next();
			if (char === CharCode.SLASH) {
				// found */
				return true;
			}
		}
		
	}
	return false;
}

export class NutDocCompletionItemProvider implements CompletionItemProvider {
	private hasAsterisk(iterator: BackwardIterator): boolean {
		while (iterator.hasNext()) {
			const char = iterator.next();
			if (char === CharCode.ASTERISK) {
				return true;
			}
			if (!CharCode.isIndentation(char)) {
				return false;
			}
		}
		return false;
	}

	public isSuitableForCompletion(iterator: BackwardIterator): boolean {
		while (iterator.hasNext()) {
			let char = iterator.next();
			if (CharCode.isAlphaNumeric(char)) {
				continue;
			}

			if (char !== CharCode.RAVLYK) {
				return false;
			}

			if (!this.hasAsterisk(iterator)) {
				return false;
			}

			// If any symbol other than identation is found after the asterisk the line is not considered valid
			while (iterator.hasNext()) {
				char = iterator.next();
				if (!CharCode.isIndentation(char)) {
					return char === CharCode.LINE_FEED;
				}
			}

			break;
		}
		return false;
	}

	public provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken, _context: CompletionContext): Promise<CompletionItem[]> {
		const iterator = new BackwardIterator(BackwardIterator.textFromPosition(document, position));

		if (!this.isSuitableForCompletion(iterator)) {
			return Promise.resolve([]);
		}

		if (!isInBlockComment(iterator).inDoc) {
			return Promise.resolve([]);
		}

		let completionItems = [];

		for (const [name, entry] of Object.entries(elements)) {
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

export async function NutBlockCommentEnterHandler() {
	const editor = window.activeTextEditor;
	if (!editor) {
		return;
	}

	
	const document = editor.document;
	const position = editor.selection.active;
	const line = document.lineAt(position.line).text;
	
	let indent = '';
	let foundAsterisk = false;
	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === ' ' || char === '\t') {
			indent += char;
			continue;
		}
		if (char === '*' && position.character > i) {
			foundAsterisk = true;
		}
		break;
	}

	const backwardIterator = new BackwardIterator(BackwardIterator.textFromPosition(document, position));
	const commentState = isInBlockComment(backwardIterator);

	if (!commentState.inComment) {
		await commands.executeCommand('type', { text: '\n' });
		return;
	}
	
	const trimmed = line.trimEnd();
	if (!commentState.inDoc) {
		if (trimmed.endsWith('/*')) {
			const forwardIterator = new ForwardIterator(ForwardIterator.textFromPosition(document, position));
			if (isCommentClosed(forwardIterator)) {
				await commands.executeCommand('type', { text: '\n' });
				return;
			}
	
			await editor.edit(editBuilder => {
				editBuilder.insert(position, `\n${indent}\n${indent} */`);
			});
	
			const newPosition = new Position(position.line + 1, indent.length);
			editor.selection = new Selection(newPosition, newPosition);
			return;
		}

		await commands.executeCommand('type', { text: '\n' });
		return;
	}
	
	if (trimmed.endsWith('/**')) {
		const forwardIterator = new ForwardIterator(ForwardIterator.textFromPosition(document, position));
		if (isCommentClosed(forwardIterator)) {
			await editor.edit(editBuilder => {
				editBuilder.insert(position, `\n${indent} * `);
			});
			return;
		}

		await editor.edit(editBuilder => {
			editBuilder.insert(position, `\n${indent} * \n${indent} */`);
		});

		// Move cursor to the line with the '* '
		const newPosition = new Position(position.line + 1, 3 + indent.length);
		editor.selection = new Selection(newPosition, newPosition);
		
		return;
	}

	if (foundAsterisk) {
		await editor.edit(editBuilder => {
			editBuilder.insert(position, `\n${indent}* `);
		});
	} else {
		await commands.executeCommand('type', { text: '\n' });
	}
}

interface DocSnippets {
	[name: string]: {
		desc: string,
		detail?: string,
		snippet?: string
	}
}


let elements: DocSnippets = {
	abstract: {
		desc: "This member must be implemented (or overridden) by the inheritor.",
	},
	access: {
		desc: "Specify the access level of this member (private, public, or protected).",
		detail: "<private|protected|public>",
		snippet: "${1|private,protected,public|}"
	},
	alias: {
		desc: "Treat a member as if it had a different name.",
		detail: "<aliasNamepath>",
		snippet: "${1:aliasNamepath}"
	},
	augments: {
		desc: "Indicate that a symbol inherits from, ands adds to, a parent symbol.",
		detail: "<namepath>",
		snippet: "${1:namepath}"
	},
	author: {
		desc: "Identify the author of an item.",
		detail: "<name> [<emailAddress>]",
		snippet: "${1:name} [${2:emailAddress}]"
	},
	borrows: {
		desc: "This object uses something from another object.",
		detail: "<that namepath> as <this namepath>",
		snippet: "${1:refNamePath} as ${1:thisNamePath}"
	},
	callback: {
		desc: "Document a callback function.",
		detail: "<namepath>",
		snippet: "${1:namepath}"
	},
	class: {
		desc: "This function is intended to be called with the \"new\" keyword.",
		detail: "[<type> <name>]",
	},
	classdesc: {
		desc: "Use the following text to describe the entire class.",
		detail: "<some description>",
		snippet: "${1:description}"
	},
	constant: {
		desc: "Document an object as a constant.",
		detail: "[<type> <name>]",
	},
	constructs: {
		desc: "This function member will be the constructor for the previous class.",
		detail: "[<name>]",
	},
	copyright: {
		desc: "Document some copyright information.",
		detail: "<copyright text>",
		snippet: "${1:copyright text}"
	},
	default: {
		desc: "Document the default value.",
		detail: "[<some value>]",
	},
	deprecated: {
		desc: "Document that this is no longer the preferred way.",
		detail: "[<some text>]",
		snippet: "${1:text}"
	},
	description: {
		desc: "Describe a symbol.",
		detail: "<some description>",
		snippet: "${1:description}"
	},
	enum: {
		desc: "Document a collection of related properties.",
		detail: "[<type>]",
		snippet: "{${1:type}}"
	},
	event: {
		desc: "Document an event.",
		detail: "<classname>#[event:]<eventName>",
		snippet: "${1:classname}#${2:eventName}"
	},
	example: {
		desc: "Provide an example of how to use a documented item."
	},
	exports: {
		desc: "Identify the member that is exported by a JavaScript module.",
		detail: "<moduleName>",
		snippet: "${1:moduleName}"
	},
	external: {
		desc: "Identifies an external class, namespace, or module.",
		detail: "<nameOfExternal>",
		snippet: "${1:nameOfExternal}"
	},
	file: {
		desc: "Describe a file."
	},
	fires: {
		desc: "Describe the events this method may fire.",
		detail: "<classname>#[event:]<eventName>",
		snippet: "${1:classname}#${2:eventName}"
	},
	function: {
		desc: "Describe a function or method.",
		detail: "[<FunctionName>]",
		snippet: "${1:FunctionName}"
	},
	global: {
		desc: "Document a global object."
	},
	ignore: {
		desc: "Omit a symbol from the documentation."
	},
	implements: {
		desc: "This symbol implements an interface.",
		detail: "{<typeExpression>}",
		snippet: "{${1:typeExpression}}"
	},
	inheritdoc: {
		desc: "Indicate that a symbol should inherit its parent's documentation."
	},
	inner: {
		desc: "Document an inner object."
	},
	instance: {
		desc: "Document an instance member."
	},
	interface: {
		desc: "This symbol is an interface that others can implement.",
		detail: "[<name>]",
		snippet: "${1:name}"
	},
	kind: {
		desc: "What kind of symbol is this?",
		detail: "<kindName>",
		snippet: "${1|class,constant,event,external,file,function,member,mixin,module,namespace,typedef|}"
	},
	lends: {
		desc: "Document properties on an object literal as if they belonged to a symbol with a given name.",
		detail: "<namepath>",
		snippet: "${1:namepath}"
	},
	license: {
		desc: "Identify the license that applies to this code.",
		detail: "<identifier>",
		snippet: "${1:identifier}"
	},
	listens: {
		desc: "List the events that a symbol listens for.",
		detail: "<eventName>",
		snippet: "${1:eventName}"
	},
	member: {
		desc: "Document a member.",
		detail: "[<type>] [<name>]",
		snippet: "{${1:type}} ${2:name}"
	},
	memberof: {
		desc: "This symbol belongs to a parent symbol.",
		detail: "<parentNamepath>",
		snippet: "${1:parentNamepath}"
	},
	"memberof!": {
		desc: "Force this symbol to belongs to a parent symbol.",
		detail: "<parentNamepath>",
		snippet: "${1:parentNamepath}"
	},
	mixes: {
		desc: "This object mixes in all the members from another object.",
		detail: "<otherObjectPath>",
		snippet: "${1:otherObjectPath}"
	},
	mixin: {
		desc: "Document a mixin object.",
		detail: "[<mixinName>]",
		snippet: "${1:mixinName}"
	},
	module: {
		desc: "Document a JavaScript module.",
		detail: "[[{<type>}] <moduleName>]",
		snippet: "{${1:type}} ${2:moduleName}"
	},
	name: {
		desc: "Document the name of an object.",
		detail: "<namepath>",
		snippet: "${1:namepath}"
	},
	namespace: {
		desc: "Document a namespace object.",
		detail: "[[{<type>}] <SomeName>]",
		snippet: "{${1:type}} ${2:SomeName}"
	},
	override: {
		desc: "Indicate that a symbol overrides its parent."
	},
	param: {
		desc: " Document the parameter to a function.",
		detail: "[[{<type>}] <name> [<Param description>]]",
		snippet: "{${1:type}} ${2:name} ${3:description}"
	},
	private: {
		desc: "This symbol is meant to be private."
	},
	property: {
		desc: "Document a property of an object.",
		detail: "[[{<type>}] <name> [<Property description>]]",
		snippet: "{${1:type}} ${2:name} ${3:description}"
	},
	protected: {
		desc: "This symbol is meant to be protected."
	},
	public: {
		desc: "This symbol is meant to be public."
	},
	readonly: {
		desc: "This symbol is meant to be read-only."
	},
	requires: {
		desc: "This file requires a JavaScript module.",
		detail: "<someModuleName>",
		snippet: "${1:someModuleName}"
	},
	returns: {
		desc: "Document the return value of a function.",
		detail: "[{<type>} [<Return description>]]",
		snippet: "{${1:type}} ${2:description}"
	},
	see: {
		desc: "Refer to some other documentation for more information.",
		detail: "<namepath>|<text>",
		snippet: "${1|namepath,text|}"
	},
	since: {
		desc: "When was this feature added?",
		detail: "<versionDescription>",
		snippet: "${1:versionDescription}"
	},
	static: {
		desc: "Document a static member."
	},
	summary: {
		desc: "A shorter version of the full description."
	},
	this: {
		desc: "What does the 'this' keyword refer to here?",
		detail: "<namepath>",
		snippet: "${1:namepath}"
	},
	throws: {
		desc: "Describe what errors could be thrown.",
		detail: "[{<type>}] [<free-form description>]",
		snippet: "{${1:type}} ${2:description}"
	},
	todo: {
		desc: "Document tasks to be completed."
	},
	tutorial: {
		desc: "Insert a link to an included tutorial file."
	},
	type: {
		desc: "Document the type of an object.",
		detail: "{typeName}",
		snippet: "{${1:typeName}}"
	},
	typedef: {
		desc: "Document a custom type.",
		detail: "[<type>] <namepath>",
		snippet: "{${1:type}} ${1:namepath}"
	},
	variation: {
		desc: "Distinguish different objects with the same name.",
		detail: "<variationNumber>",
		snippet: "${1:variationNumber}"
	},
	version: {
		desc: "Documents the version number of an item.",
		detail: "<versionDescription>",
		snippet: "${1:versionDescription}"
	}
};

// Synonyms
elements.virtual = elements.abstract;
elements.extends = elements.augments;
elements["constructor"] = elements.class;
elements.const = elements.constant;
elements.defaultvalue = elements.default;
elements.desc = elements.description;
elements.host = elements.external;
elements.fileoverview = elements.overview = elements.file;
elements.emits = elements.fires;
elements.func = elements.method = elements.function;
elements.var = elements.method;
elements.arg = elements.argument = elements.param;
elements.prop = elements.property;
elements.return = elements.returns;
elements.exception = elements.throws;
