# Changelog

## [3.3.0]
- Add function return type inlay hint
- Add folded constants, netprops etc. into the file by default due to its ubiquity
- Fix type annotations not working properly at the initial assignment
- Fix non-block functions working inproperly
- If the parantheses are already present in a function call don't insert new ones when user triggers a completion

## [3.2.7]
- Add document highlight
- Fix signature help not working properly with variable parameters

## [3.2.6]
- Drop all string literal warnings besides the script names and classnames
- Add missing `CBaseEntity` methods
- Allow assigning variables with class type to the children of that class

## [3.2.5]
- Fix injecting a single type into a explicit union type not working properly
- Fix float arithmetic operations outputing integer
- Evaluate constructor bodies that were not called before method bodies that were not called

## [3.2.4]
- Fix misleading arithmetic operator errors for union types
- Don't show type hint for obvious unary expressions

## [3.2.3]
- Improve stdlib documentation
- Don't show inlay hints for obvious constructor call
- Fix classes declared at the end of the file not being found in their method doc comment

## [3.2.2]
- Fix explicit type of 'any' not allowing setting the value to anything
- Fix wrong omitting condition for static class members

## [3.2.1]
- Replace every 'unknown' type with 'any' since they're used similarly
- Don't show single argument function parameter hints (unless they're bool or nullable)

## [3.2.0]
- Move to pull-based diagnostics (sadly losing syntax and semantic separation)
- Add some more configuration options
- Add workspace diagnostics
- Handle selection range
- Handle workspace symbol
- Inlay hints:
  - Reduce noise by skipping obvious type hints
  - Add parameter hints
  - Add enum member value hints

## [3.1.4]
- Resolve doc comment code blocks
- Remove unknown type from explicit function and class declarations
- Improve standard library documentation

## [3.1.3]
- Stop giving statement completions in an expression context
- Improve indexing into string
- Fix tags highlighting matching too early

## [3.1.2]
- Improve file handling
- Add detail and documentation for symbol completion items
- Fix script name completions not working on windows

## [3.1.1]
- Improve retrying mechanism
- Upload syntax and semantic diagnostics separately

## [3.1.0]
- Replace `@entity` and `@input` tag with `@var` tag (where you also get 'self', 'activator', 'caller' as variable name completions)
- Don't omit the shape of the type if type is specified explicitly in a generic form (so `/** @type {table} */ local a = { wow = 1}`
would actually show `wow` as a member)
- Fix requests not being retried after being cancelled
- Move file processing off the main thread causing unnecessary delays
- Clear diagnostics on close document notification

## [3.0.15]
- Fix CTFBaseBoss not having a superclass
- Make @hide tag properly work

## [3.0.14]
- Add item_* classname search inference
- (Bumping version because openvsx returned 502)

## [3.0.13]
- Infer the return type of functions that either create an entity with classname or search with it
- Split function statement recovery into method and non-method kinds

## [3.0.12]
- Improve statement parsing recovery

## [3.0.11]
- Fix 'didChangeWatchedFiles unknown notification' error

## [3.0.10]
- Remove description from auto generated doc comment
- Use string|unknown for key in foreach loop
- Improve markdown for enum/table/class
- Parallelise lsp requests
- Cache scripts directory blocking system call to improve import performance

## [3.0.9]
- Produce only a single warning on a block of unreachable statements
- Add client_convar string literal
- Lift convar/input wrong string literal warning

## [3.0.8]
- Fix parser producing wrong recovery by modifying incorrect variable
- Add document link provider for imports

## [3.0.7]
- Fix lambda expressions causing panics
- Add typed array support
- Add `@this` tag
- Add missing Vector2D/Vector4D metamethods

## [3.0.6]
- Fix invalid handling of new class properties, add @static tag
- Stop producing most of the errors when type is not explicitly stated

## [3.0.5]
- Fix array of tables not being parsed properly

## [3.0.4]
- Ease out type prediction to prevent a lot of false positives errors

## [3.0.3]
- Fix selecting tf2 root directory producing multiple files with the same path

## [3.0.2]
- Fix `script` completions not working properly on windows

## [3.0.1]
- Add `README.md` to the vsix

## [3.0.0]
- Initial release of fully featured language server
