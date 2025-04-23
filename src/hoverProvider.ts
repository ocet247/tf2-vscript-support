import { HoverProvider, Hover, MarkdownString, TextDocument, CancellationToken, Position } from 'vscode';
import * as vscriptGlobals from './globals';

export default class TF2VScriptHoverProvider implements HoverProvider {
	public provideHover(document: TextDocument, position: Position, _token: CancellationToken): Hover | undefined {
		const wordRange = document.getWordRangeAtPosition(position);
		if (!wordRange) {
			return undefined;
		}

		const name = document.getText(wordRange);

		const entry = vscriptGlobals.findDoc(name);
		if (!entry) {
			return undefined;
		}

		const markdown = new MarkdownString();
		const signature = entry.signature;
		markdown.appendCodeblock(signature, 'nutDoc');
	
		const description = entry.description;
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