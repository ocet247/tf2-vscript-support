import { SignatureHelpProvider, SignatureHelp, SignatureInformation, CancellationToken, TextDocument, Position, Range, ParameterInformation, workspace } from 'vscode';
import * as vscriptGlobals from './globals';
import CurrentDocument from './documentState';
import { TokenIterator, TokenKind } from './lexer';


export default class TF2VScriptSignatureHelpProvider implements SignatureHelpProvider {
	public provideSignatureHelp(document: TextDocument, position: Position, _token: CancellationToken): Promise<SignatureHelp> | undefined {
		if (!CurrentDocument.isInNut()) {
			return;
		}

		const lexer = CurrentDocument.getLexer();
		
		const token = lexer.getTokenAtPosition(document.offsetAt(position) - 1);
		if (token.object && token.object.isComment()) {
			return;
		}

		
		const iterator = new TokenIterator(lexer.getTokens(), token.index);

		const paramCount = this.readParamCount(iterator);
		if (paramCount === -1) {
			return;
		}

		const doc = iterator.findMethodDoc();
		if (!doc) {
			return;
		}

		const { signatureInformation, isVariadic } = this.getSignatureInformation(doc);
		
		const signatureHelp = new SignatureHelp();
		signatureHelp.signatures = [signatureInformation];
		signatureHelp.activeParameter = isVariadic ? Math.min(signatureInformation.parameters.length - 1, paramCount) : paramCount;

		return Promise.resolve(signatureHelp);
	}

	private readParamCount(iterator: TokenIterator): number {
		let depth = 1;
		let paramCount = 0;
		
		while (iterator.hasPrevious()) {
			const token = iterator.previous();
			switch (token.kind) {
			case TokenKind.RIGHT_ROUND:
			case TokenKind.RIGHT_CURLY:
			case TokenKind.RIGHT_SQUARE:
				depth++;
				break;
			case TokenKind.LEFT_CURLY:
			case TokenKind.LEFT_SQUARE:
				depth--;
				if (depth === 0) {
					// if we were inside a table or array, or another function then reset all the commas we've counted
					// E.g. myFunc(abc, [21, 32, 65, | ], )
					// Where | is a cursor
					depth = 1;
					paramCount = 0;
				}
				break;
			case TokenKind.LEFT_ROUND:
				depth--;
				if (depth === 0) {
					return paramCount;
				}
				break;
			case TokenKind.COMMA:
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