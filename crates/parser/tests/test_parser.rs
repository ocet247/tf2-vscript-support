#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use sq_3_parser::ast::*;
    use sq_3_parser::*;

    fn first_stmt(src: &str, error_count: usize) -> Stmt {
        let parse = Parse::new(src);
        assert!(
            parse.errors().len() == error_count,
            "unexpected parse errors for {:?}: {:?}",
            src,
            parse.errors()
        );
        let source_file = parse.source_file();
        assert_eq!(source_file.statements().count(), 1);
        source_file.statements().next().unwrap()
    }

    fn first_expr(src: &str, error_count: usize) -> Expr {
        let stmt = first_stmt(src, error_count);
        let Stmt::Expression(e) = stmt else {
            panic!(
                "expected ExpressionStatement, got {:?}",
                stmt.syntax().kind()
            )
        };
        e.expression().expect("no expression")
    }

    fn first_expr_inside_parentheses(src: &str, error_count: usize) -> Expr {
        let expr = first_expr(src, error_count);
        let Expr::Parenthesised(p) = expr else {
            panic!()
        };
        p.inner().unwrap()
    }

    #[test]
    fn source_file_empty() {
        let parse = Parse::new("");
        assert_eq!(parse.errors(), []);
        assert_eq!(parse.source_file().statements().count(), 0);
    }

    #[test]
    fn source_file_multiple_statements() {
        let parse = Parse::new("local a = 1\nlocal b = 2\nlocal c = 3");
        assert_eq!(parse.errors(), []);
        assert_eq!(parse.source_file().statements().count(), 3);
    }

    #[test]
    fn lossless_function_statement() {
        let src = "function add(a, b) { return a + b }";
        let node = Parse::new(src).into_syntax();
        assert_eq!(node.text().to_string(), src);
    }

    #[test]
    fn lossless_class_statement() {
        let src = "class Foo extends Bar { x = 1; function method() {} }";
        let node = Parse::new(src).into_syntax();
        assert_eq!(node.text().to_string(), src);
    }

    #[test]
    fn empty_statement() {
        let stmt = first_stmt(";", 0);
        assert!(matches!(stmt, Stmt::Empty(_)));
    }

    #[test]
    fn block_statement() {
        let stmt = first_stmt("{ local x = 1; local y = 2; }", 0);
        let Stmt::Block(b) = stmt else {
            panic!("expected block")
        };
        assert_eq!(b.statements().count(), 2);
    }

    #[test]
    fn if_statement_no_else() {
        let stmt = first_stmt("if (x) { return 1 }", 0);
        let Stmt::If(i) = stmt else {
            panic!("expected if")
        };
        assert!(i.condition().is_some());
        assert!(i.statement().is_some());
        assert!(i.else_branch().is_none());
    }

    #[test]
    fn if_statement_with_else() {
        let stmt = first_stmt("if (x) { return 1 } else { return 2 }", 0);
        let Stmt::If(i) = stmt else {
            panic!("expected if")
        };
        assert!(i.condition().is_some());
        assert!(i.statement().is_some());
        assert!(i.else_branch().is_some());
        assert!(i.else_branch().unwrap().statement().is_some());
    }

    #[test]
    fn if_statement_2() {
        let stmt = first_stmt("if (wow) { yessir }", 0);
        let Stmt::If(i) = stmt else {
            panic!("expected while")
        };
        assert!(matches!(i.statement(), Some(Stmt::Block(_))));
        assert!(matches!(i.condition(), Some(Expr::Name(_))));
        assert!(i.else_branch().is_none());
    }

    #[test]
    fn if_statement_3() {
        let stmt = first_stmt("if (wow) { yessir } else a++", 0);
        let Stmt::If(i) = stmt else {
            panic!("expected while")
        };
        assert!(matches!(i.statement(), Some(Stmt::Block(_))));
        assert!(matches!(i.condition(), Some(Expr::Name(_))));
        assert!(matches!(
            i.else_branch().unwrap().statement(),
            Some(Stmt::Expression(_))
        ));
    }

    #[test]
    fn while_statement() {
        let stmt = first_stmt("while (x > 0) { x-- }", 0);
        let Stmt::While(w) = stmt else {
            panic!("expected while")
        };
        assert!(w.condition().is_some());
        assert!(w.body().is_some());
    }

    #[test]
    fn while_statement_2() {
        let stmt = first_stmt("while (yes) { yessir }", 0);
        let Stmt::While(w) = stmt else {
            panic!("expected while")
        };
        assert!(matches!(w.body(), Some(Stmt::Block(_))));
        assert!(matches!(w.condition(), Some(Expr::Name(_))));
    }

    #[test]
    fn while_statement_3() {
        let stmt = first_stmt("while (]) {}", 1);
        let Stmt::While(w) = stmt else {
            panic!("expected while")
        };
        assert!(matches!(w.body(), Some(Stmt::Block(_))));
        assert!(w.condition().is_none());
    }

    #[test]
    fn do_while_statement() {
        let stmt = first_stmt("do { x++ } while (x < 10)", 0);
        let Stmt::DoWhile(d) = stmt else {
            panic!("expected do-while")
        };
        assert!(d.body().is_some());
        assert!(d.condition().is_some());
    }

    #[test]
    fn do_while_statement_2() {
        let stmt = first_stmt("do { smth } while (yes);", 0);
        let Stmt::DoWhile(w) = stmt else {
            panic!("expected do while")
        };
        assert!(matches!(w.body(), Some(Stmt::Block(_))));
        assert!(matches!(w.condition(), Some(Expr::Name(_))));
    }

    #[test]
    fn do_while_statement_3() {
        let stmt = first_stmt("do 123 while;", 1);
        let Stmt::DoWhile(w) = stmt else {
            panic!("expected do while")
        };
        assert!(matches!(w.body(), Some(Stmt::Expression(_))));
        assert!(w.condition().is_none());
    }

    #[test]
    fn for_statement() {
        let stmt = first_stmt("for (local i = 0; i < 10; i++) {}", 0);
        dbg!(&stmt);
        let Stmt::For(f) = stmt else {
            panic!("expected for")
        };
        assert!(f.initialiser().is_some());
        assert!(f.condition().is_some());
        assert!(f.increment().is_some());
        assert!(f.body().is_some());
    }

    #[test]
    fn for_statement_2() {
        let stmt = first_stmt("for (local a = 1; a != null; a++) {}", 0);
        let Stmt::For(f) = stmt else {
            panic!("expected for")
        };
        assert!(matches!(
            f.initialiser().unwrap().kind(),
            Some(ForInitialiserKind::LocalVariableDeclaration(_))
        ));
        assert!(matches!(
            f.condition().unwrap().expression(),
            Some(Expr::Binary(_))
        ));
        assert!(matches!(
            f.increment().unwrap().expression(),
            Some(Expr::PostfixUpdate(_))
        ));
        assert!(matches!(f.body(), Some(Stmt::Block(_))));
    }

    #[test]
    fn for_statement_3() {
        let stmt = first_stmt("for (;;);", 0);
        let Stmt::For(f) = stmt else {
            panic!("expected for")
        };
        assert!(f.initialiser().is_none());
        assert!(f.condition().is_none());
        assert!(f.increment().is_none());
        assert!(matches!(f.body(), Some(Stmt::Empty(_))));
    }

    #[test]
    fn for_statement_empty_parts() {
        // All three parts optional
        let stmt = first_stmt("for (;;) {}", 0);
        let Stmt::For(f) = stmt else {
            panic!("expected for")
        };

        assert!(f.initialiser().is_none());
        assert!(f.condition().is_none());
        assert!(f.increment().is_none());
    }

    #[test]
    fn foreach_value_only() {
        let stmt = first_stmt("foreach (v in arr) {}", 0);
        let Stmt::ForEach(fe) = stmt else {
            panic!("expected foreach")
        };
        assert!(fe.key().is_none());
        assert!(fe.value().is_some());
        assert!(fe.iterable().is_some());
        assert!(fe.body().is_some());
    }

    #[test]
    fn foreach_key_and_value() {
        let stmt = first_stmt("foreach (k, v in table) {}", 0);
        let Stmt::ForEach(fe) = stmt else {
            panic!("expected foreach")
        };
        assert!(fe.key().is_some());
        assert!(fe.value().is_some());
        assert!(fe.iterable().is_some());
    }

    #[test]
    fn switch_statement() {
        let stmt = first_stmt(
            "switch (x) { case 1: break; case 2: break; default: return 0 }",
            0,
        );
        let Stmt::Switch(s) = stmt else {
            panic!("expected switch")
        };
        assert!(s.discriminant().is_some());
        assert_eq!(s.clauses().count(), 3);
    }

    #[test]
    fn switch_case_bodies() {
        let stmt = first_stmt("switch (x) { case 1: a(); b(); break; }", 0);
        let Stmt::Switch(s) = stmt else { panic!() };
        let Some(SwitchClause::Case(case)) = s.clauses().next() else {
            panic!()
        };
        assert!(case.test().is_some());
        assert_eq!(case.body().count(), 3); // a(); b(); break;
    }

    #[test]
    fn switch() {
        let stmt = first_stmt(
            "switch (a) {case abc: wow++; continue; case \"12\": break; default: return no }",
            0,
        );
        let Stmt::Switch(s) = stmt else {
            panic!("expected switch")
        };
        assert!(matches!(s.discriminant(), Some(Expr::Name(_))));
        assert_eq!(s.clauses().count(), 3);
        let mut clauses = s.clauses();

        let SwitchClause::Case(case) = clauses.next().unwrap() else {
            panic!("expected case")
        };

        assert!(matches!(case.test().unwrap(), Expr::Name(_)));
        assert_eq!(case.body().count(), 2);
        let mut body = case.body();
        assert!(matches!(body.next().unwrap(), Stmt::Expression(_)));
        assert!(matches!(body.next().unwrap(), Stmt::Continue(_)));

        let SwitchClause::Case(case) = clauses.next().unwrap() else {
            panic!("expected case")
        };
        assert!(matches!(case.test().unwrap(), Expr::Literal(_)));
        assert_eq!(case.body().count(), 1);
        assert!(matches!(case.body().next().unwrap(), Stmt::Break(_)));

        let SwitchClause::Default(default) = clauses.next().unwrap() else {
            panic!("expected default")
        };
        assert_eq!(default.body().count(), 1);
        assert!(matches!(default.body().next().unwrap(), Stmt::Return(_)));
    }

    #[test]
    fn const_statement() {
        let stmt = first_stmt("const MAX = 100", 0);
        let Stmt::Const(c) = stmt else {
            panic!("expected const")
        };
        assert_eq!(c.name().unwrap().identifier().unwrap().text(), "MAX");
        assert_eq!(
            c.value().unwrap().expression().unwrap().syntax().text(),
            "100"
        );
    }

    #[test]
    fn local_variable_single() {
        let stmt = first_stmt("local x = 42", 0);
        let Stmt::LocalVariable(lv) = stmt else {
            panic!("expected local var")
        };
        let decls: Vec<_> = lv.declarations().collect();
        assert_eq!(decls.len(), 1);
        assert_eq!(decls[0].name().unwrap().identifier().unwrap().text(), "x");
        assert!(decls[0].initialiser().is_some());
    }

    #[test]
    fn local_variable_multiple() {
        let stmt = first_stmt("local a = 1, b = 2, c", 0);
        let Stmt::LocalVariable(lv) = stmt else {
            panic!()
        };
        assert_eq!(lv.declarations().count(), 3);
    }

    #[test]
    fn local_variable_no_init() {
        let stmt = first_stmt("local x", 0);
        let Stmt::LocalVariable(lv) = stmt else {
            panic!()
        };
        let decl = lv.declarations().next().unwrap();
        assert!(decl.initialiser().is_none());
    }

    #[test]
    fn local_function_declaration() {
        let stmt = first_stmt("local function greet(name) { return name }", 0);
        let Stmt::LocalFunction(lf) = stmt else {
            panic!("expected local function")
        };
        assert_eq!(lf.name().unwrap().identifier().unwrap().text(), "greet");
        assert_eq!(lf.parameter_list().unwrap().parameters().count(), 1);
        assert!(lf.body().is_some());
    }

    #[test]
    fn return_statement_with_value() {
        let stmt = first_stmt("function f() { return 42 }", 0);
        let Stmt::Function(f) = stmt else { panic!() };
        let FunctionBody::Stmt(Stmt::Block(body)) = f.body().unwrap() else {
            panic!()
        };
        let Stmt::Return(r) = body.statements().next().unwrap() else {
            panic!()
        };
        assert!(r.value().is_some());
    }

    #[test]
    fn return_statement_empty() {
        let stmt = first_stmt("function f() { return }", 0);
        let Stmt::Function(f) = stmt else { panic!() };
        let FunctionBody::Stmt(Stmt::Block(body)) = f.body().unwrap() else {
            panic!()
        };
        let Stmt::Return(r) = body.statements().next().unwrap() else {
            panic!()
        };
        assert!(r.value().is_none());
    }

    #[test]
    fn yield_statement() {
        let stmt = first_stmt("function f() { yield 1 }", 0);
        let Stmt::Function(f) = stmt else { panic!() };
        let FunctionBody::Stmt(Stmt::Block(body)) = f.body().unwrap() else {
            panic!()
        };
        let Stmt::Yield(y) = body.statements().next().unwrap() else {
            panic!()
        };
        assert!(y.value().is_some());
    }

    #[test]
    fn continue_statement() {
        let stmt = first_stmt("while (true) { continue }", 0);
        let Stmt::While(w) = stmt else { panic!() };
        let Stmt::Block(body) = w.body().unwrap() else {
            panic!()
        };
        assert!(matches!(
            body.statements().next().unwrap(),
            Stmt::Continue(_)
        ));
    }

    #[test]
    fn break_statement() {
        let stmt = first_stmt("while (true) { break }", 0);
        let Stmt::While(w) = stmt else { panic!() };
        let Stmt::Block(body) = w.body().unwrap() else {
            panic!()
        };
        assert!(matches!(body.statements().next().unwrap(), Stmt::Break(_)));
    }

    #[test]
    fn function_statement_simple() {
        let stmt = first_stmt("function add(a, b) { return a + b }", 0);
        let Stmt::Function(f) = stmt else {
            panic!("expected function")
        };
        assert_eq!(f.parameter_list().unwrap().parameters().count(), 2);
        assert!(f.body().is_some());
    }

    #[test]
    fn function_statement_no_params() {
        let stmt = first_stmt("function noop() {}", 0);
        let Stmt::Function(f) = stmt else { panic!() };
        assert_eq!(f.parameter_list().unwrap().parameters().count(), 0);
    }

    #[test]
    fn function_statement_default_param() {
        let stmt = first_stmt("function greet(name = \"world\") {}", 0);
        let Stmt::Function(f) = stmt else { panic!() };
        let params: Vec<_> = f.parameter_list().unwrap().parameters().collect();
        assert_eq!(params.len(), 1);
        let param = match params.first().unwrap() {
            Parameter::Variable(v) => v,
            Parameter::Ellipsis(_) => panic!(),
        };
        assert!(param.initialiser().is_some());
    }

    #[test]
    fn function_statement_qualified_name() {
        let stmt = first_stmt("function a::b::c() {}", 0);
        let Stmt::Function(f) = stmt else { panic!() };
        let Some(qn) = f.name() else {
            panic!("expected qualified name")
        };
        assert_eq!(qn.parts().count(), 2);
        assert!(qn.name().is_some());
    }

    #[test]
    fn function_statement_qualified_name_no_final() {
        let stmt = first_stmt("function a::() {}", 1);
        let Stmt::Function(f) = stmt else { panic!() };
        let Some(qn) = f.name() else {
            panic!("expected qualified name")
        };
        assert_eq!(qn.parts().count(), 1);
        assert!(qn.name().is_none());
    }

    #[test]
    fn class_statement_basic() {
        let stmt = first_stmt("class Foo { x = 1; function method() {} }", 0);
        let Stmt::Class(c) = stmt else {
            panic!("expected class")
        };
        assert!(c.extends().is_none());
        assert_eq!(c.members().count(), 2);
    }

    #[test]
    fn class_statement_extends() {
        let stmt = first_stmt("class Foo extends Bar {}", 0);
        let Stmt::Class(c) = stmt else { panic!() };
        assert!(c.extends().is_some());
    }

    #[test]
    fn class_statement_with_constructor() {
        let stmt = first_stmt("class Foo { constructor(x) { this.x = x } }", 0);
        let Stmt::Class(c) = stmt else { panic!() };
        let members: Vec<_> = c.members().collect();
        assert_eq!(members.len(), 1);
        assert!(matches!(members[0], Member::Constructor(_)));
    }

    #[test]
    fn class_statement_method() {
        let stmt = first_stmt("class Foo { function bar(a, b) {} }", 0);
        let Stmt::Class(c) = stmt else { panic!() };
        let Member::Method(m) = c.members().next().unwrap() else {
            panic!()
        };
        assert_eq!(m.name().unwrap().identifier().unwrap().text(), "bar");
        assert_eq!(m.parameter_list().unwrap().parameters().count(), 2);
    }

    #[test]
    fn enum_statement() {
        let stmt = first_stmt("enum Color { Red, Green, Blue = 5 }", 0);
        dbg!(&stmt);
        let Stmt::Enum(e) = stmt else {
            panic!("expected enum")
        };
        assert_eq!(e.name().unwrap().identifier().unwrap().text(), "Color");
        assert_eq!(e.members().count(), 3);
    }

    #[test]
    fn try_catch_statement() {
        let stmt = first_stmt("try { risky() } catch (e) { log(e) }", 0);
        let Stmt::Try(t) = stmt else {
            panic!("expected try")
        };
        assert!(t.body().is_some());
        let catch = t.catch_clause().unwrap();
        assert!(catch.binding().is_some());
        assert!(catch.body().is_some());
    }

    #[test]
    fn throw_statement() {
        let stmt = first_stmt("throw \"oops\"", 0);
        let Stmt::Throw(t) = stmt else {
            panic!("expected throw")
        };
        assert!(t.value().is_some());
    }

    #[test]
    fn expression_statement() {
        let stmt = first_stmt("foo()", 0);
        let Stmt::Expression(e) = stmt else {
            panic!("expected expression statement")
        };
        assert!(e.expression().is_some());
    }

    #[test]
    fn literal_integer() {
        let expr = first_expr("42", 0);
        let Expr::Literal(lit) = expr else {
            panic!("expected literal")
        };
        assert_eq!(lit.token().unwrap().1.text(), "42");
    }

    #[test]
    fn literal_float() {
        let expr = first_expr("3.14", 0);
        let Expr::Literal(lit) = expr else { panic!() };
        assert_eq!(lit.token().unwrap().1.text(), "3.14");
    }

    #[test]
    fn literal_string() {
        let expr = first_expr("\"hello\"", 0);
        let Expr::Literal(lit) = expr else { panic!() };
        assert_eq!(lit.token().unwrap().1.text(), "\"hello\"");
    }

    #[test]
    fn literal_true() {
        let expr = first_expr("true", 0);
        assert!(matches!(expr, Expr::Literal(_)));
    }

    #[test]
    fn literal_null() {
        let expr = first_expr("null", 0);
        assert!(matches!(expr, Expr::Literal(_)));
    }

    #[test]
    fn name_expression() {
        let expr = first_expr("myVar", 0);
        let Expr::Name(n) = expr else {
            panic!("expected name")
        };
        assert_eq!(n.identifier().unwrap().text(), "myVar");
    }

    #[test]
    fn binary_addition() {
        let expr = first_expr("1 + 2", 0);
        let Expr::Binary(b) = expr else {
            panic!("expected binary")
        };
        assert!(b.lhs().is_some());
        assert!(b.operator().is_some());
        assert!(b.rhs().is_some());
    }

    #[test]
    fn binary_operator_text() {
        let expr = first_expr("a == b", 0);
        let Expr::Binary(b) = expr else { panic!() };
        assert_eq!(b.operator().unwrap().0, BinaryOperator::Equals);
    }

    #[test]
    fn binary_precedence() {
        // 1 + 2 * 3 should parse as 1 + (2 * 3), so the root is '+'
        let expr = first_expr("1 + 2 * 3", 0);
        let Expr::Binary(b) = expr else { panic!() };
        assert_eq!(b.operator().unwrap().0, BinaryOperator::Add);
        // rhs should be the multiplication
        let Expr::Binary(rhs) = b.rhs().unwrap() else {
            panic!()
        };
        assert_eq!(rhs.operator().unwrap().0, BinaryOperator::Multiply);
    }

    #[test]
    fn conditional_expression() {
        let expr = first_expr("a ? b : c", 0);
        let Expr::Conditional(c) = expr else {
            panic!("expected conditional")
        };
        assert!(c.condition().is_some());
        assert!(c.then_branch().is_some());
        assert!(c.else_branch().is_some());
    }

    #[test]
    fn prefix_unary_minus() {
        let expr = first_expr("-x", 0);
        let Expr::PrefixUnary(u) = expr else {
            panic!("expected prefix unary")
        };
        assert_eq!(u.operator().unwrap().0, PrefixUnaryOperator::Negation);
        assert!(u.operand().is_some());
    }

    #[test]
    fn prefix_unary_not() {
        let expr = first_expr("!flag", 0);
        let Expr::PrefixUnary(u) = expr else { panic!() };
        assert_eq!(u.operator().unwrap().0, PrefixUnaryOperator::LogicalNot);
    }

    #[test]
    fn prefix_update_increment() {
        let expr = first_expr("++i", 0);
        let Expr::PrefixUpdate(u) = expr else {
            panic!("expected prefix update")
        };
        assert_eq!(u.operator().unwrap().0, PrefixUpdateOperator::Increment);
        assert!(u.operand().is_some());
    }

    #[test]
    fn postfix_update_decrement() {
        let expr = first_expr("i--", 0);
        let Expr::PostfixUpdate(u) = expr else {
            panic!("expected postfix update")
        };
        assert!(u.operand().is_some());
        assert_eq!(u.operator().unwrap().0, PostfixUpdateOperator::Decrement);
    }

    #[test]
    fn delete_expression() {
        let expr = first_expr("delete obj.key", 0);
        let Expr::Delete(d) = expr else {
            panic!("expected delete")
        };
        assert!(d.operand().is_some());
    }

    #[test]
    fn typeof_expression() {
        let expr = first_expr("typeof x", 0);
        let Expr::TypeOf(t) = expr else {
            panic!("expected typeof")
        };
        assert!(t.operand().is_some());
    }

    #[test]
    fn clone_expression() {
        let expr = first_expr("clone obj", 0);
        let Expr::Clone(c) = expr else {
            panic!("expected clone")
        };
        assert!(c.operand().is_some());
    }

    #[test]
    fn resume_expression() {
        let expr = first_expr("resume coro", 0);
        let Expr::Resume(r) = expr else {
            panic!("expected resume")
        };
        assert!(r.operand().is_some());
    }

    #[test]
    fn member_access_expression() {
        let expr = first_expr("obj.field", 0);
        let Expr::MemberAccess(m) = expr else {
            panic!("expected member access")
        };
        assert!(m.object().is_some());
        assert_eq!(
            m.member_part()
                .unwrap()
                .name()
                .unwrap()
                .identifier()
                .unwrap()
                .text(),
            "field"
        );
    }

    #[test]
    fn chained_member_access() {
        let expr = first_expr("a.b.c", 0);
        let Expr::MemberAccess(outer) = expr else {
            panic!()
        };
        assert_eq!(
            outer
                .member_part()
                .unwrap()
                .name()
                .unwrap()
                .identifier()
                .unwrap()
                .text(),
            "c"
        );
        let Expr::MemberAccess(inner) = outer.object().unwrap() else {
            panic!()
        };
        assert_eq!(
            inner
                .member_part()
                .unwrap()
                .name()
                .unwrap()
                .identifier()
                .unwrap()
                .text(),
            "b"
        );
    }

    #[test]
    fn element_access_expression() {
        let expr = first_expr("arr[0]", 0);
        let Expr::ElementAccess(e) = expr else {
            panic!("expected element access")
        };
        assert!(e.object().is_some());
        assert!(e.index().is_some());
    }

    #[test]
    fn call_expression_no_args() {
        let expr = first_expr("foo()", 0);
        let Expr::Call(c) = expr else {
            panic!("expected call")
        };
        assert!(c.callee().is_some());
        assert_eq!(c.arguments().count(), 0);
    }

    #[test]
    fn call_expression_with_args() {
        let expr = first_expr("foo(1, 2, 3)", 0);
        let Expr::Call(c) = expr else { panic!() };
        assert_eq!(c.arguments().count(), 3);
    }

    #[test]
    fn call_expression_chained() {
        let expr = first_expr("a.b()", 0);
        let Expr::Call(c) = expr else { panic!() };
        assert!(matches!(
            c.callee().unwrap().expression().unwrap(),
            Expr::MemberAccess(_)
        ));
    }

    #[test]
    fn root_access_expression() {
        let expr = first_expr("::globalVar", 0);
        let Expr::RootAccess(r) = expr else {
            panic!("expected root access")
        };
        assert_eq!(r.name().unwrap().identifier().unwrap().text(), "globalVar");
    }

    #[test]
    fn this_expression() {
        let expr = first_expr("this", 0);
        assert!(matches!(expr, Expr::This(_)));
    }

    #[test]
    fn base_expression() {
        let expr = first_expr("base", 0);
        assert!(matches!(expr, Expr::Base(_)));
    }

    #[test]
    fn parenthesised_expression() {
        let expr = first_expr("(1 + 2)", 0);
        let Expr::Parenthesised(p) = expr else {
            panic!("expected parenthesised")
        };
        assert!(matches!(p.inner().unwrap(), Expr::Binary(_)));
    }

    #[test]
    fn array_literal_empty() {
        let expr = first_expr("[]", 0);
        let Expr::ArrayLiteral(a) = expr else {
            panic!("expected array literal")
        };
        assert_eq!(a.elements().count(), 0);
    }

    #[test]
    fn array_literal_with_elements() {
        let expr = first_expr("[1, 2, 3]", 0);
        let Expr::ArrayLiteral(a) = expr else {
            panic!()
        };
        assert_eq!(a.elements().count(), 3);
    }

    #[test]
    fn table_literal_empty() {
        let expr = first_expr_inside_parentheses("({})", 0);
        let Expr::TableLiteral(t) = expr else {
            panic!()
        };
        assert_eq!(t.members().count(), 0);
    }

    #[test]
    fn table_literal_with_members() {
        let expr = first_expr_inside_parentheses("({ x = 1, y = 2 })", 0);
        let Expr::TableLiteral(t) = expr else {
            panic!()
        };
        assert_eq!(t.members().count(), 2);
    }

    #[test]
    fn table_literal_string_key() {
        let expr = first_expr_inside_parentheses("({ \"key\" : 42 })", 0);
        let Expr::TableLiteral(t) = expr else {
            panic!()
        };
        let member = t.members().next().unwrap();
        let Member::Property(prop) = member else {
            panic!()
        };
        assert!(matches!(prop.name().unwrap(), MemberName::String(_)));
    }

    #[test]
    fn table_literal_computed_key() {
        let expr = first_expr_inside_parentheses("({ [expr] = 1 })", 0);
        let Expr::TableLiteral(t) = expr else {
            panic!()
        };
        let member = t.members().next().unwrap();
        let Member::Property(prop) = member else {
            panic!()
        };
        assert!(matches!(prop.name().unwrap(), MemberName::Computed(_)));
    }

    #[test]
    fn function_expression() {
        let expr = first_expr_inside_parentheses("(function(a, b) { return a + b })", 0);
        let Expr::Function(f) = expr else {
            panic!("expected function expression")
        };
        assert_eq!(f.parameter_list().unwrap().parameters().count(), 2);
        assert!(f.body().is_some());
    }

    #[test]
    fn function_expression_with_environment() {
        let expr = first_expr_inside_parentheses("(function[env](a) {})", 0);
        let Expr::Function(f) = expr else { panic!() };
        assert!(f.environment().is_some());
    }

    #[test]
    fn lambda_expression() {
        let expr = first_expr("@(x) x * 2", 0);
        let Expr::Lambda(l) = expr else {
            panic!("expected lambda")
        };
        assert_eq!(l.parameter_list().unwrap().parameters().count(), 1);
        assert!(l.body().is_some());
    }

    #[test]
    fn lambda_no_params() {
        let expr = first_expr("@() 42", 0);
        let Expr::Lambda(l) = expr else { panic!() };
        assert_eq!(l.parameter_list().unwrap().parameters().count(), 0);
    }

    #[test]
    fn class_expression() {
        let expr = first_expr_inside_parentheses("(class extends Base { x = 1 })", 0);
        let Expr::Class(c) = expr else {
            panic!("expected class expression")
        };
        assert!(c.extends().is_some());
        assert_eq!(c.members().count(), 1);
    }

    #[test]
    fn assignment_expression() {
        let expr = first_expr("x = 42", 0);
        let Expr::Binary(b) = expr else {
            panic!("expected binary (assignment)")
        };
        assert_eq!(b.operator().unwrap().0, BinaryOperator::Assign);
    }

    #[test]
    fn compound_assignment() {
        for op in [
            ("+=", BinaryOperator::AddAssign),
            ("-=", BinaryOperator::SubtractAssign),
            ("*=", BinaryOperator::MultiplyAssign),
            ("/=", BinaryOperator::DivideAssign),
            ("%=", BinaryOperator::ModuloAssign),
        ] {
            let expr = first_expr(&format!("x {} 1", op.0), 0);
            let Expr::Binary(b) = expr else {
                panic!("expected binary for {}", op.0)
            };

            assert_eq!(b.operator().unwrap().0, op.1);
        }
    }

    #[test]
    fn slot_creation_operator() {
        let expr = first_expr("obj <- 42", 0);
        let Expr::Binary(b) = expr else { panic!() };
        assert_eq!(b.operator().unwrap().0, BinaryOperator::NewSlot);
    }

    #[test]
    fn parameter_names() {
        let stmt = first_stmt("function f(alpha, beta, gamma) {}", 0);
        let Stmt::Function(f) = stmt else { panic!() };
        let names: Vec<_> = f
            .parameter_list()
            .unwrap()
            .parameters()
            .map(|p| match p {
                Parameter::Variable(v) => v.name().unwrap().identifier().unwrap().text().to_owned(),
                Parameter::Ellipsis(_) => panic!(),
            })
            .collect();
        assert_eq!(names, ["alpha", "beta", "gamma"]);
    }

    #[test]
    fn class_property_value() {
        let stmt = first_stmt("class Foo { hp = 100; }", 0);
        let Stmt::Class(c) = stmt else { panic!() };
        let Member::Property(p) = c.members().next().unwrap() else {
            panic!()
        };
        let MemberName::Identifier(name) = p.name().unwrap() else {
            panic!()
        };
        assert_eq!(name.name().unwrap().identifier().unwrap().text(), "hp");
        assert_eq!(p.value().unwrap().syntax().text(), "100");
        assert!(p.value().is_some());
    }

    #[test]
    fn class_constructor_params() {
        let stmt = first_stmt(
            "class Vec2 { constructor(x, y) { this.x = x; this.y = y } }",
            0,
        );
        let Stmt::Class(c) = stmt else { panic!() };
        let Member::Constructor(ctor) = c.members().next().unwrap() else {
            panic!()
        };
        assert_eq!(ctor.parameter_list().unwrap().parameters().count(), 2);
    }

    #[test]
    fn local_function_with_env() {
        let stmt = first_stmt("local function abc[123](abc = 2){}", 0);
        let Stmt::LocalFunction(lf) = stmt else {
            panic!("expected local function")
        };
        assert_eq!(lf.name().unwrap().identifier().unwrap().text(), "abc");
        let pl = lf.parameter_list().unwrap();
        assert!(lf.environment().is_some());
        assert_eq!(pl.parameters().count(), 1);
    }

    #[test]
    fn test_local_variable_doc() {
        let stmt = first_stmt("\n/**abc*/\nlocal a = 2;", 0);
        let Stmt::LocalVariable(lv) = stmt else {
            panic!("expected local variable");
        };

        assert!(lv.doc().is_some());
    }

    #[test]
    fn test_local_variable_no_doc() {
        let stmt = first_stmt("/**abc*/\n\nlocal a = 2;", 0);
        let Stmt::LocalVariable(lv) = stmt else {
            panic!("expected local variable");
        };

        assert!(lv.doc().is_none());
    }

    #[test]
    fn no_parse_errors_on_valid_snippets() {
        let snippets = [
            "local a = 1",
            "function f() {}",
            "class C {}",
            "foreach (k, v in t) {}",
            "try { f() } catch (e) {}",
            "switch (x) { case 1: break; default: break; }",
            "local a = [1, 2, 3]",
            "local t = { x = 1, \"y\" : 2 }",
            "@(x) x + 1",
            "a ? b : c",
            "::root",
            "++i",
            "delete obj.k",
            "typeof x",
            "clone t",
        ];
        for src in snippets {
            let errors = Parse::new(src).errors().to_vec();
            assert!(errors.is_empty(), "errors in {src:?}: {errors:?}");
        }
    }
}
