import { TextDocument, Position, Range } from 'vscode';
import * as vscriptGlobals from './globals';


export class ForwardIterator {
	private readonly text: string;
	private cursor: number;

	// What no constructor overloading does to a man
	public static textFromPosition(document: TextDocument, position: Position): string {
		return document.getText(new Range(position, document.lineAt(document.lineCount - 1).range.end));
	}

	constructor(text: string) {
		this.text = text;
		this.cursor = 0;
	}

	public hasNext(): boolean {
		return this.cursor != this.text.length;
	}

	public next(): number {
		const char = this.text.charCodeAt(this.cursor);
		this.cursor++;
		return char;
	}
}

export class BackwardIterator {
	private readonly text: string;
	private cursor: number;

	public static textFromPosition(document: TextDocument, position: Position): string {
		return document.getText(new Range(new Position(0, 0), position));
	}

	constructor(text: string) {
		this.text = text;
		this.cursor = text.length - 1;
	}

	public getCursor(): number {
		return this.cursor;
	}

	public hasNext(): boolean {
		return this.cursor != -1;
	}

	public next(): number {
		const char = this.text.charCodeAt(this.cursor);
		this.cursor--;
		return char;
	}

	public back(): number {
		this.cursor++;
		const char = this.text.charCodeAt(this.cursor);
		return char;
	}

	public hasDot(multiline: boolean = true): boolean {
		while (this.hasNext()) {
			const char = this.next();
			if (CharCode.isIndentation(char)) {
				continue;
			}
			if (multiline && (char === CharCode.CARRIAGE_RETURN || char === CharCode.LINE_FEED)) {
				continue;
			}

			if (char === CharCode.DOT) {
				return true;
			}

			break;
		}

		return false;
	}

	private findFirstLetter(multiline: boolean): string | null {
		while (this.hasNext()) {
			const char = this.next();
			if (CharCode.isWhitespace(char)) {
				continue;
			}
			if (multiline && (char === CharCode.CARRIAGE_RETURN || char === CharCode.LINE_FEED)) {
				continue;
			}
			if (CharCode.isAlphaNumeric(char)) {
				return String.fromCharCode(char);
			}

			break;
		}
		return null;
	}

	public readIdentity(mutliline: boolean = true): string | null {
		let name = this.findFirstLetter(mutliline);
		if (!name) {
			return null;
		}

		while (this.hasNext()) {
			const ch = this.next();
			if (!CharCode.isAlphaNumeric(ch)) {
				break;
			}

			name = String.fromCharCode(ch) + name;
		}

		return name;
	}

	public findMethodDoc(name: string, multiline: boolean = true): vscriptGlobals.Doc | undefined {
		// Return 1 step back since we could've looked at the dot when canceling the identity reading
		if (!this.hasDot(multiline)) {
			let entry =
				vscriptGlobals.safeLookup(vscriptGlobals.allFunctions, name) ||
				vscriptGlobals.safeLookup(vscriptGlobals.allDeprecatedFunctions, name);
			
			if (entry) {
				return entry;
			}

			for (const instance of Object.values(vscriptGlobals.instancesMethods)) {
				entry = vscriptGlobals.safeLookup(instance, name);
				if (entry) {
					return entry;
				}
			}

			return undefined;
		}
		const instanceName = this.readIdentity(multiline);
		if (instanceName) {
			const entry = vscriptGlobals.safeLookup(vscriptGlobals.instancesMethods, instanceName);
			if (entry) {
				return vscriptGlobals.safeLookup(entry, name);
			}
		}

		return vscriptGlobals.safeLookup(vscriptGlobals.allMethods, name) ||
			vscriptGlobals.safeLookup(vscriptGlobals.allDeprecatedMethods, name);
	}


	public findDoc(name: string, multiline: boolean = true): vscriptGlobals.Doc | undefined { 
		if (!this.hasDot(multiline)) {
			let entry =
				vscriptGlobals.safeLookup(vscriptGlobals.allFunctions, name) ||
				vscriptGlobals.safeLookup(vscriptGlobals.allDeprecatedFunctions, name) ||
				vscriptGlobals.safeLookup(vscriptGlobals.builtInConstants, name) ||
				vscriptGlobals.safeLookup(vscriptGlobals.builtInVariables, name);
			
			if (entry) {
				return entry;
			}

			for (const instance of Object.values(vscriptGlobals.instancesMethods)) {
				entry = vscriptGlobals.safeLookup(instance, name);
				if (entry) {
					return entry;
				}
			}

			for (const instance of Object.values(vscriptGlobals.enumMembers)) {
				entry = vscriptGlobals.safeLookup(instance, name);
				if (entry) {
					return entry;
				}
			}

			return undefined;
		}

		const instanceName = this.readIdentity(multiline);
		if (instanceName) {
			let entry = vscriptGlobals.safeLookup(vscriptGlobals.instancesMethods, instanceName);
			if (entry) {
				return vscriptGlobals.safeLookup(entry, name);
			}

			entry = vscriptGlobals.safeLookup(vscriptGlobals.enumMembers, instanceName);
			if (entry) {
				return vscriptGlobals.safeLookup(entry, name);
			}
		}

		
		return vscriptGlobals.safeLookup(vscriptGlobals.allMethods, name) ||
			vscriptGlobals.safeLookup(vscriptGlobals.allDeprecatedMethods, name) ||
			vscriptGlobals.safeLookup(vscriptGlobals.builtInEnums, name);

	}
}

export class CharCode {
	private constructor() {} // Prevent initialisation


	public static readonly UNDERSCORE = '_'.charCodeAt(0);
	public static readonly a = 'a'.charCodeAt(0);
	public static readonly z = 'z'.charCodeAt(0);
	public static readonly A = 'A'.charCodeAt(0);
	public static readonly Z = 'Z'.charCodeAt(0);
	public static readonly N0 = '0'.charCodeAt(0);
	public static readonly N9 = '9'.charCodeAt(0);

	public static readonly DOT = '.'.charCodeAt(0);
	public static readonly COMMA = ','.charCodeAt(0);

	public static readonly TAB = '\t'.charCodeAt(0);
	public static readonly WHITESPACE = ' '.charCodeAt(0);
	public static readonly LINE_FEED = '\n'.charCodeAt(0);
	public static readonly CARRIAGE_RETURN = '\r'.charCodeAt(0);

	public static readonly LEFT_SQUARE = '['.charCodeAt(0);
	public static readonly RIGHT_SQUARE = ']'.charCodeAt(0);
	public static readonly LEFT_CURLY = '{'.charCodeAt(0);
	public static readonly RIGHT_CURLY = '}'.charCodeAt(0);
	public static readonly LEFT_ROUND = '('.charCodeAt(0);
	public static readonly RIGHT_ROUND = ')'.charCodeAt(0);

	public static readonly QUOTE = '\''.charCodeAt(0);
	public static readonly DOUBLE_QUOTE = '"'.charCodeAt(0);
	public static readonly BACKTICK = '`'.charCodeAt(0);

	public static readonly EQUALS = '='.charCodeAt(0);
	
	public static isAlphaNumeric(ch: number): boolean {
		return ch === CharCode.UNDERSCORE ||        //  _
			ch >= CharCode.a && ch <= CharCode.z || // a-z
			ch >= CharCode.A && ch <= CharCode.Z || // A-Z
			ch >= CharCode.N0 && ch <= CharCode.N9; // 0-9
	}

	public static isWhitespace(ch: number): boolean {
		return ch === CharCode.WHITESPACE || ch === CharCode.TAB || ch === CharCode.LINE_FEED || ch === CharCode.CARRIAGE_RETURN;
	}

	public static isIndentation(ch: number): boolean {
		return ch === CharCode.WHITESPACE || ch === CharCode.TAB;
	}
}