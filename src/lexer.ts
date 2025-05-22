import { Diagnostic, Range, TextDocument } from "vscode";
import { CharCode } from "./textProcessing";
import * as vscriptGlobals from "./globals";
export enum TokenKind {
	INVALID = -1,
	EOF = 0,
	
	LINE_FEED,
	LEFT_ROUND,
	RIGHT_ROUND,
	LEFT_CURLY,
	RIGHT_CURLY,
	LEFT_SQUARE,
	RIGHT_SQUARE,
	SEMICOLON,
	COMMA,
	TERNARY,
	BIT_XOR,
	BIT_NOT,
	DOT,
	COLON,
	PLUS,
	MINUS,
	MULTIPLY,
	DIVIDE,
	MODULO,
	BIT_AND,
	BIT_OR,
	LESS,
	GREATER,
	ASSIGN,
	NOT,
	LAMBDA,

	IDENTIFIER,
	STRING,
	VERBATIM_STRING,
	INTEGER,
	FLOAT,
	BASE,
	DELETE,
	EQUALS,
	NOT_EQUALS,
	LESS_EQUALS,
	GREATER_EQUALS,
	SWITCH,
	ARROW,
	AND,
	OR,
	IF,
	ELSE,
	WHILE,
	BREAK,
	FOR,
	DO,
	NULL,
	FOREACH,
	IN,
	NEW_SLOT,
	LOCAL,
	CLONE,
	FUNCTION,
	RETURN,
	TYPEOF,
	UNARY_MINUS,
	PLUS_ASSIGN,
	MINUS_ASSIGN,
	CONTINUE,
	YIELD,
	TRY,
	CATCH,
	THROW,
	SHIFT_LEFT,
	SHIFT_RIGHT,
	RESUME,
	DOUBLE_COLON,
	CASE,
	DEFAULT,
	THIS,
	PLUS_PLUS,
	MINUS_MINUS,
	THREE_WAY_CMP,
	UNSIGNED_SHIFT_RIGHT,
	CLASS,
	EXTENDS,
	CONSTRUCTOR,
	INSTANCEOF,
	VARPARAMS,
	__LINE__,
	__FILE__,
	TRUE,
	FALSE,
	MULTIPLY_ASSIGN,
	DIVIDE_ASSIGN,
	MODULO_ASSIGN,
	ATTR_OPEN,
	ATTR_CLOSE,
	STATIC,
	ENUM,
	CONST,
	RAWCALL,
	LINE_COMMENT,
	BLOCK_COMMENT,
	DOC
};

export class Token {
	public readonly kind: TokenKind;
	public readonly value: string;
	public readonly start: number;
	public readonly end: number;

	private static readonly comments = new Set([
		TokenKind.LINE_COMMENT,
		TokenKind.BLOCK_COMMENT,
		TokenKind.DOC
	]);

	constructor(kind: TokenKind, value: string, start: number, end: number) {
		this.kind = kind;
		this.value = value;
		this.start = start;
		this.end = end;
	}

	public isComment() {
		return Token.comments.has(this.kind);
	}

	public log() {
		const kindName = TokenKind[this.kind] || `UNKNOWN(${this.kind})`;
		const valueDisplay = this.kind === TokenKind.STRING
			? `"${this.value}"`
			: `'${this.value}'`;

		console.log(`${kindName.padEnd(20)} ${valueDisplay.padEnd(15)} [${this.start}-${this.end}]`);
	}
}

type TokenMap = {
	[char: string]: TokenKind | TokenMap | Function;
} & {
	fallback?: TokenKind;
} 

export class Lexer {
	private readonly text: string;
	private readonly document: TextDocument | null;
	
	private previousToken: Token | undefined;
	private currentToken: Token | undefined;

	private readonly tokens: Token[];

	private cursor: number;
	private current: string;

	private readEOF: boolean;

	private readonly diagnostics: Diagnostic[];

	private static readonly keywords: Map<string, TokenKind> = new Map([
		['while', TokenKind.WHILE],
		['do', TokenKind.DO],
		['if', TokenKind.IF],
		['else', TokenKind.ELSE],
		['break', TokenKind.BREAK],
		['continue', TokenKind.CONTINUE],
		['return', TokenKind.RETURN],
		['null', TokenKind.NULL],
		['function', TokenKind.FUNCTION],
		['local', TokenKind.LOCAL],
		['for', TokenKind.FOR],
		['foreach', TokenKind.FOREACH],
		['in', TokenKind.IN],
		['typeof', TokenKind.TYPEOF],
		['base', TokenKind.BASE],
		['delete', TokenKind.DELETE],
		['try', TokenKind.TRY],
		['catch', TokenKind.CATCH],
		['throw', TokenKind.THROW],
		['clone', TokenKind.CLONE],
		['yield', TokenKind.YIELD],
		['resume', TokenKind.RESUME],
		['switch', TokenKind.SWITCH],
		['case', TokenKind.CASE],
		['default', TokenKind.DEFAULT],
		['this', TokenKind.THIS],
		['class', TokenKind.CLASS],
		['extends', TokenKind.EXTENDS],
		['constructor', TokenKind.CONSTRUCTOR],
		['instanceof', TokenKind.INSTANCEOF],
		['true', TokenKind.TRUE],
		['false', TokenKind.FALSE],
		['static', TokenKind.STATIC],
		['enum', TokenKind.ENUM],
		['const', TokenKind.CONST],
		['__LINE__', TokenKind.__LINE__],
		['__FILE__', TokenKind.__FILE__],
		['rawcall', TokenKind.RAWCALL]
	]);

	private readonly tokenMap: TokenMap = {
		'\n': TokenKind.LINE_FEED,
		'#': this.lexLineComment.bind(this),
		'/': {
			'*': this.lexBlockComment.bind(this),
			'/': this.lexLineComment.bind(this),
			'=': TokenKind.DIVIDE_ASSIGN,
			'>': TokenKind.ATTR_CLOSE
		},
		'=': {
			'=': TokenKind.EQUALS,
			fallback: TokenKind.ASSIGN
		},
		'<': {
			'=': {
				'>': TokenKind.THREE_WAY_CMP,
				fallback: TokenKind.LESS_EQUALS
			},
			'-': TokenKind.NEW_SLOT,
			'<': TokenKind.SHIFT_LEFT,
			'/': TokenKind.ATTR_CLOSE,
			fallback: TokenKind.LESS,
		},
		'>': {
			'=': TokenKind.GREATER_EQUALS,
			'>': {
				'>': TokenKind.UNSIGNED_SHIFT_RIGHT,
				fallback: TokenKind.SHIFT_RIGHT
			},
			fallback: TokenKind.GREATER
		},
		'!': {
			'=': TokenKind.NOT_EQUALS,
			fallback: TokenKind.NOT
		},
		'@': {
			'"': this.lexVerbatimString.bind(this),
			fallback: TokenKind.LAMBDA
		},
		'"': this.lexString.bind(this),
		'\'': this.lexString.bind(this),
		'{': TokenKind.LEFT_CURLY,
		'}': TokenKind.RIGHT_CURLY,
		'(': TokenKind.LEFT_ROUND,
		')': TokenKind.RIGHT_ROUND,
		'[': TokenKind.LEFT_SQUARE,
		']': TokenKind.RIGHT_SQUARE,
		';': TokenKind.SEMICOLON,
		',': TokenKind.COMMA,
		'?': TokenKind.TERNARY,
		'^': TokenKind.BIT_XOR,
		'~': TokenKind.BIT_NOT,
		'.': {
			'.': {
				'.': TokenKind.VARPARAMS,
				fallback: TokenKind.INVALID,
			},
			fallback: TokenKind.DOT
		},
		'&': {
			'&': TokenKind.AND,
			fallback: TokenKind.BIT_AND
		},
		'|': {
			'|': TokenKind.OR,
			fallback: TokenKind.BIT_OR
		},
		':': {
			':': TokenKind.DOUBLE_COLON,
			fallback: TokenKind.COLON
		},
		'%': {
			'=': TokenKind.MODULO_ASSIGN,
			fallback: TokenKind.MODULO
		},
		'-': {
			'-': TokenKind.MINUS_MINUS,
			'=': TokenKind.MINUS_ASSIGN,
			fallback: TokenKind.MINUS
		},
		'+': {
			'+': TokenKind.PLUS_PLUS,
			'=': TokenKind.PLUS_ASSIGN,
			fallback: TokenKind.PLUS
		}
	}

	constructor(text: string, document: TextDocument | null = null) {
		this.text = text;
		this.document = document;

		this.tokens = [];

		this.cursor = 0;
		this.current = '';
		this.readEOF = false;

		this.diagnostics = [];

		this.next();
	}

	private charCode(): number {
		if (this.readEOF) {
			return -1;
		}
		
		return this.current.charCodeAt(0);
	}

	private next(): void {
		if (this.readEOF) {
			return;
		}

		this.current = this.text[this.cursor];
		this.cursor++;

		if (this.current === undefined) {
			this.readEOF = true;
			this.current = '';
		}
	}

	public getCurrentToken(): Token | undefined {
		return this.currentToken;
	}

	public getPreviousToken(): Token | undefined {
		return this.previousToken;
	}

	private addError(message: string, start: number, end: number) {
		if (!this.document) {
			return;
		}

		const startPos = this.document.positionAt(start);
		const endPos = this.document.positionAt(end);
		this.diagnostics.push(new Diagnostic(new Range(startPos, endPos), message));
	}

	public getDiagnostics(): Diagnostic[] {
		return this.diagnostics;
	}

	private newToken(kind: TokenKind, start: number, end: number, value?: string): void {
		if (!value) {
			value = this.text.slice(start, end);
		}

		const token = new Token(kind, value, start, end);
		this.tokens.push(token);
		if (kind === TokenKind.INVALID) {
			this.addError(`invalid token '${value}'`, start, end);
		} else if (kind === TokenKind.LINE_FEED) {
			// The next cycle previousToken would be set to this one
			this.currentToken = token;
			this.lex();
			return;
		};
		
		if (token.isComment()) {
			// We do not completely ignore newlines as they can be used to separate statements
			this.lex();
			return;
		}

		this.previousToken = this.currentToken;
		this.currentToken = token;
	}

	public lex(): void {
		let entry: TokenKind | TokenMap | Function | undefined;
		let previousEntry: TokenMap;
		while (true) {
			if (this.readEOF) {
				this.newToken(TokenKind.EOF, this.cursor - 1, this.cursor - 1);
				return;
			}

			const charCode = this.charCode();
			
			if (CharCode.isAlphabetic(charCode)) {
				const start = this.cursor - 1;
				this.lexIdentifier();
				const end = this.cursor - 1;

				const value = this.text.slice(start, end);
				
				this.newToken(Lexer.keywords.get(value) ?? TokenKind.IDENTIFIER, start, end, value);
				return;
			}
			
			if (CharCode.isNumeric(charCode)) {
				this.next();
				continue;
			}

			entry = this.tokenMap[this.current];

			if (typeof entry === "number") {
				const start = this.cursor - 1;
				const end = this.cursor;
				this.next();
				this.newToken(entry, start, end);
				return;
			}

			if (typeof entry === "function") {
				const start = this.cursor - 1;
				const kind = entry();
				const end = this.cursor - 1;
				this.newToken(kind, start, end);
				return;
			}

			this.next();
			if (entry) {
				previousEntry = entry;
				break;
			}
		}

		
		const start = this.cursor - 2;
		while (true) {
			if (this.readEOF || !(this.current in previousEntry)) {
				if (!previousEntry.fallback) {
					break;
				}
				const end = this.cursor - 1;

				this.newToken(previousEntry.fallback, start, end);
				return;
			}

			const entry = previousEntry[this.current];

			if (typeof entry === "number") {
				const end = this.cursor;
				this.next();
				this.newToken(entry, start, end);
				return;
			}

			if (typeof entry === "function") {
				const kind = entry();
				const end = this.cursor - 1;
				this.newToken(kind, start, end);
				return;
			}
			
			previousEntry = entry;
			this.next();
		}
		
		this.newToken(TokenKind.EOF, start, start);
		return;
	}

	private lexBlockComment(): TokenKind {
		let kind = TokenKind.BLOCK_COMMENT;
		this.next();
		if (this.charCode() === CharCode.ASTERISK) {
			this.next();
			if (this.charCode() === CharCode.SLASH) {
				this.next();
				return TokenKind.BLOCK_COMMENT;
			}
			kind = TokenKind.DOC;
		}
		while (!this.readEOF) {
			if (this.charCode() === CharCode.ASTERISK) {
				this.next();
				if (this.charCode() === CharCode.SLASH) {
					this.next();
					return kind;
				}
				continue;
			}
			this.next();
		}

		this.addError("'*/' expected.", this.cursor - 1, this.cursor);

		return kind;
	}

	private lexLineComment(): TokenKind {
		do {
			this.next();
		} while (!this.readEOF && this.charCode() !== CharCode.LINE_FEED);

		return TokenKind.LINE_COMMENT;
	}

	private lexVerbatimString(): TokenKind {
		const opening = this.charCode();
		do {
			this.next();
			if (this.charCode() === opening) {
				this.next();
				return TokenKind.VERBATIM_STRING;
			}
		} while (!this.readEOF);

		this.addError("Unterminated string literal.", this.cursor - 1, this.cursor);

		return TokenKind.VERBATIM_STRING;
	}

	private processHexEscape(maxDigits: number): string {
		this.next();
		const charCode = this.charCode();
		if (!CharCode.isHexadecimal(charCode)) {
			this.addError("Hexadecimal number expected.", this.cursor - 1, this.cursor);
			return "";
		}
		let number = charCode;
		for (let i = 1; i < maxDigits; i++) {
			this.next();
			const charCode = this.charCode();
			if (!CharCode.isHexadecimal(charCode)) {
				return String.fromCharCode(number);
			}
			number += charCode;
		}

		this.next();
		return String.fromCharCode(number);
	}

	private lexString(sequence?: string): TokenKind {
		const opening = this.charCode();
		const isChar = opening === CharCode.QUOTE;

		const start = this.cursor - 1;
		this.next();
		let chars = -1;
		while (!this.readEOF) {
			chars++;
			const charCode = this.charCode();
			switch (charCode) {
			case CharCode.LINE_FEED:
				this.addError("Multiline in a constant.", this.cursor - 1, this.cursor - 1);

				this.next();
				continue;
			case CharCode.BACKSLASH:
				this.next();
				switch (this.charCode()) {
				case CharCode.x:
					this.processHexEscape(2);
					continue;
				case CharCode.u:
					this.processHexEscape(4);
					continue;
				case CharCode.U:
					this.processHexEscape(8);
					continue;
				case CharCode.t:
				case CharCode.a:
				case CharCode.b:
				case CharCode.n:
				case CharCode.r:
				case CharCode.v:
				case CharCode.f:
				case CharCode.N0:
				case CharCode.BACKSLASH:
				case CharCode.QUOTE:
				case CharCode.DOUBLE_QUOTE:
					this.next();
					continue;
				default:
					this.addError("Unrecognised escape character.", this.cursor - 2, this.cursor);

					this.next();
					continue;
				}
			default:
				if (charCode != opening && (!sequence || this.text.slice(this.cursor - sequence.length, this.cursor))) {
					this.next();
					continue;
				}
				this.next();
				if (!isChar) {	
					return TokenKind.STRING;
				}

				if (chars === 0) {
					this.addError("Empty constant", start, this.cursor - 1);
				} else if (chars > 1) {
					this.addError("Constant is too long.", start, this.cursor - 1);
				}

				return TokenKind.INTEGER;
			}
		}


		this.addError("Unterminated string literal.", this.cursor - 1, this.cursor);

		return TokenKind.STRING;
	}

	private lexIdentifier() {
		do {
			this.next();
		} while (!this.readEOF && CharCode.isAlphaNumeric(this.charCode()));
	}

	public getTokens(): Token[] {
		return this.tokens;
	}

	public getTokenAtPosition(offset: number): { object: Token | null, index: number } {
		let left = 0;
		let right = this.tokens.length - 1;

		while (left <= right) {
			const mid = Math.floor((left + right) / 2);
			const token = this.tokens[mid];

			if (offset < token.start) {
				right = mid - 1;
			} else if (offset >= token.end) {
				left = mid + 1;
			} else {
				return {
					object: token,
					index: mid
				};
			}
		}

		// Not found: return the closest token to the left
		return {
			object: null,
			index: left - 1
		};
	}
}

export class TokenIterator {
	private tokens: Token[];
	private index: number;

	constructor(tokens: Token[], index: number = 0) {
		this.tokens = tokens;
		this.index = index;
	}

	public hasNext(): boolean {
		return this.index < this.tokens.length;
	}

	public next(): Token {
		const token = this.tokens[this.index];
		this.index++;
		return token;
	}

	public hasPrevious(): boolean {
		return this.index > -1;
	}

	public previous(): Token {
		const token = this.tokens[this.index];
		this.index--;
		return token;
	}

	public reset(): void {
		this.index = 0;
	}

	public setIndex(index: number): void {
		this.index = index;
	}

	public getIndex(): number {
		return this.index;
	}

	public readIdentity(multiline: boolean = true): string | null {
		while (this.hasPrevious()) {
			const token = this.previous();
			if (token.isComment()) {
				continue;
			}

			if (multiline && token.kind === TokenKind.LINE_FEED) {
				continue;
			}

			if (token.kind === TokenKind.IDENTIFIER) {
				return token.value;
			}
			
			this.next();
			break;
		}

		return null;
	}

	public hasDot(): boolean {
		while (this.hasPrevious()) {
			const token = this.previous();
			if (token.isComment() || token.kind === TokenKind.LINE_FEED) {
				continue;
			}

			if (token.kind === TokenKind.DOT) {
				return true;
			}

			break;
		}

		return false;
	}

	public findMethodDoc(methodName: string | null = null): vscriptGlobals.Doc | undefined {
		if (!methodName) {
			methodName = this.readIdentity();
			if (!methodName) {
				return;
			}
		} 

		if (!this.hasDot()) {
			const entry =
				vscriptGlobals.allFunctions.get(methodName) ||
				vscriptGlobals.allDeprecatedFunctions.get(methodName);
			
			if (entry) {
				return entry;
			}

			for (const methods of vscriptGlobals.instancesMethods.values()) {
				const entry = methods.get(methodName);
				if (entry) {
					return entry;
				}
			}

			return;
		}

		const instanceName = this.readIdentity();

		if (instanceName) {
			const entry = vscriptGlobals.instancesMethods.get(instanceName);
			if (entry) {
				return entry.get(methodName);
			}
		}

		return vscriptGlobals.allMethods.get(methodName) ||
			vscriptGlobals.allDeprecatedMethods.get(methodName);
	}
	
	public findDoc(name: string | null = null): vscriptGlobals.Doc | undefined {
		if (!name) {
			name = this.readIdentity();
			if (!name) {
				return;
			}
		}

		const entry = vscriptGlobals.events.get(name);
		if (entry) {
			return entry;
		}

		if (!this.hasDot()) {
			const entry =
				vscriptGlobals.allFunctions.get(name) ||
				vscriptGlobals.allDeprecatedFunctions.get(name) ||
				vscriptGlobals.builtInConstants.get(name) ||
				vscriptGlobals.builtInVariables.get(name);
			
			if (entry) {
				return entry;
			}

			for (const methods of vscriptGlobals.instancesMethods.values()) {
				const entry = methods.get(name);
				if (entry) {
					return entry;
				}
			}

			for (const members of vscriptGlobals.enumMembers.values()) {
				const entry = members.get(name);
				if (entry) {
					return entry;
				}
			}

			return;
		}

		const instanceName = this.readIdentity();
		if (instanceName) {
			let entry = vscriptGlobals.instancesMethods.get(instanceName);
			if (entry) {
				return entry.get(name);
			}

			entry = vscriptGlobals.enumMembers.get(instanceName);
			if (entry) {
				return entry.get(name);
			}
		}

		
		return vscriptGlobals.allMethods.get(name) ||
			vscriptGlobals.allDeprecatedMethods.get(name) ||
			vscriptGlobals.builtInEnums.get(name);
	}
}