import { Diagnostic, Position, Range } from 'vscode';
import { CharCode } from './textProcessing';
import * as vscriptGlobals from './globals';

export enum TokenKind {
	EOF = 0,
	
	LINE_FEED = 10,     // \n
	LEFT_ROUND = 40,    // (
	RIGHT_ROUND = 41,   // )
	LEFT_CURLY = 123,   // {
	RIGHT_CURLY = 125,  // }
	LEFT_SQUARE = 91,  // [
	RIGHT_SQUARE = 93, // ]
	SEMICOLON = 59,     // ;
	COMMA = 44,         // ,
	QUESTION = 63,      // ?
	CARET = 94,         // ^
	TILDE = 126,        // ~
	DOT = 46,           // .
	COLON = 58,         // :
	PLUS = 43,          // +
	MINUS = 45,         // -
	MULTIPLY = 42,      // *
	DIVIDE = 47,        // /
	MODULO = 37,        // %
	BIT_AND = 38,       // &
	BIT_OR = 124,       // |
	LESS = 60,          // <
	GREATER = 62,       // >
	ASSIGN = 61,        // =
	EXCLAMATION = 33,   // !
	LAMBDA = 64,        // @

	IDENTIFIER = 258,
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
	ASTERISK,
	LINE_COMMENT,
	BLOCK_COMMENT,
	DOC
};


export class Token {
	public readonly kind: TokenKind;
	public readonly value: string;
	public readonly start: number;
	public readonly end: number;

	public static singleCharToken(kind: TokenKind, start: number) {
		return new Token(
			kind,
			String.fromCharCode(kind),
			start,
			start + 1
		);
	}

	constructor(kind: TokenKind, value: string, start: number, end: number) {
		this.kind = kind;
		this.value = value;
		this.start = start;
		this.end = end;
	}

	public log() {
		const kindName = TokenKind[this.kind] || `UNKNOWN(${this.kind})`;
		const valueDisplay = this.kind === TokenKind.STRING
			? `"${this.value}"`
			: `'${this.value}'`;

		console.log(`${kindName.padEnd(20)} ${valueDisplay.padEnd(15)} [${this.start}-${this.end}]`);
	}

	public isComment() {
		return this.kind === TokenKind.LINE_COMMENT ||
			this.kind === TokenKind.BLOCK_COMMENT ||
			this.kind === TokenKind.DOC;
	}
}

export class Lexer {
	private readonly text: string;
	private readonly tokens: Token[];
	private readonly diagnostics: Diagnostic[];

	// 0 based offset
	private cursor: number;

	private line: number;
	private column: number;

	private current: number;

	private readEOF: boolean;

	private readonly keywords: Map<string, TokenKind> = new Map([
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

	constructor(text: string) {
		this.text = text;
		this.tokens = [];
		this.diagnostics = [];

		this.line = 0;
		this.column = 0;
		this.cursor = 0;
		this.current = -1;

		this.readEOF = false;

		this.next();
		this.lex();
	}

	public getTokens(): Token[] {
		return this.tokens;
	}

	public getDiagnostics(): Diagnostic[] {
		return this.diagnostics;
	}

	private next() {
		if (this.readEOF) {
			return;
		}

		this.current = this.text.charCodeAt(this.cursor);
		this.cursor++;
		this.column++;

		if (Number.isNaN(this.current)) {
			this.readEOF = true;
			this.current = -1;
		}
	}

	private lex() {
		while (!this.readEOF) {
			const start = this.cursor - 1;
			switch (this.current) {
			case CharCode.WHITESPACE:
			case CharCode.CARRIAGE_RETURN:
			case CharCode.TAB: {
				this.next();
				continue;
			}
			case CharCode.LINE_FEED: {
				this.line++;
				this.column = 0;
				
				this.tokens.push(Token.singleCharToken(TokenKind.LINE_FEED, start));

				this.next();
				continue;
			}
			case CharCode.HASH: {
				this.lexLineComment();
				const end = this.cursor - 1;

				this.tokens.push(new Token(
					TokenKind.LINE_COMMENT,
					this.text.slice(start, end),
					start,
					end
				));

				continue;
			}
			case CharCode.SLASH: {
				this.next();
				switch (this.current) {
				case CharCode.ASTERISK: {
					const kind = this.lexBlockComment();
					const end = this.cursor - 1;

					this.tokens.push(new Token(
						kind,
						this.text.slice(start, end),
						start,
						end
					));

					continue;
				}
				case CharCode.SLASH: {
					this.lexLineComment();
					const end = this.cursor - 1;

					this.tokens.push(new Token(
						TokenKind.LINE_COMMENT,
						this.text.slice(start, end),
						start,
						end
					));

					continue;
				}
				case CharCode.EQUALS: {
					this.tokens.push(new Token(
						TokenKind.DIVIDE_ASSIGN,
						'/=',
						start,
						start + 2
					));

					this.next();
					continue;
				}
				}


				this.tokens.push(Token.singleCharToken(TokenKind.DIVIDE, start));

				continue;
			}
			case CharCode.EQUALS: {
				this.next();
				if (this.current === CharCode.EQUALS) {
					this.tokens.push(new Token(
						TokenKind.EQUALS,
						'==',
						start,
						start + 2
					));

					this.next();
					continue;
				}

				this.tokens.push(Token.singleCharToken(TokenKind.ASSIGN, start));

				continue;
			}
			case CharCode.LESS: {
				this.next();
				switch (this.current) {
				case CharCode.EQUALS: {
					this.next();
					if (this.current === CharCode.GREATER) {
						this.tokens.push(new Token(
							TokenKind.THREE_WAY_CMP,
							'<=>',
							start,
							start + 3
						));

						this.next();
						continue;
					}

					this.tokens.push(new Token(
						TokenKind.LESS_EQUALS,
						'<=',
						start,
						start + 2
					));

					continue;
				}
				case CharCode.MINUS: {
					this.tokens.push(new Token(
						TokenKind.NEW_SLOT,
						'<-',
						start,
						start + 2
					));

					this.next();
					continue;
				}
				case CharCode.LESS: {
					this.tokens.push(new Token(
						TokenKind.SHIFT_LEFT,
						'<<',
						start,
						start + 2
					));

					this.next();
					continue;
				}
				}

				this.tokens.push(Token.singleCharToken(TokenKind.LESS, start));

				continue;
			}
			case CharCode.GREATER: {
				this.next();
				switch (this.current) {
				case CharCode.EQUALS: {
					this.tokens.push(new Token(
						TokenKind.GREATER_EQUALS,
						'>=',
						start,
						start + 2
					));

					this.next();
					continue;
				}
				case CharCode.GREATER: {
					this.next();
					if (this.current === CharCode.GREATER) {
						this.tokens.push(new Token(
							TokenKind.UNSIGNED_SHIFT_RIGHT,
							'>>>',
							start,
							start + 3
						));

						this.next();
						continue;
					}
					this.tokens.push(new Token(
						TokenKind.SHIFT_RIGHT,
						'>>',
						start,
						start + 2
					));

					this.next();
					continue;
				}
				}

				this.tokens.push(Token.singleCharToken(TokenKind.GREATER, start));

				continue;
			}
			case CharCode.EXCLAMATION: {
				this.next();
				if (this.current === CharCode.EQUALS) {
					this.tokens.push(new Token(
						TokenKind.NOT_EQUALS,
						'!=',
						start,
						start + 2
					));

					this.next();
					continue;
				}

				this.tokens.push(Token.singleCharToken(TokenKind.EXCLAMATION, start));

				continue;
			}
			case CharCode.RAVLYK: {
				this.next();
				if (this.current === CharCode.DOUBLE_QUOTE) {
					this.lexVerbatimString();
					const end = this.cursor - 1;

					this.tokens.push(new Token(
						TokenKind.VERBATIM_STRING,
						this.text.slice(start, end),
						start,
						end
					));

					continue;
				}

				this.tokens.push(Token.singleCharToken(TokenKind.LAMBDA, start));

				continue;
			}
			case CharCode.QUOTE:
			case CharCode.DOUBLE_QUOTE: {
				const { kind, value } = this.lexString();
				const end = this.cursor - 1;
				this.tokens.push(new Token(
					kind,
					value,
					start,
					end
				));

				continue;
			}
			case CharCode.LEFT_CURLY:
			case CharCode.RIGHT_CURLY:
			case CharCode.LEFT_ROUND:
			case CharCode.RIGHT_ROUND:
			case CharCode.LEFT_SQUARE:
			case CharCode.RIGHT_SQUARE:
			case CharCode.SEMICOLON:
			case CharCode.COMMA:
			case CharCode.QUESTION:
			case CharCode.CARET:
			case CharCode.TILDE: {
				this.tokens.push(Token.singleCharToken(this.current, start));

				this.next();
				continue;
			}
			case CharCode.DOT: {
				this.next();
				if (this.current === CharCode.DOT) {
					this.next();
					if (this.current === CharCode.DOT) {
						this.tokens.push(new Token(
							TokenKind.VARPARAMS,
							'...',
							start,
							start + 3
						));

						this.next();
						continue;
					}

					this.diagnostics.push(new Diagnostic(
						new Range(new Position(this.line, start), new Position(this.line, start + 2)),
						"Invalid token '..'.",
					));
				}

				this.tokens.push(Token.singleCharToken(TokenKind.DOT, start));

				continue;
			}
			case CharCode.AMPERSAND: {
				this.next();
				if (this.current === CharCode.AMPERSAND) {
					this.tokens.push(new Token(
						TokenKind.AND,
						'&&',
						start,
						start + 2
					));

					this.next();
					continue;
				}

				this.tokens.push(Token.singleCharToken(TokenKind.BIT_AND, start));

				continue;
			}
			case CharCode.PIPE: {
				this.next();
				if (this.current === CharCode.PIPE) {
					this.tokens.push(new Token(
						TokenKind.OR,
						'||',
						start,
						start + 2
					));

					this.next();
					continue;
				}

				this.tokens.push(Token.singleCharToken(TokenKind.BIT_OR, start));

				continue;
			}
			case CharCode.COLON: {
				this.next();
				if (this.current === CharCode.COLON) {
					this.tokens.push(new Token(
						TokenKind.DOUBLE_COLON,
						'::',
						start,
						start + 2
					));

					this.next();
					continue;
				}

				this.tokens.push(Token.singleCharToken(TokenKind.COLON, start));

				continue;
			}
			case CharCode.ASTERISK: {
				this.next();
				if (this.current === CharCode.EQUALS) {
					this.tokens.push(new Token(
						TokenKind.MULTIPLY_ASSIGN,
						'*=',
						start,
						start + 2
					));

					this.next();
					continue;
				}

				this.tokens.push(Token.singleCharToken(TokenKind.MULTIPLY, start));


				continue;
			}
			case CharCode.PERCENT: {
				this.next();
				if (this.current === CharCode.EQUALS) {
					this.tokens.push(new Token(
						TokenKind.MODULO_ASSIGN,
						'%=',
						start,
						start + 2
					));

					this.next();
					continue;
				}

				this.tokens.push(Token.singleCharToken(TokenKind.MODULO, start));

				continue;
			}
			case CharCode.MINUS: {
				this.next();
				switch (this.current) {
				case CharCode.EQUALS: {
					this.tokens.push(new Token(
						TokenKind.MINUS_ASSIGN,
						'-=',
						start,
						start + 2
					));

					this.next();
					continue;
				}
				case CharCode.MINUS: {
					this.tokens.push(new Token(
						TokenKind.MINUS_MINUS,
						'--',
						start,
						start + 2
					));

					this.next();
					continue;
				}
				}

				this.tokens.push(Token.singleCharToken(TokenKind.MINUS, start));

				continue;
			}
			case CharCode.PLUS: {
				this.next();
				switch (this.current) {
				case CharCode.EQUALS: {
					this.tokens.push(new Token(
						TokenKind.PLUS_ASSIGN,
						'+=',
						start,
						start + 2
					));

					this.next();
					continue;
				}
				case CharCode.PLUS: {
					this.tokens.push(new Token(
						TokenKind.PLUS_PLUS,
						'++',
						start,
						start + 2
					));

					this.next();
					continue;
				}
				}

				this.tokens.push(Token.singleCharToken(TokenKind.PLUS, start));

				continue;
			}
			default:
				if (CharCode.isAlphabetic(this.current)) {
					this.lexIdentifier();
					const end = this.cursor - 1;

					const value = this.text.slice(start, end);

					this.tokens.push(new Token(
						this.keywords.get(value) ?? TokenKind.IDENTIFIER,
						value,
						start,
						end
					));

					continue;
				}

				if (CharCode.isNumeric(this.current)) {
					const { kind, value } = this.lexNumber();
					const end = this.cursor - 1;

					this.tokens.push(new Token(
						kind,
						value,
						start,
						end
					));

					continue;
				}

				if (CharCode.isControl(this.current)) {
					this.diagnostics.push(new Diagnostic(
						new Range(new Position(this.line, this.cursor - 1), new Position(this.line, this.cursor)),
						"Unexpected character (control)."
					))
				}

				this.next();
				continue;
			}
		}

		this.tokens.push(new Token(
			TokenKind.EOF,
			'',
			this.cursor - 1,
			this.cursor - 1
		));

		return this.tokens;
	}

	private lexLineComment() {
		do {
			this.next();
			// Find the end of the line
			if (this.current === CharCode.LINE_FEED) {
				break;
			}
		} while (!this.readEOF);
	}

	private lexBlockComment(): TokenKind {
		let kind = TokenKind.BLOCK_COMMENT;
		this.next();
		if (this.current === CharCode.ASTERISK) {
			this.next();
			if (this.current === CharCode.SLASH) {
				this.next();
				return TokenKind.BLOCK_COMMENT;
			}
			kind = TokenKind.DOC;
		}
		while (!this.readEOF) {
			if (this.current === CharCode.LINE_FEED) {
				this.line++;
				this.column = 0;
			} else if (this.current === CharCode.ASTERISK) {
				this.next();
				if (this.current === CharCode.SLASH) {
					this.next();
					return kind;
				}
				continue;
			}
			this.next();
		}


		this.diagnostics.push(new Diagnostic(
			new Range(new Position(this.line, this.cursor), new Position(this.line, this.cursor + 1)),
			"'*/' expected.",
		));

		return kind;
	}

	private lexVerbatimString() {
		const opening = this.current;
		do {
			this.next();
			if (this.current === CharCode.LINE_FEED) {
				this.line++;
				this.column = 0;
			} else if (this.current === opening) {
				this.next();
				return;
			}
		} while (!this.readEOF);
	}

	private lexString(): { kind: TokenKind, value: string } {
		const opening = this.current;
		const kind = opening === CharCode.QUOTE ? TokenKind.INTEGER : TokenKind.STRING;
		let value = "";
		
		const startPos = new Position(this.line, this.column - 1);
		this.next();
		while (!this.readEOF) {
			switch (this.current) {
			case CharCode.LINE_FEED:
				this.diagnostics.push(new Diagnostic(
					new Range(new Position(this.line, this.column), new Position(this.line, this.column)),
					"Multiline in a constant."
				));

				this.line++;
				this.column = 0;

				this.next();
				continue;
			case CharCode.BACKSLASH:
				this.next();
				switch (this.current) {
				case CharCode.x:
					value += this.processHexEscape(2);

					continue;
				case CharCode.u:
					value += this.processHexEscape(4);

					continue;
				case CharCode.U:
					value += this.processHexEscape(8);

					continue;
				case CharCode.t:
					value += '\t';

					this.next();
					continue;
				case CharCode.a:
					value += '\a';

					this.next();
					continue;
				case CharCode.b:
					value += '\b';

					this.next();
					continue;
				case CharCode.n:
					value += '\n';

					this.next();
					continue;
				case CharCode.r:
					value += '\r';

					this.next();
					continue;
				case CharCode.v:
					value += '\v';

					this.next();
					continue;
				case CharCode.f:
					value += '\f';

					this.next();
					continue;
				case CharCode.N0:
					value += '\0';

					this.next();
					continue;
				case CharCode.BACKSLASH:
					value += '\r';

					this.next();
					continue;
				case CharCode.QUOTE:
					value += '\'';

					this.next();
					continue;
				case CharCode.DOUBLE_QUOTE:
					value += '\"';

					this.next();
					continue;
				default:
					this.diagnostics.push(new Diagnostic(
						new Range(new Position(this.line, this.column - 2), new Position(this.line, this.column)),
						"Unrecognised escape character."
					));

					this.next();
				}
			case opening:
				this.next();
				if (opening === CharCode.QUOTE) {
					if (value.length === 0) {
						this.diagnostics.push(new Diagnostic(
							new Range(startPos, new Position(this.line, this.column - 1)),
							"Empty constant."
						));
					} else if (value.length > 1) {
						this.diagnostics.push(new Diagnostic(
							new Range(startPos, new Position(this.line, this.column - 1)),
							"Constant is too long."
						));
					}

					return {
						kind,
						value: value.charCodeAt(0).toString()
					}
				}

				return {
					kind,
					value
				}
			default:
				value += String.fromCharCode(this.current);

				this.next();
			}
		}

		this.diagnostics.push(new Diagnostic(
			new Range(new Position(this.line, this.column - 1), new Position(this.line, this.column - 1)),
			"Unterminated string literal."
		));

		return {
			kind,
			value
		}
	}

	private processHexEscape(maxDigits: number): string {
		this.next();
		if (!CharCode.isHexadecimal(this.current)) {
			this.diagnostics.push(new Diagnostic(
				new Range(new Position(this.line, this.column - 3), new Position(this.line, this.column)),
				"Hexadecimal number expected."
			));
			return "";
		}
		let number = this.current;
		for (let i = 1; i < maxDigits; i++) {
			this.next();
			if (!CharCode.isHexadecimal(this.current)) {
				return String.fromCharCode(number);
			}
			number += this.current;
		}

		this.next();
		return String.fromCharCode(number);
	}

	private lexIdentifier() {
		do {
			this.next();
		} while (!this.readEOF && CharCode.isAlphaNumeric(this.current));
	}

	private lexNumber(): { kind: TokenKind, value: string } {
		const first = this.current;

		let start = this.cursor - 1;
		this.next();
		if (first === CharCode.N0) {
			if (CharCode.isOctal(this.current)) {
				const value = this.lexOctal();
				return {
					kind: TokenKind.INTEGER,
					value: value,
				}
			} else if (this.current === CharCode.x || this.current === CharCode.X) {
				const value = this.lexHexadecimal();
				return {
					kind: TokenKind.INTEGER,
					value: value,
				}
			} else if (CharCode.isNumeric(this.current)) {
				// Cut the 0 at the start;
				start++;
			}
		}

		let kind = TokenKind.INTEGER;
		const startPos = new Position(this.line, this.column - 2);

		while (!this.readEOF) {
			if (this.current === CharCode.DOT) {
				kind = TokenKind.FLOAT;
			} else if (this.current === CharCode.e || this.current === CharCode.E) {
				kind = TokenKind.FLOAT;

				this.next();
				let offset = 2;
				if (this.current === CharCode.MINUS || this.current === CharCode.PLUS) {
					this.next();
					offset++;
				}

				if (!CharCode.isNumeric(this.current)) {
					if (this.current === CharCode.DOT) {
						do {
							this.next();
							if (CharCode.isNumeric(this.current) || this.current === CharCode.DOT) {
								continue;
							}
							if (this.current === CharCode.e || this.current === CharCode.E) {
								this.next();
								if (this.current === CharCode.MINUS || this.current === CharCode.PLUS) {
									continue;
								}
								break;
							}
							break;
						} while (!this.readEOF);
					}

					this.diagnostics.push(new Diagnostic(
						new Range(startPos, new Position(this.line, this.column - 1)),
						"Exponent expected."
					));

					break;
				}
			} else if (!CharCode.isNumeric(this.current)) {
				break;
			}

			this.next();
		}

		const end = this.cursor - 1;
		return {
			kind: kind,
			value: this.text.slice(start, end)
		}
	}


	private lexOctal(): string {
		const startPos = new Position(this.line, this.column - 2);
		let result = this.current - CharCode.N0;
		do {
			this.next();
			if (!CharCode.isOctal(this.current)) {
				if (CharCode.isNumeric(this.current)) {
					do {
						this.next();
					} while (CharCode.isNumeric(this.current) && !this.readEOF);

					this.diagnostics.push(new Diagnostic(
						new Range(startPos, new Position(this.line, this.column - 1)),
						"Invalid octal number."
					));
				}
				break;
			}

			result = result * 8 + this.current - CharCode.N0;
		} while (!this.readEOF);

		return result.toString();
	}

	private lexHexadecimal(): string {
		const startPos = new Position(this.line, this.column - 2);
		let result = 0;
		do {
			this.next();
			if (!CharCode.isHexadecimal(this.current)) {
				if (CharCode.isAlphaNumeric(this.current)) {
					do {
						this.next();
					} while (CharCode.isAlphaNumeric(this.current) && !this.readEOF);

					this.diagnostics.push(new Diagnostic(
						new Range(startPos, new Position(this.line, this.column - 1)),
						"Invalid hexadecimal number."
					));
				}

				break;
			}

			if (CharCode.isNumeric(this.current)) {
				result = result * 16 + (this.current - CharCode.N0);
			} else {
				const upper = CharCode.toUpper(this.current);
				result = result * 16 + (upper - CharCode.A + 10);
			}
		} while (!this.readEOF);

		return result.toString();
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