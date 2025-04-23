import { SignatureHelpProvider, SignatureHelp, SignatureInformation, CancellationToken, TextDocument, Position, Range, ParameterInformation } from 'vscode';
import * as vscriptGlobals from './globals';
import { BackwardIterator, CharCode } from './textProcessing';


export default class TF2VScriptSignatureHelpProvider implements SignatureHelpProvider {
	public provideSignatureHelp(document: TextDocument, position: Position, _token: CancellationToken): Promise<SignatureHelp> | null {
		const iterator = new BackwardIterator(BackwardIterator.textFromPosition(document, position));

		const paramCount = this.readParamCount(iterator);
		if (paramCount === -1) {
			return null;
		}

		const name = this.readName(iterator);
		if (!name) {
			return null;
		}

		const signatureInformation = this.getSignatureInformation(name);
		if (!signatureInformation) {
			return null;
		}

		
		const isVariadic = signatureInformation.label.indexOf("...") != -1;
		
		const signatureHelp = new SignatureHelp();
		signatureHelp.signatures = [signatureInformation];
		signatureHelp.activeParameter = isVariadic ? Math.min(signatureInformation.parameters.length - 1, paramCount) : paramCount;

		return Promise.resolve(signatureHelp);
	}

	private readParamCount(iterator: BackwardIterator): number {
		let depth = 1;
		let paramCount = 0;

		while (iterator.hasNext()) {
			const char = iterator.next();
			switch (char) {
			case CharCode.RIGHT_ROUND:
			case CharCode.RIGHT_CURLY:
			case CharCode.RIGHT_SQUARE:
				depth++;
				break;
			case CharCode.LEFT_CURLY:
			case CharCode.LEFT_SQUARE:
				depth--;
				if (depth === 0) {
					// if we were inside a table or array, or another function then reset all the commas we've counted
					// E.g. myFunc(abc, [21, 32, 65, | ], )
					// Where | is a cursor
					depth = 1;
					paramCount = 0;
				}
				break;
			case CharCode.LEFT_ROUND:
				depth--;
				if (depth === 0) {
					return paramCount;
				}
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
		}
		return -1;
	}

	private findFirstLetter(iterator: BackwardIterator): string | null {
		while (iterator.hasNext()) {
			const ch = iterator.next();
			if (CharCode.isWhitespace(ch)) {
				continue;
			}
			if (CharCode.isAlphaNumeric(ch)) {
				return String.fromCharCode(ch);
			}

			break;
		}
		return null;
	}

	private readName(iterator: BackwardIterator): string | null {
		let name = this.findFirstLetter(iterator);
		if (!name) {
			return null;
		}

		while (iterator.hasNext()) {
			const ch = iterator.next();
			if (!CharCode.isAlphaNumeric(ch)) {
				break;
			}

			name = String.fromCharCode(ch) + name;
		}

		return name;
	}

	private getSignatureParams(signature: string): ParameterInformation[] {
		const open = signature.indexOf('(');
		const close = signature.lastIndexOf(')');

		// If close + 2 is further than open it means we have no parameters
		// E.g GetListenServerHost() -> GetListenServerHost )( 
		if (open === -1 || close === -1 || close < open + 2) {
			return []
		}

		// Extract parameters between first pair of parentheses
		const paramStrings = signature.slice(open + 1, close).split(',');

		return paramStrings.map(param => new ParameterInformation(param));
	}

	private getSignatureInformation(name: string): SignatureInformation | null {
		const entry = vscriptGlobals.findDoc(name);
		if (!entry) {
			return null;
		}

		let signature = entry.signature;
		
		if (!signature) {
			return null;
		}

		// Cut the class at the left if present
		const dotIndex = signature.search(/(?<!\(.*)\./);
		if (dotIndex !== -1) {
			signature = signature.slice(dotIndex + 1);
		}

		const signatureInformation = new SignatureInformation(signature);//, description);
		signatureInformation.parameters = this.getSignatureParams(signature);


		return signatureInformation;
	}
}