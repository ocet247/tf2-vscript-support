import { Disposable, TextDocument, workspace } from "vscode";
import { Lexer } from "./lexer";

export default class CurrentDocument {
	private static lexer: Lexer | undefined;
	private static parser: undefined;
	private static timeOut: NodeJS.Timeout | undefined;

	public static getLexer(): Lexer | undefined {
		return CurrentDocument.lexer;
	}

	private static disposables: Disposable[] = [
		workspace.onDidOpenTextDocument(document => this.changeDocument(document)),
		workspace.onDidChangeTextDocument(event => this.queueAnalysis(event.document))
	]

	private static changeDocument(document: TextDocument): void {
		if (document.languageId === 'nut') {
			// Set it to undefined so we cannot clear timeout for the previously opened file from the current file
			this.timeOut = undefined;

			// Immediately lint the newly active file
			this.runAnalysis(document);
		}
	}

	private static queueAnalysis(document: TextDocument): void {
		if (document.languageId === 'nut') {
			clearTimeout(this.timeOut);
			this.timeOut = setTimeout(() => {
				this.runAnalysis(document);
			}, 200)
		}
	}

	private static runAnalysis(document: TextDocument): void {
		const text = document.getText();
		this.lexer = new Lexer(text);
	}
}
