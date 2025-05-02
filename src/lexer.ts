import { Position, Range } from 'vscode';
import { CharCode } from './textProcessing';

export enum TokenKind {
	EOF = 0,

	LEFT_ROUND = 40,    // (
	RIGHT_ROUND = 41,   // )
	LEFT_CURLY = 123,   // {
	RIGHT_CURLY = 125,  // }
	LEFT_BRACKET = 91,  // [
	RIGHT_BRACKET = 93, // ]
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
	AT = 64,            // @

    IDENTIFIER = 258,
    STRING_LITERAL,
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
};

export class Token {
	public readonly kind: TokenKind;
	public readonly value: string;
	public readonly range: Range;

	public static singleCharToken(kind: TokenKind, pos: Position) {
		return new Token(
			kind,
			String.fromCharCode(kind),
			new Range(pos, pos)
		);
	}

	constructor(kind: TokenKind, value: string, range: Range) {
		this.kind = kind;
		this.value = value;
		this.range = range;
	}

	public log() {
		const kindName = TokenKind[this.kind] || `UNKNOWN(${this.kind})`;
		const valueDisplay = this.kind === TokenKind.STRING_LITERAL 
			? `"${this.value}"` 
			: `'${this.value}'`;
		
		console.log(`${kindName.padEnd(20)} ${valueDisplay.padEnd(15)} ` +
			`[${this.range.start.line}:${this.range.start.character}-` +
			`${this.range.end.line}:${this.range.end.character}]`);
	}
}

export class Lexer {
	public readonly text: string
	
	public line: number;
	public column: number;
	// 0 based offset
	public cursor: number;

	public current: number;

	public currentPos: Position;
	public previousPos: Position;

	public readEOF: boolean;

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
		this.line = 0;
		this.column = 0;
		this.cursor = 0;
		this.current = -1;

		this.currentPos = new Position(0, 0);
		this.previousPos = new Position(0, 0);

		this.readEOF = false;

		
		this.next();
	}

	public next() {
		if (this.readEOF) {
			return;
		}

		this.current = this.text.charCodeAt(this.cursor);
		this.cursor++;
		this.previousPos = this.currentPos;
		this.currentPos = new Position(this.line, this.column);

		if (Number.isNaN(this.current)) {
			this.readEOF = true;
			this.current = -1;

			return;
		}

		if (this.current === CharCode.LINE_FEED) {
			this.line++;
			this.column = 0;
		} else {
			this.column++;
		}
		
	}

	public lex(): Token[] {
		const tokens: Token[] = [];
		while (!this.readEOF) {
			switch (this.current) {
			case CharCode.WHITESPACE:
			case CharCode.CARRIAGE_RETURN:
			case CharCode.TAB:
			case CharCode.LINE_FEED: {
				this.next();
				continue;
			}
			case CharCode.HASH: {
				const start = this.cursor - 1;
				const startPos = this.currentPos;
				this.lexLineComment();
				const end = this.cursor - 1;
				const endPos = this.previousPos;

				tokens.push(new Token(
					TokenKind.LINE_COMMENT,
					this.text.slice(start, end),
					new Range(startPos, endPos))
				);

				continue;
			}
			case CharCode.SLASH: {
				const startPos = this.currentPos;
				
				const start = this.cursor - 1;
				this.next();
				switch (this.current) {
				case CharCode.ASTERISK: {
					this.lexBlockComment();
					const end = this.cursor - 1;
					const endPos = this.previousPos;

					tokens.push(new Token(
						TokenKind.BLOCK_COMMENT,
						this.text.slice(start, end),
						new Range(startPos, endPos))
					);

					continue;
				}
				case CharCode.SLASH: {
					this.lexLineComment();
					const end = this.cursor - 1;
					const endPos = this.previousPos;
	
					tokens.push(new Token(
						TokenKind.LINE_COMMENT,
						this.text.slice(start, end),
						new Range(startPos, endPos))
					);

					continue;
				}
				case CharCode.EQUALS: {
					const endPos = this.currentPos;
	
					tokens.push(new Token(
						TokenKind.DIVIDE_ASSIGN,
						'/=',
						new Range(startPos, endPos))
					);

					this.next();
					continue;
				}
				}


				tokens.push(Token.singleCharToken(TokenKind.DIVIDE, startPos));

				continue;
			}
			case CharCode.EQUALS: {
				const startPos = this.currentPos;

				this.next();
				if (this.current === CharCode.EQUALS) {
					const endPos = this.currentPos;
					tokens.push(new Token(
						TokenKind.EQUALS,
						'==',
						new Range(startPos, endPos))
					);

					this.next();
					continue;
				}

				tokens.push(Token.singleCharToken(TokenKind.ASSIGN, startPos));

				continue;
			}
			case CharCode.LESS: {
				const startPos = this.currentPos;

				this.next();
				switch (this.current) {
				case CharCode.EQUALS: {
					this.next();
					if (this.current === CharCode.GREATER) {
						const endPos = this.currentPos;
						tokens.push(new Token(
							TokenKind.THREE_WAY_CMP,
							'<=>',
							new Range(startPos, endPos))
						);

						this.next();
						continue;
					}

					const endPos = this.previousPos;
					tokens.push(new Token(
						TokenKind.LESS_EQUALS,
						'<=',
						new Range(startPos, endPos))
					);
					
					continue;
				}
				case CharCode.MINUS: {
					const endPos = this.currentPos;
					tokens.push(new Token(
						TokenKind.NEW_SLOT,
						'<-',
						new Range(startPos, endPos))
					);

					this.next();
					continue;
				}
				case CharCode.LESS: {
					const endPos = this.currentPos;
					tokens.push(new Token(
						TokenKind.SHIFT_LEFT,
						'<<',
						new Range(startPos, endPos))
					);

					this.next();
					continue;
				}
				}

				tokens.push(Token.singleCharToken(TokenKind.LESS, startPos));

				continue;
			}
			case CharCode.GREATER: {
				const startPos = this.currentPos;

				this.next();
				switch (this.current) {
				case CharCode.EQUALS: {
					const endPos = this.currentPos;
					tokens.push(new Token(
						TokenKind.GREATER_EQUALS,
						'>=',
						new Range(startPos, endPos))
					);

					this.next();
					continue;
				}
				case CharCode.GREATER: {
					this.next();
					if (this.current === CharCode.GREATER) {
						const endPos = this.currentPos;
						tokens.push(new Token(
							TokenKind.UNSIGNED_SHIFT_RIGHT,
							'>>>',
							new Range(startPos, endPos))
						);

						this.next();
						continue;
					}
					const endPos = this.previousPos;
					tokens.push(new Token(
						TokenKind.SHIFT_RIGHT,
						'>>',
						new Range(startPos, endPos))
					);

					this.next();
					continue;
				}
				}

				tokens.push(Token.singleCharToken(TokenKind.GREATER, startPos));

				continue;
			}
			case CharCode.EXCLAMATION: {
				const startPos = this.currentPos;

				this.next();
				if (this.current === CharCode.EQUALS) {
					const endPos = this.currentPos;
					tokens.push(new Token(
						TokenKind.NOT_EQUALS,
						'!=',
						new Range(startPos, endPos)
					));

					this.next();
					continue;
				}

				tokens.push(Token.singleCharToken(TokenKind.EXCLAMATION, startPos));

				continue;
			}
			case CharCode.RAVLYK: {
				const startPos = this.currentPos;

				this.next();
				if (this.current === CharCode.DOUBLE_QUOTE) {
					const { kind, value } = this.lexString(true);
					const endPos = this.currentPos;

					tokens.push(new Token(
						kind,
						value,
						new Range(startPos, endPos)
					));

					continue;
				}

				tokens.push(Token.singleCharToken(TokenKind.AT, startPos));

				continue;
			}
			case CharCode.DOUBLE_QUOTE:
			case CharCode.QUOTE: {
				const startPos = this.currentPos;
				const { kind, value } = this.lexString(true);
				const endPos = this.currentPos;

				tokens.push(new Token(
					kind,
					value,
					new Range(startPos, endPos)
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
				const pos = this.currentPos;
				tokens.push(Token.singleCharToken(this.current, pos));

				this.next();
				continue;
			}
			case CharCode.DOT: {
				const startPos = this.currentPos;

				this.next();
				if (this.current === CharCode.DOT) {
					this.next();
					if (this.current === CharCode.DOT) {
						const endPos = this.currentPos;
						tokens.push(new Token(
							TokenKind.VARPARAMS,
							'...',
							new Range(startPos, endPos)
						));

						this.next();
						continue;
					}
					// invalid token '..'
					continue;
				}

				tokens.push(Token.singleCharToken(TokenKind.DOT, startPos));

				continue;
			}
			case CharCode.AMPERSAND: {
				const startPos = this.currentPos;
				
				this.next();
				if (this.current === CharCode.AMPERSAND) {
					const endPos = this.currentPos;
					tokens.push(new Token(
						TokenKind.AND,
						'&&',
						new Range(startPos, endPos)
					));

					this.next();
					continue;
				}

				tokens.push(Token.singleCharToken(TokenKind.BIT_AND, startPos));

				continue;
			}
			case CharCode.PIPE: {
				const startPos = this.currentPos;

				this.next();
				if (this.current === CharCode.PIPE) {
					const endPos = this.currentPos;
					tokens.push(new Token(
						TokenKind.OR,
						'||',
						new Range(startPos, endPos)
					));

					this.next();
					continue;
				}

				tokens.push(Token.singleCharToken(TokenKind.BIT_OR, startPos));

				continue;
			}
			case CharCode.COLON: {
				const startPos = this.currentPos;

				this.next();
				if (this.current === CharCode.COLON) {
					const endPos = this.currentPos;
					tokens.push(new Token(
						TokenKind.DOUBLE_COLON,
						'::',
						new Range(startPos, endPos)
					));

					this.next();
					continue;
				}

				tokens.push(Token.singleCharToken(TokenKind.COLON, startPos));

				continue;
			}
			case CharCode.ASTERISK: {
				const startPos = this.currentPos;

				this.next();
				if (this.current === CharCode.EQUALS) {
					const endPos = this.currentPos;
					tokens.push(new Token(
						TokenKind.MULTIPLY_ASSIGN,
						'*=',
						new Range(startPos, endPos)
					));

					this.next();
					continue;
				}

				tokens.push(Token.singleCharToken(TokenKind.MULTIPLY, startPos));


				continue;
			}
			case CharCode.PERCENT: {
				const startPos = this.currentPos;

				this.next();
				if (this.current === CharCode.EQUALS) {
					const endPos = this.currentPos;
					tokens.push(new Token(
						TokenKind.MODULO_ASSIGN,
						'%=',
						new Range(startPos, endPos)
					));

					this.next();
					continue;
				}

				tokens.push(Token.singleCharToken(TokenKind.MODULO, startPos));

				continue;
			}
			case CharCode.MINUS: {
				const startPos = this.currentPos;

				this.next();
				switch (this.current) {
				case CharCode.EQUALS: {
					const endPos = this.currentPos;
					tokens.push(new Token(
						TokenKind.MINUS_ASSIGN,
						'-=',
						new Range(startPos, endPos)
					));

					this.next();
					continue;
				}
				case CharCode.MINUS: {
					const endPos = this.currentPos;
					tokens.push(new Token(
						TokenKind.MINUS_MINUS,
						'--',
						new Range(startPos, endPos)
					));

					this.next();
					continue;
				}
				}

				tokens.push(Token.singleCharToken(TokenKind.MINUS, startPos));

				continue;
			}
			case CharCode.PLUS: {
				const startPos = this.currentPos;

				this.next();
				switch (this.current) {
				case CharCode.EQUALS: {
					const endPos = this.currentPos;
					tokens.push(new Token(
						TokenKind.PLUS_ASSIGN,
						'+=',
						new Range(startPos, endPos)
					));

					this.next();
					continue;
				}
				case CharCode.PLUS: {
					const endPos = this.currentPos;
					tokens.push(new Token(
						TokenKind.PLUS_PLUS,
						'++',
						new Range(startPos, endPos)
					));

					this.next();
					continue;
				}
				}

				tokens.push(Token.singleCharToken(TokenKind.PLUS, startPos));

				continue;
			}
			default: 
				if (CharCode.isAlphabetic(this.current)) {
					const start = this.cursor - 1;
					const startPos = this.currentPos;
					this.lexIdentifier();
					const end = this.cursor - 1;
					const endPos = this.previousPos;
					
					const value = this.text.slice(start, end);

					tokens.push(new Token(
						this.keywords.get(value) ?? TokenKind.IDENTIFIER,
						value,
						new Range(startPos, endPos)
					));

					continue;
				}
				
				if (CharCode.isNumeric(this.current)) {
					const startPos = this.currentPos;
					const { kind, value } = this.lexNumber();
					const endPos = this.previousPos;

					tokens.push(new Token(
						kind,
						value,
						new Range(startPos, endPos)
					));

					continue;
				}

				if (CharCode.isControl(this.current)) {
					// unexpected character(control)
				}

				this.next();
				continue;
			}
		}

		tokens.push(new Token(
			TokenKind.EOF,
			'',
			new Range(this.currentPos, this.currentPos)
		));

		return tokens;
	}
	public lexLineComment() {
		do {
			this.next();
			// Find the end of the line
			if (this.current === CharCode.LINE_FEED) {
				break;
			}
		} while (!this.readEOF);
	}

	public lexBlockComment() {
		do {
			this.next();
			if (this.current === CharCode.ASTERISK) {
				this.next();
				if (this.current === CharCode.SLASH) {
					this.next();
					return;
				}
			}
		} while (!this.readEOF);

		// otherwise */ expected
	}

	public lexString(multiline: boolean): { kind: TokenKind, value: string } {
		const opening = this.current;
		let value = "";
		do {
			this.next();
			switch (this.current) {
			case CharCode.LINE_FEED:
				if (!multiline) {
					// error: multiline in a constant
				}
				value += '\n';

				continue;
			case CharCode.BACKSLASH:
				if (multiline) {
					value += '\\';
					continue;
				}

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
					continue;
				case CharCode.a:
					value += '\a';
					continue;
				case CharCode.b:
					value += '\b';
					continue;
				case CharCode.n:
					value += '\n';
					continue;
				case CharCode.r:
					value += '\r';
					continue;
				case CharCode.v:
					value += '\v';
					continue;
				case CharCode.f:
					value += '\f';
					continue;
				case CharCode.N0:
					value += '\0';
					continue;
				case CharCode.BACKSLASH:
					value += '\r';
					continue;
				case CharCode.QUOTE:
					value += '\'';
				case CharCode.DOUBLE_QUOTE:
					value += '\"';
					continue;
				default:
				// Unrecognised escape char
				}
			case opening:
				this.next();
				if (opening === CharCode.QUOTE) {
					if (value.length === 0) {
						// Empty constant
					} else if (value.length > 1) {
						// Constant too long
					}

					return {
						kind: TokenKind.INTEGER,
						value: value.charCodeAt(0).toString()
					};
				}
				
				return {
					kind: TokenKind.STRING_LITERAL,
					value: value
				};
			default:
				value += String.fromCharCode(this.current);
			}
		} while (!this.readEOF);
		// error : unfinished string
		return {
			kind: TokenKind.STRING_LITERAL,
			value: value
		}
	}

	private processHexEscape(maxDigits: number): string {
		this.next();
		if (!CharCode.isHexadecimal(this.current)) {
			// Hexadecimal expected;
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
		return String.fromCharCode(number);
	}

	public lexIdentifier() {
		do {
			this.next();
		} while (!this.readEOF && CharCode.isAlphaNumeric(this.current));
	}

	public lexNumber(): { kind: TokenKind, value: string } {
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
		while (!this.readEOF) {
			if (this.current === CharCode.DOT) {
				kind = TokenKind.FLOAT;
			} else if (this.current === CharCode.e || this.current === CharCode.E) {
				kind = TokenKind.FLOAT;

				this.next();
				if (this.current === CharCode.MINUS || this.current === CharCode.PLUS) {
					this.next();
				}

				if (!CharCode.isNumeric(this.current)) {
					// Error: exponent expected
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

	
	public lexOctal(): string {
		let result = this.current - CharCode.N0;
		do {
			this.next();
			if (!CharCode.isOctal(this.current)) {
				if (CharCode.isNumeric(this.current)) {
					// invalid octal number
				}
				break;
			}

			result = result * 8 + this.current - CharCode.N0;
		} while (!this.readEOF);

		return result.toString();
	}

	public lexHexadecimal(): string {
		let result = 0;
		do {
			this.next();
			if (!CharCode.isHexadecimal(this.current)) {
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
}