import { CharCode } from './textProcessing';

const enum TokenKind {
    IDENTIFIER,
    STRING_LITERAL,
    INTEGER,
    FLOAT,
    BASE,
    DELETE,
    EQ,
    NE,
    LE,
    GE,
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
    NEWSLOT,
    MODULO,
    LOCAL,
    CLONE,
    FUNCTION,
    RETURN,
    TYPEOF,
    UMINUS,
    PLUSEQ,
    MINUSEQ,
    CONTINUE,
    YIELD,
    TRY,
    CATCH,
    THROW,
    SHIFTL,
    SHIFTR,
    RESUME,
    DOUBLE_COLON,
    CASE,
    DEFAULT,
    THIS,
    PLUSPLUS,
    MINUSMINUS,
    THREEWAYSCMP,
    USHIFTR,
    CLASS,
    EXTENDS,
    CONSTRUCTOR,
    INSTANCEOF,
    VARPARAMS,
    __LINE__,
    __FILE__,
    TRUE_,
    FALSE,
    MULEQ,
    DIVEQ,
    MODEQ,
    ATTR_OPEN,
    ATTR_CLOSE,
    STATIC,
    ENUM,
    CONST,
	RAWCALL,
	DIVIDE,
	MUTLIPLY,
	ASSIGN,
	LESS,
	GREATER,
	EXCLAMATION,
	RAVLYK,
	DOT,
	BIT_AND,
	BIT_OR,
	COLON,
	ASTERISK,
	MINUS,
	PLUS,
};

class Token {
	public readonly kind: TokenKind
	public readonly value: string
	constructor(kind: TokenKind, value: string) {
		this.kind = kind;
		this.value = value;
	}
}

class Tokeniser {
	public readonly text: string
	
	public line: number;
	public column: number;
	// 0 based offset
	public cursor: number;

	public current: number;

	constructor(text: string) {
		this.text = text;
		this.line = 0;
		this.column = 0;
		this.cursor = 0;
		this.current = -1;
	}

	public next() {
		this.current = this.text.charCodeAt(this.cursor);
		this.cursor++;
		this.column++;
	}

	public hasNext(): boolean {
		return !Number.isNaN(this.current);
	}

	public lex(): Token[] {
		const tokens: Token[] = [];
		while (this.hasNext()) {
			switch (this.current) {
			case CharCode.WHITESPACE:
			case CharCode.CARRIAGE_RETURN:
			case CharCode.TAB:
				this.next();
				continue;
			case CharCode.LINE_FEED:
				this.line++;
				this.column = 0;
				this.next();
				continue;
			case CharCode.HASH:
				this.lexLineComment();
				continue;
			case CharCode.SLASH:
				this.next();
				switch (this.current) {
				case CharCode.ASTERISK:
					this.lexBlockComment();
					continue;
				case CharCode.SLASH:
					this.lexLineComment();
					continue;
				case CharCode.EQUALS:
					this.next();
					tokens.push(new Token(TokenKind.DIVEQ, '/='));
					continue;
				}
				tokens.push(new Token(TokenKind.DIVIDE, '/'));
				continue;
			case CharCode.EQUALS:
				this.next();
				if (this.current === CharCode.EQUALS) {
					this.next();
					tokens.push(new Token(TokenKind.EQ, '=='));
					continue;
				}
				tokens.push(new Token(TokenKind.ASSIGN, '='));
				continue;
			case CharCode.LESS:
				this.next();
				switch (this.current) {
				case CharCode.EQUALS:
					this.next();
					if (this.current === CharCode.GREATER) {
						this.next();
						tokens.push(new Token(TokenKind.THREEWAYSCMP, '<=>'));
						continue;
					}
					tokens.push(new Token(TokenKind.LE, '<='));
					continue;
				case CharCode.MINUS:	
					this.next();
					tokens.push(new Token(TokenKind.NEWSLOT, '<-'));
					continue;
				case CharCode.LESS:	
					this.next();
					tokens.push(new Token(TokenKind.SHIFTL, '<<'));
					continue;
				}
				tokens.push(new Token(TokenKind.LESS, '<'));
				continue;
			case CharCode.GREATER:
				this.next();
				switch (this.current) {
				case CharCode.EQUALS:
					this.next();
					tokens.push(new Token(TokenKind.GE, '>='));
					continue;
				case CharCode.GREATER:
					this.next();
					if (this.current === CharCode.GREATER) {
						this.next();
						tokens.push(new Token(TokenKind.USHIFTR, '>>>'));
						continue;
					}
					tokens.push(new Token(TokenKind.SHIFTR, '>>'));
					continue;
				}
				tokens.push(new Token(TokenKind.GREATER, '>'));
				continue;
			case CharCode.EXCLAMATION:
				this.next();
				if (this.current === CharCode.EQUALS) {
					this.next();
					tokens.push(new Token(TokenKind.NE, '!='));
					continue;
				}
				tokens.push(new Token(TokenKind.EXCLAMATION, '!'));
				continue;
			case CharCode.RAVLYK:
				this.next();
				if (this.current === CharCode.DOUBLE_QUOTE) {
					const string = this.readString(true);
					tokens.push(new Token(TokenKind.STRING_LITERAL, string));
					continue;
				}
				tokens.push(new Token(TokenKind.RAVLYK, '@'));
				continue;
			case CharCode.DOUBLE_QUOTE:
			case CharCode.QUOTE:
				const string = this.readString(false);
				tokens.push(new Token(TokenKind.STRING_LITERAL, string));
				continue;
			case CharCode.DOT:
				this.next();
				if (this.current === CharCode.DOT) {
					this.next();
					if (this.current === CharCode.DOT) {
						this.next();
						tokens.push(new Token(TokenKind.VARPARAMS, '...'));
						continue;
					}
					// invalid token '..'
					continue;
				}
				tokens.push(new Token(TokenKind.DOT, '.'));
				continue;
			case CharCode.AMPERSAND:
				this.next();
				if (this.current === CharCode.AMPERSAND) {
					this.next();
					tokens.push(new Token(TokenKind.AND, '&&'));
					continue;
				}
				tokens.push(new Token(TokenKind.BIT_AND, '&'));
			case CharCode.PIPE:
				this.next();
				if (this.current === CharCode.PIPE) {
					this.next();
					tokens.push(new Token(TokenKind.OR, '||'));
					continue;
				}
				tokens.push(new Token(TokenKind.BIT_OR, '|'));
			case CharCode.COLON:
				this.next();
				if (this.current === CharCode.COLON) {
					this.next();
					tokens.push(new Token(TokenKind.DOUBLE_COLON, '::'));
					continue;
				}
				tokens.push(new Token(TokenKind.DOUBLE_COLON, ':'));
				continue;
			case CharCode.ASTERISK:
				this.next();
				if (this.current === CharCode.EQUALS) {
					this.next();
					tokens.push(new Token(TokenKind.MULEQ, '*='));
					continue;
				}
				tokens.push(new Token(TokenKind.ASTERISK, '*'));
			case CharCode.PERCENT:
				this.next();
				if (this.current === CharCode.EQUALS) {
					this.next();
					tokens.push(new Token(TokenKind.MODEQ, '*='));
					continue;
				}
				tokens.push(new Token(TokenKind.MODULO, '%'));
			case CharCode.MINUS:
				this.next();
				switch (this.current) {
				case CharCode.EQUALS:
					this.next();
					tokens.push(new Token(TokenKind.MINUSEQ, '-='));
					continue;
				case CharCode.MINUS:
					this.next();
					tokens.push(new Token(TokenKind.MINUSMINUS, '--'));
					continue;
				}
				tokens.push(new Token(TokenKind.MINUS, '-'));
			case CharCode.PLUS:
				this.next();
				switch (this.current) {
				case CharCode.EQUALS:
					this.next();
					tokens.push(new Token(TokenKind.PLUSEQ, '+='));
					continue;
				case CharCode.PLUS:
					this.next();
					tokens.push(new Token(TokenKind.PLUSPLUS, '++'));
					continue;
				}
				tokens.push(new Token(TokenKind.PLUS, '+'));
			default: 
				if (CharCode.isAlphabetic(this.current)) {
					const value = this.readIdentifier();
					tokens.push(new Token(TokenKind.IDENTIFIER, value));
				} else if (CharCode.isNumeric(this.current)) {
					const { kind, value } = this.readNumber();
					tokens.push(new Token(kind, value));
				}
			}
		}
		return tokens;
	}
	public lexLineComment() {
		do {
			this.next();
			// Find the end of the line
		} while (this.current !== CharCode.LINE_FEED && this.hasNext());
	}

	public lexBlockComment() {
		while (this.hasNext()) {
			this.next();
			switch (this.current) {
			case CharCode.ASTERISK:
				this.next();
				if (this.current == CharCode.SLASH) {
					this.next();
					return;
				}
				continue;
			case CharCode.LINE_FEED:
				this.line++;
				this.column = 0;
			}
		}

		// otherwise */ expected
	}

	public readString(multiline: boolean): string {
		const opening = this.current;
		let previous1: number = -1;
		let previous2: number = -1;
		do {
			previous2 = previous1;
			previous1 = this.current;
			this.next();
			if (this.current === opening && (previous1 !== CharCode.SLASH || previous2 === CharCode.SLASH)) {
				this.next();
				return "";
			}
		} while (this.hasNext());

		return "";
		// Unfinished string
	}

	public readIdentifier(): string {
		return "";
	}

	public readNumber(): { kind: TokenKind, value: string } {
		const first = this.current;
		let value = String.fromCharCode(first);

		this.next();
		if (first === CharCode.N0) {
			if (CharCode.isOctal(this.current)) {
				do {
					value += String.fromCharCode(this.current);
					this.next();
				} while (CharCode.isOctal(this.current));

				if (CharCode.isNumeric(this.current)) {
					// invalid
				}

				return {
					kind: TokenKind.INTEGER,
					value: value,
				}
			} else if (this.current === CharCode.x || this.current === CharCode.X) {
				do {
					value += String.fromCharCode(this.current);
					this.next();
				} while (CharCode.isHexadecimal(this.current));

				return {
					kind: TokenKind.INTEGER,
					value: value,
				}
			}
		}
		return {
			kind: TokenKind.INTEGER,
			value: value
		}

	}
}