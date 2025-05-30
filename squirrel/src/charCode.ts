export default class CharCode {
	private constructor() {} // Prevent initialisation

	// Alphabetic Characters
	public static readonly a = 'a'.charCodeAt(0);
	public static readonly b = 'b'.charCodeAt(0);
	public static readonly c = 'c'.charCodeAt(0);
	public static readonly d = 'd'.charCodeAt(0);
	public static readonly e = 'e'.charCodeAt(0);
	public static readonly f = 'f'.charCodeAt(0);
	public static readonly g = 'g'.charCodeAt(0);
	public static readonly h = 'h'.charCodeAt(0);
	public static readonly i = 'i'.charCodeAt(0);
	public static readonly j = 'j'.charCodeAt(0);
	public static readonly k = 'k'.charCodeAt(0);
	public static readonly l = 'l'.charCodeAt(0);
	public static readonly m = 'm'.charCodeAt(0);
	public static readonly n = 'n'.charCodeAt(0);
	public static readonly o = 'o'.charCodeAt(0);
	public static readonly p = 'p'.charCodeAt(0);
	public static readonly q = 'q'.charCodeAt(0);
	public static readonly r = 'r'.charCodeAt(0);
	public static readonly s = 's'.charCodeAt(0);
	public static readonly t = 't'.charCodeAt(0);
	public static readonly u = 'u'.charCodeAt(0);
	public static readonly v = 'v'.charCodeAt(0);
	public static readonly w = 'w'.charCodeAt(0);
	public static readonly x = 'x'.charCodeAt(0);
	public static readonly y = 'y'.charCodeAt(0);
	public static readonly z = 'z'.charCodeAt(0);

	public static readonly A = 'A'.charCodeAt(0);
	public static readonly B = 'B'.charCodeAt(0);
	public static readonly C = 'C'.charCodeAt(0);
	public static readonly D = 'D'.charCodeAt(0);
	public static readonly E = 'E'.charCodeAt(0);
	public static readonly F = 'F'.charCodeAt(0);
	public static readonly G = 'G'.charCodeAt(0);
	public static readonly H = 'H'.charCodeAt(0);
	public static readonly I = 'I'.charCodeAt(0);
	public static readonly J = 'J'.charCodeAt(0);
	public static readonly K = 'K'.charCodeAt(0);
	public static readonly L = 'L'.charCodeAt(0);
	public static readonly M = 'M'.charCodeAt(0);
	public static readonly N = 'N'.charCodeAt(0);
	public static readonly O = 'O'.charCodeAt(0);
	public static readonly P = 'P'.charCodeAt(0);
	public static readonly Q = 'Q'.charCodeAt(0);
	public static readonly R = 'R'.charCodeAt(0);
	public static readonly S = 'S'.charCodeAt(0);
	public static readonly T = 'T'.charCodeAt(0);
	public static readonly U = 'U'.charCodeAt(0);
	public static readonly V = 'V'.charCodeAt(0);
	public static readonly W = 'W'.charCodeAt(0);
	public static readonly X = 'X'.charCodeAt(0);
	public static readonly Y = 'Y'.charCodeAt(0);
	public static readonly Z = 'Z'.charCodeAt(0);

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
	public static readonly SEMICOLON = ';'.charCodeAt(0);
	public static readonly QUESTION = '?'.charCodeAt(0);
	public static readonly CARET = '^'.charCodeAt(0);
	public static readonly TILDE = '~'.charCodeAt(0);

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
	public static readonly BACKSLASH = '\\'.charCodeAt(0);
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

	public static toUpper(char: number): number {
		if (char >= CharCode.a && char <= CharCode.z) {
            return char - 32;
        }
        return char;
	}
}