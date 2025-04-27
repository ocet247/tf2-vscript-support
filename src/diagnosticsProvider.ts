import { DiagnosticCollection, TextDocument, workspace, Diagnostic, Position, Range, DiagnosticSeverity, languages, window, Disposable, DiagnosticTag } from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscriptGlobals from './globals';
import { ForwardIterator, CharCode, BackwardIterator } from './textProcessing';

export default class TF2VScriptDiagnosticsProvider {
	private readonly diagnosticCollection: DiagnosticCollection;

	private readonly tempFilePath: string;
	private readonly command: string;

	private readonly disposables: Disposable[];
	
	private timeOut: NodeJS.Timeout | undefined;

	constructor() {
		this.diagnosticCollection = languages.createDiagnosticCollection("squirrel-compiler");
		this.tempFilePath = path.join(os.tmpdir(), "tf2_vscript_lint_cache");
		this.command = `"${path.join(__dirname, "..", "compilers", "sq-compiler_3.2_Windows_x86.exe")}" "${this.tempFilePath}"`;

		this.disposables = [
			this.diagnosticCollection,
			workspace.onDidOpenTextDocument(document => this.changeDocument(document)),
			workspace.onDidChangeTextDocument(event => this.queueDiagnostics(event.document)),
			workspace.onDidCloseTextDocument(document => this.diagnosticCollection.delete(document.uri))
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

	private async runDiagnostics(document: TextDocument): Promise<void> {
		const text = document.getText();
		const compilerDiagnostics = await this.runCompiler(text);
		const parseDiagnostics = this.runParse(document, text);
		this.diagnosticCollection.set(document.uri, [...compilerDiagnostics, ...parseDiagnostics]);
	}

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
	}

	private runParse(document: TextDocument, text: string): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		const regex = /([_A-Za-z]\w*)\s*\(/gs
		let match: RegExpExecArray | null;
		while ((match = regex.exec(text))) {
			const name = match[1];
			const iterator = new BackwardIterator(text.slice(0, match.index));
			const doc = iterator.findMethodDoc(name);

			if (!doc) {
				continue;
			}

			const signature = doc.signature;

			const startPos = document.positionAt(match.index);
			const endPos = startPos.translate(0, match[1].length);
			const range = new Range(startPos, endPos);

			if (name in vscriptGlobals.allDeprecatedFunctions || name in vscriptGlobals.allDeprecatedMethods) {
				const diagnostic = new Diagnostic(range, `'${signature}' is deprecated.`, DiagnosticSeverity.Hint);
				diagnostic.tags = [DiagnosticTag.Deprecated];
				diagnostics.push(diagnostic);
			}


			const { paramCount, defaultParamCount } = this.getParamCount(signature);
			// The slices are probably expensive since they create a new long strings, needs to be remade with iterator instead.
			const usedParamCount = this.getUsedParamCount(text.slice(match.index + match[0].length));

			let message;
			if (defaultParamCount === -1) {
				const requiredParamCount = paramCount - 1;
				if (usedParamCount >= requiredParamCount) {
					continue;
				}

				message = `Expected at least ${requiredParamCount} arguments, but got ${usedParamCount}.`;
			} else {
				const requiredParamCount = paramCount - defaultParamCount;
				if (usedParamCount <= paramCount && usedParamCount >= requiredParamCount) {
					continue;
				}

				message = requiredParamCount === paramCount ?
					`Expected ${paramCount} arguments, but got ${usedParamCount}.` :
					`Expected ${requiredParamCount}-${paramCount} arguments, but got ${usedParamCount}.`;
			}

			diagnostics.push(new Diagnostic(range, message, DiagnosticSeverity.Error));
		}

		return diagnostics;
	}

	private getParamCount(signature: string): { paramCount: number, defaultParamCount: number } {
		const open = signature.indexOf('(');
		const close = signature.lastIndexOf(')');

		// If close + 2 is further than open it means we have no parameters
		// E.g GetListenServerHost() -> GetListenServerHost )( 
		if (open === -1 || close === -1 || close < open + 2) {
			return {
				paramCount: 0,
				defaultParamCount: 0
			};
		}
		
		const iterator = new ForwardIterator(signature.slice(open + 1, close));
		let paramCount = 1;

		// variadic
		if (signature.indexOf("...") != -1) {	
			while (iterator.hasNext()) {
				const char = iterator.next();
				if (char === CharCode.COMMA) {
					paramCount++;
				}
			}
			return {
				paramCount,
				defaultParamCount: -1
			}
		}

		

		let defaultParamCount = 0;
		while (iterator.hasNext()) {
			const char = iterator.next();
			if (char === CharCode.COMMA) {
				paramCount++;
			} else if (char === CharCode.EQUALS) {
				defaultParamCount++;
			}
		}
		
		return {
			paramCount,
			defaultParamCount
		}
	}

	private getUsedParamCount(text: string): number {
		const iterator = new ForwardIterator(text);
		let paramCount = 0;
		let depth = 1;
		let foundParam = false;
		while (iterator.hasNext()) {
			const char = iterator.next();
			switch (char) {
			case CharCode.RIGHT_ROUND:
			case CharCode.RIGHT_CURLY:
			case CharCode.RIGHT_SQUARE:
				depth--;
				if (depth === 0) {
					return foundParam ? paramCount + 1 : 0;
				}
				break;
			case CharCode.LEFT_CURLY:
			case CharCode.LEFT_SQUARE:
			case CharCode.LEFT_ROUND:
				depth++;
				break;
			case CharCode.DOUBLE_QUOTE:
			case CharCode.QUOTE:
			case CharCode.BACKTICK:
				while (iterator.hasNext() && char !== iterator.next()) {
					// find the closing quote or double quote
				}
				break;
			case CharCode.COMMA:
				if (depth === 1) {
					paramCount++;
				}
				break;
			}
			if (!foundParam && !CharCode.isWhitespace(char)) {
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