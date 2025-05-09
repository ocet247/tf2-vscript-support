import { Token, TokenKind } from './lexer';

// AST Node Types
export interface Node {
    type: string;
    loc?: {
        start: number;
        end: number;
    };
}

export interface Program extends Node {
    type: 'Program';
    body: Statement[];
}

export interface Statement extends Node {}

export interface Expression extends Node {}

// Literals
export interface Literal extends Expression {
    type: 'Literal';
    value: string | number | boolean | null;
}

export interface StringLiteral extends Expression {
    type: 'StringLiteral';
    value: string;
}

export interface NumericLiteral extends Expression {
    type: 'NumericLiteral';
    value: number;
}

export interface BooleanLiteral extends Expression {
    type: 'BooleanLiteral';
    value: boolean;
}

export interface NullLiteral extends Expression {
    type: 'NullLiteral';
    value: null;
}

// Identifiers
export interface Identifier extends Expression {
    type: 'Identifier';
    name: string;
}

// Expressions
export interface BinaryExpression extends Expression {
    type: 'BinaryExpression';
    operator: string;
    left: Expression;
    right: Expression;
}

export interface UnaryExpression extends Expression {
    type: 'UnaryExpression';
    operator: string;
    argument: Expression;
}

export interface CallExpression extends Expression {
    type: 'CallExpression';
    callee: Expression;
    arguments: Expression[];
}

export interface MemberExpression extends Expression {
    type: 'MemberExpression';
    object: Expression;
    property: Expression;
    computed: boolean;
}

export interface AssignmentExpression extends Expression {
    type: 'AssignmentExpression';
    left: Expression;
    operator: string;
    right: Expression;
}

export interface LogicalExpression extends Expression {
    type: 'LogicalExpression';
    operator: string;
    left: Expression;
    right: Expression;
}

// Statements
export interface ExpressionStatement extends Statement {
    type: 'ExpressionStatement';
    expression: Expression;
}

export interface BlockStatement extends Statement {
    type: 'BlockStatement';
    body: Statement[];
}

export interface IfStatement extends Statement {
    type: 'IfStatement';
    test: Expression;
    consequent: Statement;
    alternate?: Statement;
}

export interface WhileStatement extends Statement {
    type: 'WhileStatement';
    test: Expression;
    body: Statement;
}

export interface DoWhileStatement extends Statement {
    type: 'DoWhileStatement';
    test: Expression;
    body: Statement;
}

export interface ForStatement extends Statement {
    type: 'ForStatement';
    init?: Expression | null;
    test?: Expression | null;
    update?: Expression | null;
    body: Statement;
}

export interface ForEachStatement extends Statement {
    type: 'ForEachStatement';
    left: Identifier;
    right: Expression;
    body: Statement;
}

export interface FunctionDeclaration extends Statement {
    type: 'FunctionDeclaration';
    id: Identifier;
    params: Identifier[];
    body: BlockStatement;
}

export interface ReturnStatement extends Statement {
    type: 'ReturnStatement';
    argument?: Expression;
}

export interface BreakStatement extends Statement {
    type: 'BreakStatement';
}

export interface ContinueStatement extends Statement {
    type: 'ContinueStatement';
}

export interface LocalStatement extends Statement {
    type: 'LocalStatement';
    declarations: VariableDeclarator[];
}

export interface VariableDeclarator extends Node {
    type: 'VariableDeclarator';
    id: Identifier;
    init?: Expression;
}

export class Parser {
    private tokens: Token[];
    private current: number;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.current = 0;
    }

    private peek(): Token {
        return this.tokens[this.current];
    }

    private previous(): Token {
        return this.tokens[this.current - 1];
    }

    private isAtEnd(): boolean {
        return this.peek().kind === TokenKind.EOF;
    }

    private check(kind: TokenKind): boolean {
        if (this.isAtEnd()) return false;
        return this.peek().kind === kind;
    }

    private advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    private match(...kinds: TokenKind[]): boolean {
        for (const kind of kinds) {
            if (this.check(kind)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private consume(kind: TokenKind, message: string): Token {
        if (this.check(kind)) return this.advance();
        throw new Error(message);
    }

    public parse(): Program {
        const statements: Statement[] = [];
        while (!this.isAtEnd()) {
            statements.push(this.declaration() as Statement);
        }
        return {
            type: 'Program',
            body: statements
        };
    }

    private declaration(): Statement | null {
        try {
            if (this.match(TokenKind.FUNCTION)) return this.functionDeclaration();
            if (this.match(TokenKind.LOCAL)) return this.localDeclaration();
            return this.statement();
        } catch (error) {
            this.synchronize();
            return null;
        }
    }

    private functionDeclaration(): FunctionDeclaration {
        const name = this.consume(TokenKind.IDENTIFIER, "Expect function name.");
        this.consume(TokenKind.LEFT_ROUND, "Expect '(' after function name.");
        
        const parameters: Identifier[] = [];
        if (!this.check(TokenKind.RIGHT_ROUND)) {
            do {
                if (parameters.length >= 255) {
                    throw new Error("Cannot have more than 255 parameters.");
                }
                parameters.push({
                    type: 'Identifier',
                    name: this.consume(TokenKind.IDENTIFIER, "Expect parameter name.").value
                });
            } while (this.match(TokenKind.COMMA));
        }
        
        this.consume(TokenKind.RIGHT_ROUND, "Expect ')' after parameters.");
        this.consume(TokenKind.LEFT_CURLY, "Expect '{' before function body.");
        
        const body = this.block();
        
        return {
            type: 'FunctionDeclaration',
            id: {
                type: 'Identifier',
                name: name.value
            },
            params: parameters,
            body
        };
    }

    private localDeclaration(): LocalStatement {
        const declarations: VariableDeclarator[] = [];
        
        do {
            const name = this.consume(TokenKind.IDENTIFIER, "Expect variable name.");
            
            let initializer: Expression | undefined;
            if (this.match(TokenKind.ASSIGN)) {
                initializer = this.expression();
            }
            
            declarations.push({
                type: 'VariableDeclarator',
                id: {
                    type: 'Identifier',
                    name: name.value
                },
                init: initializer
            });
        } while (this.match(TokenKind.COMMA));
        
        return {
            type: 'LocalStatement',
            declarations
        };
    }

    private statement(): Statement {
        if (this.match(TokenKind.IF)) return this.ifStatement();
        if (this.match(TokenKind.WHILE)) return this.whileStatement();
        if (this.match(TokenKind.DO)) return this.doWhileStatement();
        if (this.match(TokenKind.FOR)) return this.forStatement();
        if (this.match(TokenKind.FOREACH)) return this.forEachStatement();
        if (this.match(TokenKind.RETURN)) return this.returnStatement();
        if (this.match(TokenKind.BREAK)) return this.breakStatement();
        if (this.match(TokenKind.CONTINUE)) return this.continueStatement();
        if (this.match(TokenKind.LEFT_CURLY)) return this.block();
        
        return this.expressionStatement();
    }

    private ifStatement(): IfStatement {
        this.consume(TokenKind.LEFT_ROUND, "Expect '(' after 'if'.");
        const condition = this.expression();
        this.consume(TokenKind.RIGHT_ROUND, "Expect ')' after if condition.");
        
        const thenBranch = this.statement();
        let elseBranch: Statement | undefined;
        
        if (this.match(TokenKind.ELSE)) {
            elseBranch = this.statement();
        }
        
        return {
            type: 'IfStatement',
            test: condition,
            consequent: thenBranch,
            alternate: elseBranch
        };
    }

    private whileStatement(): WhileStatement {
        this.consume(TokenKind.LEFT_ROUND, "Expect '(' after 'while'.");
        const condition = this.expression();
        this.consume(TokenKind.RIGHT_ROUND, "Expect ')' after condition.");
        const body = this.statement();
        
        return {
            type: 'WhileStatement',
            test: condition,
            body
        };
    }

    private doWhileStatement(): DoWhileStatement {
        const body = this.statement();
        this.consume(TokenKind.WHILE, "Expect 'while' after 'do' block.");
        this.consume(TokenKind.LEFT_ROUND, "Expect '(' after 'while'.");
        const condition = this.expression();
        this.consume(TokenKind.RIGHT_ROUND, "Expect ')' after condition.");
        
        return {
            type: 'DoWhileStatement',
            test: condition,
            body
        };
    }

    private forStatement(): ForStatement {
        this.consume(TokenKind.LEFT_ROUND, "Expect '(' after 'for'.");
        
        let initializer: Expression | null = null;
        if (this.match(TokenKind.SEMICOLON)) {
            initializer = null;
        } else if (this.match(TokenKind.LOCAL)) {
            initializer = this.localDeclaration() as Expression;
        } else {
            initializer = this.expressionStatement() as Expression;
        }
        
        let condition: Expression | null = null;
        if (!this.check(TokenKind.SEMICOLON)) {
            condition = this.expression();
        }
        this.consume(TokenKind.SEMICOLON, "Expect ';' after loop condition.");
        
        let increment: Expression | null = null;
        if (!this.check(TokenKind.RIGHT_ROUND)) {
            increment = this.expression();
        }
        this.consume(TokenKind.RIGHT_ROUND, "Expect ')' after for clauses.");
        
        let body = this.statement();
        
        if (increment !== null) {
            body = {
                type: 'BlockStatement',
                body: [
                    body,
                    {
                        type: 'ExpressionStatement',
                        expression: increment
                    } as ExpressionStatement
                ]
            } as BlockStatement;
        }
        
        if (condition === null) {
            condition = {
                type: 'BooleanLiteral',
                value: true
            } as BooleanLiteral;
        }
        
        body = {
            type: 'WhileStatement',
            test: condition,
            body
        } as WhileStatement;
        
        if (initializer !== null) {
            body = {
                type: 'BlockStatement',
                body: [
                    {
                        type: 'ExpressionStatement',
                        expression: initializer
                    } as ExpressionStatement,
                    body
                ]
            } as BlockStatement;
        }
        
        return {
            type: 'ForStatement',
            init: initializer,
            test: condition,
            update: increment,
            body
        };
    }

    private forEachStatement(): ForEachStatement {
        this.consume(TokenKind.LEFT_ROUND, "Expect '(' after 'foreach'.");
        const left = {
            type: 'Identifier' as const,
            name: this.consume(TokenKind.IDENTIFIER, "Expect variable name.").value
        };
        this.consume(TokenKind.IN, "Expect 'in' after variable name.");
        const right = this.expression();
        this.consume(TokenKind.RIGHT_ROUND, "Expect ')' after foreach expression.");
        const body = this.statement();
        
        return {
            type: 'ForEachStatement',
            left,
            right,
            body
        };
    }

    private returnStatement(): ReturnStatement {
        const keyword = this.previous();
        let value: Expression | undefined = undefined;
        
        if (!this.check(TokenKind.SEMICOLON)) {
            value = this.expression();
        }
        
        return {
            type: 'ReturnStatement',
            argument: value
        };
    }

    private breakStatement(): BreakStatement {
        return {
            type: 'BreakStatement'
        };
    }

    private continueStatement(): ContinueStatement {
        return {
            type: 'ContinueStatement'
        };
    }

    private block(): BlockStatement {
        const statements: Statement[] = [];
        
        while (!this.check(TokenKind.RIGHT_CURLY) && !this.isAtEnd()) {
            statements.push(this.declaration() as Statement);
        }
        
        this.consume(TokenKind.RIGHT_CURLY, "Expect '}' after block.");
        
        return {
            type: 'BlockStatement',
            body: statements
        };
    }

    private expressionStatement(): ExpressionStatement {
        const expr = this.expression();
        return {
            type: 'ExpressionStatement',
            expression: expr
        };
    }

    private expression(): Expression {
        return this.assignment();
    }

    private assignment(): Expression {
        const expr = this.logicalOr();
        
        if (this.match(TokenKind.ASSIGN)) {
            const value = this.assignment();
            
            if (expr.type === 'Identifier') {
                return {
                    type: 'AssignmentExpression',
                    left: expr,
                    operator: '=',
                    right: value
                } as AssignmentExpression;
            } else if (expr.type === 'MemberExpression') {
                return {
                    type: 'AssignmentExpression',
                    left: expr,
                    operator: '=',
                    right: value
                } as AssignmentExpression;
            }
            
            throw new Error("Invalid assignment target.");
        }
        
        return expr;
    }

    private logicalOr(): Expression {
        let expr = this.logicalAnd();
        
        while (this.match(TokenKind.OR)) {
            const operator = this.previous().value;
            const right = this.logicalAnd();
            expr = {
                type: 'LogicalExpression',
                operator,
                left: expr,
                right
            } as LogicalExpression;
        }
        
        return expr;
    }

    private logicalAnd(): Expression {
        let expr = this.equality();
        
        while (this.match(TokenKind.AND)) {
            const operator = this.previous().value;
            const right = this.equality();
            expr = {
                type: 'LogicalExpression',
                operator,
                left: expr,
                right
            } as LogicalExpression;
        }
        
        return expr;
    }

    private equality(): Expression {
        let expr = this.comparison();
        
        while (this.match(TokenKind.EQUALS, TokenKind.NOT_EQUALS)) {
            const operator = this.previous().value;
            const right = this.comparison();
            expr = {
                type: 'BinaryExpression',
                operator,
                left: expr,
                right
            } as BinaryExpression;
        }
        
        return expr;
    }

    private comparison(): Expression {
        let expr = this.term();
        
        while (this.match(
            TokenKind.LESS,
            TokenKind.LESS_EQUALS,
            TokenKind.GREATER,
            TokenKind.GREATER_EQUALS
        )) {
            const operator = this.previous().value;
            const right = this.term();
            expr = {
                type: 'BinaryExpression',
                operator,
                left: expr,
                right
            } as BinaryExpression;
        }
        
        return expr;
    }

    private term(): Expression {
        let expr = this.factor();
        
        while (this.match(TokenKind.PLUS, TokenKind.MINUS)) {
            const operator = this.previous().value;
            const right = this.factor();
            expr = {
                type: 'BinaryExpression',
                operator,
                left: expr,
                right
            } as BinaryExpression;
        }
        
        return expr;
    }

    private factor(): Expression {
        let expr = this.unary();
        
        while (this.match(TokenKind.MULTIPLY, TokenKind.DIVIDE, TokenKind.MODULO)) {
            const operator = this.previous().value;
            const right = this.unary();
            expr = {
                type: 'BinaryExpression',
                operator,
                left: expr,
                right
            } as BinaryExpression;
        }
        
        return expr;
    }

    private unary(): Expression {
        if (this.match(TokenKind.MINUS, TokenKind.EXCLAMATION)) {
            const operator = this.previous().value;
            const right = this.unary();
            return {
                type: 'UnaryExpression',
                operator,
                argument: right
            } as UnaryExpression;
        }
        
        return this.call();
    }

    private call(): Expression {
        let expr = this.primary();
        
        while (true) {
            if (this.match(TokenKind.LEFT_ROUND)) {
                expr = this.finishCall(expr);
            } else if (this.match(TokenKind.DOT)) {
                const name = this.consume(TokenKind.IDENTIFIER, "Expect property name after '.'.").value;
                expr = {
                    type: 'MemberExpression',
                    object: expr,
                    property: {
                        type: 'Identifier',
                        name
                    },
                    computed: false
                } as MemberExpression;
            } else if (this.match(TokenKind.LEFT_BRACKET)) {
                const property = this.expression();
                this.consume(TokenKind.RIGHT_BRACKET, "Expect ']' after property access.");
                expr = {
                    type: 'MemberExpression',
                    object: expr,
                    property,
                    computed: true
                } as MemberExpression;
            } else {
                break;
            }
        }
        
        return expr;
    }

    private finishCall(callee: Expression): CallExpression {
        const args: Expression[] = [];
        
        if (!this.check(TokenKind.RIGHT_ROUND)) {
            do {
                args.push(this.expression());
            } while (this.match(TokenKind.COMMA));
        }
        
        this.consume(TokenKind.RIGHT_ROUND, "Expect ')' after arguments.");
        
        return {
            type: 'CallExpression',
            callee,
            arguments: args
        } as CallExpression;
    }

    private primary(): Expression {
        if (this.match(TokenKind.FALSE)) return { type: 'BooleanLiteral', value: false } as BooleanLiteral;
        if (this.match(TokenKind.TRUE)) return { type: 'BooleanLiteral', value: true } as BooleanLiteral;
        if (this.match(TokenKind.NULL)) return { type: 'NullLiteral', value: null } as NullLiteral;
        
        if (this.match(TokenKind.INTEGER)) {
            return {
                type: 'NumericLiteral',
                value: parseInt(this.previous().value)
            } as NumericLiteral;
        }
        
        if (this.match(TokenKind.FLOAT)) {
            return {
                type: 'NumericLiteral',
                value: parseFloat(this.previous().value)
            } as NumericLiteral;
        }
        
        if (this.match(TokenKind.STRING)) {
            return {
                type: 'StringLiteral',
                value: this.previous().value
            } as StringLiteral;
        }
        
        if (this.match(TokenKind.IDENTIFIER)) {
            return {
                type: 'Identifier',
                name: this.previous().value
            } as Identifier;
        }
        
        if (this.match(TokenKind.LEFT_ROUND)) {
            const expr = this.expression();
            this.consume(TokenKind.RIGHT_ROUND, "Expect ')' after expression.");
            return expr;
        }
        
        throw new Error("Expect expression.");
    }

    private synchronize(): void {
        this.advance();
        
        while (!this.isAtEnd()) {
            if (this.previous().kind === TokenKind.SEMICOLON) return;
            
            switch (this.peek().kind) {
                case TokenKind.FUNCTION:
                case TokenKind.LOCAL:
                case TokenKind.FOR:
                case TokenKind.IF:
                case TokenKind.WHILE:
                case TokenKind.RETURN:
                    return;
            }
            
            this.advance();
        }
    }
} 