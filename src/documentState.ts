import { Disposable, TextDocument, window, workspace } from "vscode";
import { Lexer } from "./lexer";

export default class CurrentDocument {
	private static lexer: Lexer = this.startupLexer();

	public static disposables: Disposable[] = [
		workspace.onDidOpenTextDocument(document => this.runLexer(document)),
		workspace.onDidChangeTextDocument(event => this.runLexer(event.document))
	];

	private static startupLexer(): Lexer {
		const editor = window.activeTextEditor;
		if (!editor) {
			return new Lexer('');
		}

		return new Lexer(editor.document.getText());
	}

	public static getLexer(): Lexer {
		return this.lexer;
	}

	private static runLexer(document: TextDocument): void {
		if (document.languageId !== 'nut') {
			return;
		}

		const text = document.getText();
		this.lexer = new Lexer(text);
	}
}
