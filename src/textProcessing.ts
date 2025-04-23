import { TextDocument, Position, Range } from 'vscode';

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

	public getCursor(): number {
		return this.cursor;
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
		this.cursor = Math.max(text.length - 1, 0);
	}

	public getCursor(): number {
		return this.cursor;
	}

	public hasNext(): boolean {
		return this.cursor != 0;
	}

	public next(): number {
		const char = this.text.charCodeAt(this.cursor);
		this.cursor--;
		return char;
	}
}

export class CharCode {
	private constructor() {} // Prevent instantiation


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