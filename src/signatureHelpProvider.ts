import { SignatureHelpProvider, SignatureHelp, SignatureInformation, CancellationToken, TextDocument, Position, Range, ParameterInformation, workspace } from 'vscode';
import * as vscriptGlobals from './globals';
import { BackwardIterator, CharCode } from './textProcessing';
import CurrentDocument from './documentState';


export default class TF2VScriptSignatureHelpProvider implements SignatureHelpProvider {
	public provideSignatureHelp(document: TextDocument, position: Position, _token: CancellationToken): Promise<SignatureHelp> | null {
		if (!CurrentDocument.isInNut()) {
			return null;
		}
		
		const token = CurrentDocument.getLexer().getTokenAtPosition(document.offsetAt(position) - 1);
		if (token && token.isComment()) {
			return null;
		}
		
		const iterator = new BackwardIterator(BackwardIterator.textFromPosition(document, position));

		const paramCount = this.readParamCount(iterator);
		if (paramCount === -1) {
			return null;
		}

		const name = iterator.readIdentity();
		
		console.log(name);
		if (!name) {
			return null;
		}


		// Return 1 step back since we could've looked at the dot when canceling the identity reading
		iterator.back();

		const entry = iterator.findMethodDoc(name);
		if (!entry) {
			return null;
		}

		const { doc, isDeprecated } = entry;

		const { signatureInformation, isVariadic } = this.getSignatureInformation(doc);
		
		const signatureHelp = new SignatureHelp();
		signatureHelp.signatures = [signatureInformation];
		signatureHelp.activeParameter = isVariadic ? Math.min(signatureInformation.parameters.length - 1, paramCount) : paramCount;

		return Promise.resolve(signatureHelp);
	}

	private readParamCount(iterator: BackwardIterator): number {
		let depth = 1;
		let paramCount = 0;

		while (iterator.hasNext()) {
			let char = iterator.next();
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
				const opening = char;		
				// find the closing quote
				while (iterator.hasNext()) {
					char = iterator.next();
					if (char === opening) {
						if (!iterator.hasNext()) {
							break;
						}

						char = iterator.next();
						// Ignore escape chars
						if (char === CharCode.BACKSLASH) {
							if (!iterator.hasNext()) {
								break;
							}
							
							char = iterator.next();
							if (char === CharCode.BACKSLASH) {
								break;
							}

							continue;
						}

						break;
					}
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

	private getSignatureInformation(doc: vscriptGlobals.Doc): { signatureInformation: SignatureInformation, isVariadic: boolean } {
		let signature = doc.signature;

		// Cut the class at the left if present
		const dotIndex = signature.search(/(?<!\(.*)\./);
		if (dotIndex !== -1) {
			signature = signature.slice(dotIndex + 1);
		}

		const isVariadic = signature.indexOf("...") != -1;

		const signatureInformation = new SignatureInformation(signature);//, description);
		signatureInformation.parameters = this.getSignatureParams(signature);


		return {
			signatureInformation,
			isVariadic
		};
	}
}