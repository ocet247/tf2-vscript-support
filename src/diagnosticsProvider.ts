import { DiagnosticCollection, TextDocument, workspace, Diagnostic, Position, Range, DiagnosticSeverity, languages, window, Disposable, DiagnosticTag } from 'vscode';
/*
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
*/
import CurrentDocument from './documentState';
import { Lexer, TokenIterator, TokenKind } from './lexer';

export default class TF2VScriptDiagnosticsProvider {
	private readonly diagnosticCollection: DiagnosticCollection;
	/*
	private readonly tempFilePath: string;
	private readonly command: string;
	*/
	private readonly disposables: Disposable[];

	private timeOut: NodeJS.Timeout | undefined;

	constructor() {
		this.diagnosticCollection = languages.createDiagnosticCollection("TF2VScriptCollection");
		/*
		this.tempFilePath = path.join(os.tmpdir(), "tf2_vscript_lint_cache");
		this.command = `"${path.join(__dirname, "..", "compilers", "sq-compiler_3.2_Windows_x86.exe")}" "${this.tempFilePath}"`;
		*/
		this.disposables = [
			this.diagnosticCollection,
			workspace.onDidOpenTextDocument(document => this.changeDocument(document)),
			workspace.onDidChangeTextDocument(event => this.queueDiagnostics(event.document))
		];
		
		// Lint current file on startup
		const activeEditor = window.activeTextEditor;
		if (activeEditor) {
			this.changeDocument(activeEditor.document);
		}
	}

	private changeDocument(document: TextDocument): void {
		if (document.languageId === 'nut') {
			// Set it to undefined so we cannot clear timeout for the previously opened file from the current file
			this.timeOut = undefined;

			// Immediately lint the newly active file
			this.runDiagnostics(document);
		}
	}

	private queueDiagnostics(document: TextDocument): void {
		if (document.languageId === 'nut') {
			clearTimeout(this.timeOut);
			this.timeOut = setTimeout(() => {
				this.runDiagnostics(document);
			}, 200)
		}
	}
	// It works on my machine
	// The compiler will be obsolete once the parser is done
	/*
	private getOperatingSystem() {
		if (os.type() === "Linux") {
			if (os.arch() === "x64") {
				return "Linux_x64";
			} else {
				return "Linux_x86";
			}
		} else {
			return "Windows_x86";
		}
	}*/

	private runDiagnostics(document: TextDocument): void {
		const parseDiagnostics: Diagnostic[] = this.runParse(document);
		this.diagnosticCollection.set(document.uri, [...parseDiagnostics, ...CurrentDocument.getLexer().getDiagnostics()]);
	}

	/*
	private runCompiler(text: string): Promise<Diagnostic[]> {
		return new Promise((resolve) => {
			const diagnostics: Diagnostic[] = [];
			// Temp file is required because the main document is not visibly changed internally until you save it.
			// With on save linting this step is redundant and the command can be executed directly on the file
			fs.writeFileSync(this.tempFilePath, text);
	
			cp.exec(this.command, (_error, _stdout, stderr) => {
				const regex = /Error in .* on line (\d+) column (\d+):\s(.*)/gm;
				let match: RegExpExecArray | null;
	
				while ((match = regex.exec(stderr))) {
				
					const line = Number(match[1]) - 1;
					const column = Number(match[2]) - 1;
					const message = match[3];
	
					const range = new Range(
						new Position(line, column),
						new Position(line, column + 1)
					);
	
					diagnostics.push(new Diagnostic(range, message, DiagnosticSeverity.Error));
				}
	
				resolve(diagnostics);
			});
		});
	}*/

	private runParse(document: TextDocument): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		const lexer = CurrentDocument.getLexer();
		const iterator = new TokenIterator(lexer.getTokens());

		while (iterator.hasNext()) {
			const token = iterator.next();
			if (token.kind != TokenKind.IDENTIFIER) {
				continue;
			}

			const lastIndex = iterator.getIndex();
			// 2 steps back because the we're on the token after the identifier, while we need a token before it
			iterator.setIndex(lastIndex - 2);
			const doc = iterator.findMethodDoc(token.value);

			iterator.setIndex(lastIndex);
			if (!doc) {
				continue;
			}

			const signature = doc.signature;
			const range = new Range(document.positionAt(token.start), document.positionAt(token.end));
			
			if ("successor" in doc) {
				const diagnostic = new Diagnostic(range, `'${signature}' is deprecated.`, DiagnosticSeverity.Hint);
				diagnostic.tags = [DiagnosticTag.Deprecated];
				diagnostics.push(diagnostic);
			}

			const usedParamCount = this.getUsedParamCount(iterator);
			if (usedParamCount === -1) {
				iterator.setIndex(lastIndex);
				continue;
			}
			iterator.setIndex(lastIndex + 1);

			const { minParamCount, maxParamCount } = this.getParamCount(signature);
			

			let message;
			if (maxParamCount === -1) {
				if (usedParamCount >= minParamCount) {
					continue;
				}

				message = `Expected at least ${minParamCount} arguments, but got ${usedParamCount}.`;
			} else {
				if (usedParamCount <= maxParamCount && usedParamCount >= minParamCount) {
					continue;
				}

				message = minParamCount === maxParamCount ?
					`Expected ${minParamCount} arguments, but got ${usedParamCount}.` :
					`Expected ${minParamCount}-${maxParamCount} arguments, but got ${usedParamCount}.`;
			}

			diagnostics.push(new Diagnostic(range, message, DiagnosticSeverity.Error));
		}

		return diagnostics;
	}

	private getParamCount(signature: string): { minParamCount: number, maxParamCount: number } {
		const open = signature.indexOf('(');
		const close = signature.lastIndexOf(')');

		// If close + 2 is further than open it means we have no parameters
		// E.g GetListenServerHost() -> GetListenServerHost )( 
		if (open === -1 || close === -1 || close < open + 2) {
			return {
				minParamCount: 0,
				maxParamCount: 0
			};
		}
		
		const lexer = new Lexer(signature.slice(open + 1, close));
		const iterator = new TokenIterator(lexer.getTokens());

		let paramCount = 1;
		let defaultParamCount = 0;
		let isVariadic = false;
		while (iterator.hasNext()) {
			const token = iterator.next();
			switch (token.kind) {
			case TokenKind.COMMA:
				paramCount++;
				break;
			case TokenKind.ASSIGN:
				defaultParamCount++;
				break;
			case TokenKind.VARPARAMS:
				isVariadic = true;
				break;
			}
		}

		return {
			minParamCount: paramCount - defaultParamCount - (isVariadic ? 1 : 0),
			maxParamCount: isVariadic ? -1 : paramCount
		}
	}

	private getUsedParamCount(iterator: TokenIterator): number {
		// Find the (
		while (iterator.hasNext()) {
			const token = iterator.next();
			if (token.isComment() || token.kind === TokenKind.LINE_FEED) {
				continue;
			}
			if (token.kind === TokenKind.LEFT_ROUND) {
				break;
			}

			return -1;
		}
		

		let depth = 1;
		let paramCount = 0;
		let foundParam = false;
		
		while (iterator.hasNext()) {
			const token = iterator.next();
			switch (token.kind) {
			case TokenKind.RIGHT_ROUND:
			case TokenKind.RIGHT_CURLY:
			case TokenKind.RIGHT_SQUARE:
				depth--;
				if (depth === 0) {
					return foundParam ? paramCount + 1 : 0;
				}
				break;
			case TokenKind.LEFT_ROUND:
			case TokenKind.LEFT_CURLY:
			case TokenKind.LEFT_SQUARE:
				depth++;
				break;
			case TokenKind.COMMA:
				if (depth === 1) {
					paramCount++;
				}
				break;
			}

			if (!foundParam && !token.isComment() && token.kind != TokenKind.LINE_FEED) {
				foundParam = true;
			}
		}

		return foundParam ? paramCount + 1 : 0;
	}
	

	public dispose(): void {
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
	}
}