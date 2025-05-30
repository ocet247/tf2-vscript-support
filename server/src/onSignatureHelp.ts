import { ParameterInformation, SignatureHelp, SignatureHelpParams, SignatureInformation } from 'vscode-languageserver';
import { documents, getDocumentSettings, documentInfo } from './server';
import { TokenIterator, TokenKind, isTokenAComment, globals } from 'squirrel';


export default async function onSignatureHelpHandler(params: SignatureHelpParams): Promise<SignatureHelp | null> {
	const document = documents.get(params.textDocument.uri);
	if (!document) {
		return null;
	}

	const settings = await getDocumentSettings(document.uri);
	if (!settings.enableSignatureHelp) {
		return null;
	}

	const info = documentInfo.get(document.uri);
	if (!info) {
		return null;
	}
	const { lexer } = info;
	

	const position = params.position;
	const offset = document.offsetAt(position) - 1;

	const result = lexer.findTokenAtPosition(offset);
	if (result.token && isTokenAComment(result.token)) {
		return null;
	}

	const iterator = new TokenIterator(lexer.getTokens(), result.index);

	const paramCount = readParamCount(iterator);
	if (paramCount === -1) {
		return null;
	}

	const doc = iterator.findMethodDoc();
	if (!doc) {
		return null;
	}

	const { signatureInformation, isVariadic } = getSignatureInformation(doc);

	const signatureHelp: SignatureHelp = {
		signatures: [signatureInformation],
		activeSignature: 0,
		activeParameter: isVariadic
			? Math.min(signatureInformation.parameters!.length - 1, paramCount)
			: paramCount
	};

	return signatureHelp;
}

function readParamCount(iterator: TokenIterator): number {
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

function getSignatureParams(signature: string): ParameterInformation[] {
	const open = signature.indexOf('(');
	const close = signature.lastIndexOf(')');

	// If close + 2 is further than open it means we have no parameters
	// E.g GetListenServerHost() -> GetListenServerHost )( 
	if (open === -1 || close === -1 || close < open + 2) {
		return [];
	}

	// Extract parameters between first pair of parentheses
	const paramStrings = signature.slice(open + 1, close).split(',');

	return paramStrings.map(param => ({ label: param }));
}

function getSignatureInformation(doc: globals.Doc): { signatureInformation: SignatureInformation, isVariadic: boolean } {
	let signature = doc.detail;

	// Cut the class at the left if present
	const dotIndex = signature.search(/(?<!\(.*)\./);
	if (dotIndex !== -1) {
		signature = signature.slice(dotIndex + 1);
	}

	const isVariadic = signature.indexOf("...") != -1;

	const signatureInformation: SignatureInformation = {
		label: signature,
		parameters: getSignatureParams(signature),
	};
	
	return {
		signatureInformation,
		isVariadic
	};
}