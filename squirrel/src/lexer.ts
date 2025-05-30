import CharCode from './charCode';
import * as globals from './globals';

export enum TokenKind {
	SKIP = -2,
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

export interface TokenError {
	message: string,
	start: number,
	end: number
}

export const tokenKindToString = new Map<TokenKind, string>([
	[TokenKind.EOF, 'EOF'],

	[TokenKind.LINE_FEED, 'line feed'],
	[TokenKind.LEFT_ROUND, '('],
	[TokenKind.RIGHT_ROUND, ')'],
	[TokenKind.LEFT_CURLY, '{'],
	[TokenKind.RIGHT_CURLY, '}'],
	[TokenKind.LEFT_SQUARE, '['],
	[TokenKind.RIGHT_SQUARE, ']'],
	[TokenKind.SEMICOLON, ';'],
	[TokenKind.COMMA, ','],
	[TokenKind.TERNARY, '?'],
	[TokenKind.BIT_XOR, '^'],
	[TokenKind.BIT_NOT, '~'],
	[TokenKind.DOT, '.'],
	[TokenKind.COLON, ':'],
	[TokenKind.PLUS, '+'],
	[TokenKind.MINUS, '-'],
	[TokenKind.MULTIPLY, '*'],
	[TokenKind.DIVIDE, '/'],
	[TokenKind.MODULO, '%'],
	[TokenKind.BIT_AND, '&'],
	[TokenKind.BIT_OR, '|'],
	[TokenKind.LESS, '<'],
	[TokenKind.GREATER, '>'],
	[TokenKind.ASSIGN, '='],
	[TokenKind.NOT, '!'],
	[TokenKind.LAMBDA, '@'],

	[TokenKind.EQUALS, '=='],
	[TokenKind.NOT_EQUALS, '!='],
	[TokenKind.LESS_EQUALS, '<='],
	[TokenKind.GREATER_EQUALS, '>='],
	[TokenKind.SHIFT_LEFT, '<<'],
	[TokenKind.SHIFT_RIGHT, '>>'],
	[TokenKind.UNSIGNED_SHIFT_RIGHT, '>>>'],
	[TokenKind.THREE_WAY_CMP, '<=>'],
	[TokenKind.NEW_SLOT, '<-'],
	[TokenKind.DOUBLE_COLON, '::'],
	[TokenKind.PLUS_ASSIGN, '+='],
	[TokenKind.MINUS_ASSIGN, '-='],
	[TokenKind.MULTIPLY_ASSIGN, '*='],
	[TokenKind.DIVIDE_ASSIGN, '/='],
	[TokenKind.MODULO_ASSIGN, '%='],
	[TokenKind.PLUS_PLUS, '++'],
	[TokenKind.MINUS_MINUS, '--'],
	[TokenKind.ATTR_OPEN, '</'],
	[TokenKind.ATTR_CLOSE, '/>'],
	[TokenKind.VARPARAMS, '...'],

	// Literals and Identifiers
	[TokenKind.IDENTIFIER, 'identifier'],
	[TokenKind.STRING, 'string'],
	[TokenKind.VERBATIM_STRING, 'string'],
	[TokenKind.INTEGER, 'integer'],
	[TokenKind.FLOAT, 'float'],

	// Keywords
	[TokenKind.IF, 'if'],
	[TokenKind.ELSE, 'else'],
	[TokenKind.WHILE, 'while'],
	[TokenKind.FOR, 'for'],
	[TokenKind.FOREACH, 'foreach'],
	[TokenKind.IN, 'in'],
	[TokenKind.BREAK, 'break'],
	[TokenKind.CONTINUE, 'continue'],
	[TokenKind.RETURN, 'return'],
	[TokenKind.TRY, 'try'],
	[TokenKind.CATCH, 'catch'],
	[TokenKind.THROW, 'throw'],
	[TokenKind.YIELD, 'yield'],
	[TokenKind.RESUME, 'resume'],
	[TokenKind.SWITCH, 'switch'],
	[TokenKind.CASE, 'case'],
	[TokenKind.DEFAULT, 'default'],

	[TokenKind.NULL, 'null'],
	[TokenKind.TRUE, 'true'],
	[TokenKind.FALSE, 'false'],
	[TokenKind.LOCAL, 'local'],
	[TokenKind.TYPEOF, 'typeof'],
	[TokenKind.INSTANCEOF, 'instanceof'],
	[TokenKind.CLONE, 'clone'],
	[TokenKind.FUNCTION, 'function'],
	[TokenKind.CLASS, 'class'],
	[TokenKind.CONSTRUCTOR, 'constructor'],
	[TokenKind.EXTENDS, 'extends'],
	[TokenKind.THIS, 'this'],
	[TokenKind.STATIC, 'static'],
	[TokenKind.ENUM, 'enum'],
	[TokenKind.CONST, 'const'],
	[TokenKind.RAWCALL, 'rawcall'],
	[TokenKind.DELETE, 'delete'],

	// Special tokens
	[TokenKind.__LINE__, '__LINE__'],
	[TokenKind.__FILE__, '__FILE__'],

]);

const keywords = new Map<string, TokenKind>([
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

const comments = new Set<TokenKind>([
	TokenKind.LINE_COMMENT,
	TokenKind.BLOCK_COMMENT,
	TokenKind.DOC
]);

export function isTokenAComment(token: Token) {
	return comments.has(token.kind);
}

export interface Token {
	readonly kind: TokenKind;
	readonly value: string;
	readonly start: number;
	readonly end: number;
}

interface TokenData {
	kind: TokenKind,
	value: string
}

type TokenFunction = () => TokenKind | TokenData; 

type TokenMap = {
	[char: string]: TokenKind | TokenMap | TokenFunction;
} & {
	fallback: TokenKind;
};
// Better than checking if the currentToken is undefined in every scenario.
export const dummyToken = {
	kind: TokenKind.SKIP,
	value: '',
	start: 0,
	end: 0
};


export class Lexer {
	private readonly text: string;

	private previousToken: Token;
	private currentToken: Token;

	private readonly tokens: Token[];

	private cursor: number;
	private current: string;

	private readEOF: boolean;

	private readonly errors: TokenError[];

	private readonly tokenMap: Record<string, TokenKind | TokenMap | TokenFunction> = {
		'\r': TokenKind.SKIP,
		' ': TokenKind.SKIP,
		'\t': TokenKind.SKIP,
		'\n': TokenKind.LINE_FEED,
		'#': this.lexLineComment.bind(this),
		'/': {
			'*': this.lexBlockComment.bind(this),
			'/': this.lexLineComment.bind(this),
			'=': TokenKind.DIVIDE_ASSIGN,
			'>': TokenKind.ATTR_CLOSE,
			fallback: TokenKind.DIVIDE
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
			fallback: TokenKind.LESS
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
		'*': {
			'=': TokenKind.MULTIPLY_ASSIGN,
			fallback: TokenKind.MULTIPLY
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
		},

		// Whoopsie
		// Identifier
		'a': this.lexIdentifier.bind(this),
		'b': this.lexIdentifier.bind(this),
		'c': this.lexIdentifier.bind(this),
		'd': this.lexIdentifier.bind(this),
		'e': this.lexIdentifier.bind(this),
		'f': this.lexIdentifier.bind(this),
		'g': this.lexIdentifier.bind(this),
		'h': this.lexIdentifier.bind(this),
		'i': this.lexIdentifier.bind(this),
		'j': this.lexIdentifier.bind(this),
		'k': this.lexIdentifier.bind(this),
		'l': this.lexIdentifier.bind(this),
		'm': this.lexIdentifier.bind(this),
		'n': this.lexIdentifier.bind(this),
		'o': this.lexIdentifier.bind(this),
		'p': this.lexIdentifier.bind(this),
		'q': this.lexIdentifier.bind(this),
		'r': this.lexIdentifier.bind(this),
		's': this.lexIdentifier.bind(this),
		't': this.lexIdentifier.bind(this),
		'u': this.lexIdentifier.bind(this),
		'v': this.lexIdentifier.bind(this),
		'w': this.lexIdentifier.bind(this),
		'x': this.lexIdentifier.bind(this),
		'y': this.lexIdentifier.bind(this),
		'z': this.lexIdentifier.bind(this),

		'A': this.lexIdentifier.bind(this),
		'B': this.lexIdentifier.bind(this),
		'C': this.lexIdentifier.bind(this),
		'D': this.lexIdentifier.bind(this),
		'E': this.lexIdentifier.bind(this),
		'F': this.lexIdentifier.bind(this),
		'G': this.lexIdentifier.bind(this),
		'H': this.lexIdentifier.bind(this),
		'I': this.lexIdentifier.bind(this),
		'J': this.lexIdentifier.bind(this),
		'K': this.lexIdentifier.bind(this),
		'L': this.lexIdentifier.bind(this),
		'M': this.lexIdentifier.bind(this),
		'N': this.lexIdentifier.bind(this),
		'O': this.lexIdentifier.bind(this),
		'P': this.lexIdentifier.bind(this),
		'Q': this.lexIdentifier.bind(this),
		'R': this.lexIdentifier.bind(this),
		'S': this.lexIdentifier.bind(this),
		'T': this.lexIdentifier.bind(this),
		'U': this.lexIdentifier.bind(this),
		'V': this.lexIdentifier.bind(this),
		'W': this.lexIdentifier.bind(this),
		'X': this.lexIdentifier.bind(this),
		'Y': this.lexIdentifier.bind(this),
		'Z': this.lexIdentifier.bind(this),

		'_': this.lexIdentifier.bind(this),

		// Numbers
		'0': this.lexNumber.bind(this),
		'1': this.lexNumber.bind(this),
		'2': this.lexNumber.bind(this),
		'3': this.lexNumber.bind(this),
		'4': this.lexNumber.bind(this),
		'5': this.lexNumber.bind(this),
		'6': this.lexNumber.bind(this),
		'7': this.lexNumber.bind(this),
		'8': this.lexNumber.bind(this),
		'9': this.lexNumber.bind(this),
	};

	constructor(text: string) {
		this.text = text;

		this.tokens = [];
		this.currentToken = dummyToken;
		this.previousToken = dummyToken;

		this.cursor = 0;
		this.current = '';
		this.readEOF = false;

		this.errors = [];

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

	public getPreviousToken(): Token {
		return this.previousToken;
	}

	public getErrors(): TokenError[] {
		return this.errors;
	}

	private newToken(kind: TokenKind, start: number, end: number, value?: string): Token {
		if (!value) {
			value = this.text.slice(start, end);
		}
		
		if (kind === TokenKind.INVALID) {
			this.errors.push({ message: `Invalid token '${value}'`, start, end });
			return this.lex();
		}

		const token = { kind, value, start, end };
		this.tokens.push(token);
		
		if (kind === TokenKind.LINE_FEED) {
			// The next cycle previousToken would be set to this one
			this.currentToken = token;
			return this.lex();
		};
		
		if (isTokenAComment(token)) {
			// we do not change our current token if our token is happens to be a comment
			return this.lex();
		}

		this.previousToken = this.currentToken;
		this.currentToken = token;
		return token;
	}
	
	public getTokens(): Token[] {
		return this.tokens;
	}

	public lex(): Token {
		let previousEntry: TokenMap;
		while (true) {
			if (this.readEOF) {
				return this.newToken(TokenKind.EOF, this.cursor - 1, this.cursor - 1);
			}

			const entry = this.tokenMap[this.current];

			if (entry === undefined) {
				this.errors.push({ message: "Invalid character.", start: this.cursor - 1, end: this.cursor });
				this.next();
				continue;
			}

			if (typeof entry === "number") {
				if (entry === TokenKind.SKIP) {
					this.next();
					continue;
				}

				const start = this.cursor - 1;
				const end = this.cursor;
				this.next();
				return this.newToken(entry, start, end);
			}

			if (typeof entry === "function") {
				const start = this.cursor - 1;
				const result = entry();
				const end = this.cursor - 1;
				if (typeof result === "number") {	
					return this.newToken(result, start, end);
				}

				return this.newToken(result.kind, start, end, result.value);
			}

			this.next();
			previousEntry = entry;
			break;
		}

		
		const start = this.cursor - 2;
		while (true) {
			const entry = previousEntry[this.current];

			if (this.readEOF || entry === undefined) {
				const end = this.cursor - 1;

				return this.newToken(previousEntry.fallback, start, end);
			}
			
			if (typeof entry === "number") {
				const end = this.cursor;
				this.next();
				return this.newToken(entry, start, end);
			}

			if (typeof entry === "function") {
				const result = entry();
				const end = this.cursor - 1;
				if (typeof result === "number") {	
					return this.newToken(result, start, end);
				}

				return this.newToken(result.kind, start, end, result.value);
			}
			
			previousEntry = entry;
			this.next();
		}
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
		this.errors.push({ message: "'*/' expected.", start: this.cursor - 1, end: this.cursor });

		return kind;
	}

	private lexLineComment(): TokenKind {
		do {
			this.next();
		} while (!this.readEOF && this.charCode() !== CharCode.LINE_FEED);

		return TokenKind.LINE_COMMENT;
	}

	private lexVerbatimString(): TokenData {
		const opening = this.charCode();
		let value = "";
		do {
			this.next();
			if (this.charCode() === opening) {
				this.next();
				return { kind: TokenKind.VERBATIM_STRING, value };
			}
			value += this.current;
		} while (!this.readEOF);

		this.errors.push({ message: "Unterminated string literal.", start: this.cursor - 1, end: this.cursor });

		return { kind: TokenKind.VERBATIM_STRING, value };
	}

	private processHexEscape(maxDigits: number): string {
		this.next();
		const charCode = this.charCode();
		if (!CharCode.isHexadecimal(charCode)) {
			this.errors.push({ message: "Hexadecimal number expected.", start: this.cursor - 1, end: this.cursor });
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

	private lexString(): TokenData {
		const opening = this.charCode();
		const kind = opening === CharCode.QUOTE ? TokenKind.INTEGER : TokenKind.STRING;
		let value = "";

		const start = this.cursor - 1;
		this.next();
		while (!this.readEOF) {
			const charCode = this.charCode();
			switch (charCode) {
			case CharCode.LINE_FEED:
				this.errors.push({ message: `Multiline in a ${kind === TokenKind.STRING ? "string" : "character"} literal.`, start: this.cursor - 1, end: this.cursor - 1});
				this.next();
				continue;
			case CharCode.BACKSLASH:
				this.next();
				switch (this.charCode()) {
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
					value += '\x07';

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
					value += '"';

					this.next();
					continue;
				default:
					this.errors.push({ message: "Unrecognised escape character.", start: this.cursor - 2, end: this.cursor });
					this.next();
					continue;
				}
			case opening:
				if (kind === TokenKind.STRING) {
					this.next();
					return { kind, value };
				}

				if (value.length === 0) {
					this.errors.push({ message: "Character literal should contain a character.", start, end: this.cursor });
					this.next();
					return { kind, value: '0' };
				}
				
				if (value.length > 1) {
					this.errors.push({ message: "Character literal can only contain a single character.", start, end: this.cursor });
				}

				this.next();
				return { kind, value: value.charCodeAt(0).toString() };
			default:
				value += this.current;
				
				this.next();
				continue;
			}
		}

		this.errors.push({ message: `Unterminated ${kind === TokenKind.STRING ? "string" : "character"} literal.`, start: this.cursor - 1, end: this.cursor });
		return { kind, value };
	}

	private lexNumber(): TokenData {
		const first = this.charCode();

		let start = this.cursor - 1;
		this.next();
		let charCode = this.charCode();
		if (first === CharCode.N0) {
			if (CharCode.isOctal(charCode)) {
				const value = this.lexOctal();
				return {
					kind: TokenKind.INTEGER,
					value: value,
				};
			} else if (charCode === CharCode.x || charCode === CharCode.X) {
				const value = this.lexHexadecimal();
				return {
					kind: TokenKind.INTEGER,
					value: value,
				};
			} else if (CharCode.isNumeric(charCode)) {
				// Cut the 0 at the start;
				start++;
			}
		}

		let kind = TokenKind.INTEGER;
		while (!this.readEOF) {
			if (charCode === CharCode.DOT) {
				kind = TokenKind.FLOAT;
			} else if (charCode === CharCode.e || charCode === CharCode.E) {
				kind = TokenKind.FLOAT;

				this.next();
				charCode = this.charCode();
				if (charCode === CharCode.MINUS || charCode === CharCode.PLUS) {
					this.next();
					charCode = this.charCode();
				}

				if (!CharCode.isNumeric(charCode)) {
					if (charCode === CharCode.DOT) {
						// read the float number till the end
						do {
							this.next();		
							charCode = this.charCode();
							if (CharCode.isNumeric(charCode) || charCode === CharCode.DOT) {
								continue;
							}
							if (charCode === CharCode.e || charCode === CharCode.E) {
								this.next();	
								charCode = this.charCode();
								if (charCode === CharCode.MINUS || charCode === CharCode.PLUS) {
									continue;
								}
								break;
							}
							break;
						} while (!this.readEOF);
					}

					this.errors.push({ message: "Exponent expected.", start, end: this.cursor });
					break;
				}
			} else if (!CharCode.isNumeric(charCode)) {
				break;
			}

			this.next();
			charCode = this.charCode();
		}

		const end = this.cursor - 1;
		return {
			kind: kind,
			value: this.text.slice(start, end)
		};
	}


	private lexOctal(): string {
		const start = this.cursor - 2;
		let charCode = this.charCode();
		let result = charCode - CharCode.N0;
		do {
			this.next();
			charCode = this.charCode();
			if (!CharCode.isOctal(charCode)) {
				if (CharCode.isNumeric(charCode)) {
					do {
						this.next();
						charCode = this.charCode();
					} while (CharCode.isNumeric(charCode) && !this.readEOF);

					this.errors.push({ message: "Invalid octal number.", start, end: this.cursor });
				}
				break;
			}

			result = result * 8 + (charCode - CharCode.N0);
		} while (!this.readEOF);

		return result.toString();
	}

	private lexHexadecimal(): string {
		const start = this.cursor - 2;
		let result = 0;
		do {
			this.next();
			let charCode = this.charCode();
			if (!CharCode.isHexadecimal(charCode)) {
				if (CharCode.isAlphaNumeric(charCode)) {
					do {
						this.next();
						charCode = this.charCode();
					} while (CharCode.isAlphaNumeric(charCode) && !this.readEOF);

					this.errors.push({ message: "Invalid hexadecimal number.", start, end: this.cursor });
				}

				break;
			}

			if (CharCode.isNumeric(charCode)) {
				result = result * 16 + (charCode - CharCode.N0);
			} else {
				const upper = CharCode.toUpper(charCode);
				result = result * 16 + (upper - CharCode.A + 10);
			}
		} while (!this.readEOF);

		return result.toString();
	}

	private lexIdentifier(): TokenData {
		const start = this.cursor - 1;
		do {
			this.next();
		} while (!this.readEOF && CharCode.isAlphaNumeric(this.charCode()));
		const end = this.cursor - 1;

		const value = this.text.slice(start, end);
		return { kind: keywords.get(value) ?? TokenKind.IDENTIFIER, value };
	}

	public findTokenAtPosition(offset: number): { token: Token | null, index: number } {
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
				return { token: token, index: mid };
			}
		}

		// Not found: return the closest token to the left
		return { token: null, index: left - 1 };
	}
}

export class TokenIterator {
	private tokens: Token[];
	private index: number;

	constructor(tokens: Token[], index = 0) {
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

	public readIdentity(multiline = true): string | null {
		while (this.hasPrevious()) {
			const token = this.previous();
			if (isTokenAComment(token)) {
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
			if (isTokenAComment(token) || token.kind === TokenKind.LINE_FEED) {
				continue;
			}

			if (token.kind === TokenKind.DOT) {
				return true;
			}

			break;
		}

		return false;
	}

	public findMethodDoc(methodName: string | null = null): globals.Doc | undefined {
		if (!methodName) {
			methodName = this.readIdentity();
			if (!methodName) {
				return;
			}
		} 

		if (!this.hasDot()) {
			const entry =
				globals.functions.get(methodName) ||
				globals.deprecatedFunctions.get(methodName);
			
			if (entry) {
				return entry;
			}

			for (const methods of globals.instancesMethods.values()) {
				const entry = methods.get(methodName);
				if (entry) {
					return entry;
				}
			}

			return;
		}

		const instanceName = this.readIdentity();

		if (instanceName) {
			const entry = globals.instancesMethods.get(instanceName);
			if (entry) {
				return entry.get(methodName);
			}
		}

		return globals.methods.get(methodName) ||
			globals.deprecatedMethods.get(methodName);
	}
	
	public findDoc(name: string | null = null): globals.Doc | undefined {
		if (!name) {
			name = this.readIdentity();
			if (!name) {
				return;
			}
		}

		const entry = globals.events.get(name);
		if (entry) {
			return entry;
		}

		if (!this.hasDot()) {
			const entry =
				globals.functions.get(name) ||
				globals.deprecatedFunctions.get(name) ||
				globals.builtInConstants.get(name) ||
				globals.builtInVariables.get(name);
			
			if (entry) {
				return entry;
			}

			for (const methods of globals.instancesMethods.values()) {
				const entry = methods.get(name);
				if (entry) {
					return entry;
				}
			}

			for (const members of globals.instancesVariables.values()) {
				const entry = members.get(name);
				if (entry) {
					return entry;
				}
			}

			return;
		}

		const instanceName = this.readIdentity();
		if (instanceName) {
			let entry = globals.instancesMethods.get(instanceName);
			if (entry) {
				return entry.get(name);
			}

			entry = globals.instancesVariables.get(instanceName);
			if (entry) {
				return entry.get(name);
			}
		}
		
		return globals.methods.get(name) ||
			globals.deprecatedMethods.get(name);
	}
}