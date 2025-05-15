import { HoverProvider, Hover, MarkdownString, TextDocument, CancellationToken, Position } from 'vscode';
import CurrentDocument from './documentState';
import { TokenIterator } from './lexer';


export default class TF2VScriptHoverProvider implements HoverProvider {
	public provideHover(document: TextDocument, position: Position, _token: CancellationToken): Hover | undefined {
		if (!CurrentDocument.isInNut()) {
			return;
		}

		const lexer = CurrentDocument.getLexer();
		
		const token = lexer.getTokenAtPosition(document.offsetAt(position) - 1);
		if (token.object && token.object.isComment()) {
			return;
		}

		const range = document.getWordRangeAtPosition(position);
		if (!range) {
			return;
		}
		const name = document.getText(range);
		

		const iterator = new TokenIterator(lexer.getTokens(), token.index - 1);
		const doc = iterator.findDoc(name);
		if (!doc) {
			return;
		}

		const markdown = new MarkdownString();
		const signature = doc.signature;
		markdown.appendCodeblock(signature, 'nutDoc');
	
		const description = doc.description;
		if (description) {
			if (typeof description === "string") {
				markdown.appendMarkdown(description);
			} else {
				for (const [line, isCode] of Object.entries(description)) {
					isCode ?
						markdown.appendCodeblock(line, 'nutDoc') :
						markdown.appendMarkdown(line);
				}
			}
		}

		return new Hover(markdown);
	}
}