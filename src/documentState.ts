import { Disposable, TextDocument, window, workspace } from "vscode";
import { Lexer, TokenKind } from "./lexer";

export default class CurrentDocument {
	private static lexer: Lexer = this.startupLexer();
	private static inNut: boolean = true;

	public static disposables: Disposable[] = [
		workspace.onDidOpenTextDocument(document => this.runAnalisys(document)),
		workspace.onDidChangeTextDocument(event => this.runAnalisys(event.document))
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
	
	public static isInNut(): boolean {
		return this.inNut;
	}

	private static runAnalisys(document: TextDocument): void {
		if (document.languageId !== 'nut') {
			this.inNut = false;
			return;
		}
		
		this.inNut = true;

		const text = document.getText();
		this.lexer = new Lexer(text, document);
		this.lexer.lex();
		let token = this.lexer.getCurrentToken();
		while (token && token.kind != TokenKind.EOF) {
			token.log();
			this.lexer.lex();
			token = this.lexer.getCurrentToken();
		}
	}
}
