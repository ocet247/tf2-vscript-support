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
			if (CharCode.isIndentation(char)) {
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

	public findMethodDoc(name: string, multiline: boolean = true): { doc: vscriptGlobals.Doc, isDeprecated: boolean } | undefined {
		let doc;
		if (!this.hasDot(multiline)) {
			doc = vscriptGlobals.safeLookup(vscriptGlobals.allFunctions, name);
			
			if (doc) {
				return {
					doc,
					isDeprecated: false
				};
			}

			doc = vscriptGlobals.safeLookup(vscriptGlobals.allDeprecatedFunctions, name);
			if (doc) {
				return {
					doc,
					isDeprecated: true
				};
			}

			for (const instance of Object.values(vscriptGlobals.instancesMethods)) {
				doc = vscriptGlobals.safeLookup(instance, name);
				if (doc) {
					return {
						doc,
						isDeprecated: false
					};
				}
			}

			return undefined;
		}
		const instanceName = this.readIdentity(multiline);
		if (instanceName) {
			const entry = vscriptGlobals.safeLookup(vscriptGlobals.instancesMethods, instanceName);
			if (entry) {
				doc = vscriptGlobals.safeLookup(entry, name);
				if (!doc) {
					return undefined;
				}

				return {
					doc,
					isDeprecated: false
				};
			}
		}

		doc = vscriptGlobals.safeLookup(vscriptGlobals.allMethods, name);
		if (doc) {
			return {
				doc,
				isDeprecated: false
			};
		}

		doc = vscriptGlobals.safeLookup(vscriptGlobals.allDeprecatedMethods, name);
		if (!doc) {
			return undefined;
		}

		return {
			doc,
			isDeprecated: true
		};
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


	// Alphabetic Characters
	public static readonly a = 'a'.charCodeAt(0);
	public static readonly z = 'z'.charCodeAt(0);
	public static readonly A = 'A'.charCodeAt(0);
	public static readonly Z = 'Z'.charCodeAt(0);
	public static readonly x = 'x'.charCodeAt(0);
	public static readonly X = 'X'.charCodeAt(0);
	public static readonly f = 'f'.charCodeAt(0);
	public static readonly F = 'F'.charCodeAt(0);
	public static readonly UNDERSCORE = '_'.charCodeAt(0);

	// Numeric Characters
	public static readonly N0 = '0'.charCodeAt(0);
	public static readonly N7 = '7'.charCodeAt(0);
	public static readonly N9 = '9'.charCodeAt(0);

	// Special Characters
	public static readonly DOT = '.'.charCodeAt(0);
	public static readonly COMMA = ','.charCodeAt(0);
	public static readonly EQUALS = '='.charCodeAt(0);
	public static readonly ASTERISK = '*'.charCodeAt(0);
	public static readonly MINUS = '-'.charCodeAt(0);
	public static readonly PLUS = '+'.charCodeAt(0);
	public static readonly EXCLAMATION = '!'.charCodeAt(0);
	public static readonly RAVLYK = '@'.charCodeAt(0);
	public static readonly GREATER = '>'.charCodeAt(0);
	public static readonly LESS = '<'.charCodeAt(0);
	public static readonly HASH = '#'.charCodeAt(0);
	public static readonly SLASH = '/'.charCodeAt(0);
	public static readonly AMPERSAND = '&'.charCodeAt(0);
	public static readonly PIPE = '|'.charCodeAt(0);
	public static readonly COLON = ':'.charCodeAt(0);
	public static readonly PERCENT = '%'.charCodeAt(0);

	// Punctuation and Whitespace
	public static readonly TAB = '\t'.charCodeAt(0);
	public static readonly WHITESPACE = ' '.charCodeAt(0);
	public static readonly LINE_FEED = '\n'.charCodeAt(0);
	public static readonly CARRIAGE_RETURN = '\r'.charCodeAt(0);

	// Brackets and Parentheses
	public static readonly LEFT_SQUARE = '['.charCodeAt(0);
	public static readonly RIGHT_SQUARE = ']'.charCodeAt(0);
	public static readonly LEFT_CURLY = '{'.charCodeAt(0);
	public static readonly RIGHT_CURLY = '}'.charCodeAt(0);
	public static readonly LEFT_ROUND = '('.charCodeAt(0);
	public static readonly RIGHT_ROUND = ')'.charCodeAt(0);

	// Quotes
	public static readonly QUOTE = '\''.charCodeAt(0);
	public static readonly DOUBLE_QUOTE = '"'.charCodeAt(0);
	public static readonly BACKTICK = '`'.charCodeAt(0);

	
	public static isAlphabetic(char: number): boolean {
		return char === CharCode.UNDERSCORE ||          //  _
			char >= CharCode.a && char <= CharCode.z || // a-z
			char >= CharCode.A && char <= CharCode.Z;   // A-Z
	}

	public static isNumeric(char: number): boolean {
		return char >= CharCode.N0 && char <= CharCode.N9;
	}

	public static isOctal(char: number): boolean {
		return char >= CharCode.N0 && char <= CharCode.N7;
	}

	public static isHexadecimal(char: number): boolean {
		return CharCode.isNumeric(char) ||
			char >= CharCode.a && char <= CharCode.f ||
			char >= CharCode.A && char <= CharCode.F;
	}

	public static isAlphaNumeric(char: number): boolean {
		return CharCode.isAlphabetic(char) || CharCode.isNumeric(char);
	}

	public static isWhitespace(char: number): boolean {
		return char === CharCode.WHITESPACE || char === CharCode.TAB ||
			char === CharCode.LINE_FEED || char === CharCode.CARRIAGE_RETURN;
	}

	public static isIndentation(char: number): boolean {
		return char === CharCode.WHITESPACE || char === CharCode.TAB;
	}
}