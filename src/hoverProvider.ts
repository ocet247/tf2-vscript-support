import { HoverProvider, Hover, MarkdownString, TextDocument, CancellationToken, Position } from 'vscode';
import { BackwardIterator } from './textProcessing';
import CurrentDocument from './documentState';

export default class TF2VScriptHoverProvider implements HoverProvider {
	public provideHover(document: TextDocument, position: Position, _token: CancellationToken): Hover | undefined {
		if (!CurrentDocument.isInNut()) {
			return undefined;
		}
		
		const token = CurrentDocument.getLexer().getTokenAtPosition(document.offsetAt(position) - 1);
		if (token && token.isComment()) {
			return undefined;
		}

		const range = document.getWordRangeAtPosition(position);
		if (!range) {
			return undefined;
		}

		const name = document.getText(range);
		const iterator = new BackwardIterator(BackwardIterator.textFromPosition(document, range.start));
		const doc = iterator.findDoc(name);
		if (!doc) {
			return undefined;
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