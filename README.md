# TF2 VScript Support #

## Features

### Syntax Highlighting

Mostly complete syntax highlighting, the name colours for constants, functions, classes will not be always consistent (between the declaration and actual usage) since this extension doesn't use semantic highlighting.

Includes highlighting for built-in classes, constants, variables etc.

![](https://raw.githubusercontent.com/ocet247/tf2-vscript-support/main/images/syntax.gif)

### Completion Items Providing

### Shortcuts for full constants / methods path

If you try to complete a constant / global instance method like `SetPropInt` with a dot to the left, it'll autocomplete the full path  required to receive the completion item.

### Hover Providing

### Signature Help Providing

### Diagnostics Providing

Provides basic diagnostics in 2 ways:
* Compiles your script and takes the squirrel compiler error message
* Checks for the number of provided arguments to the global functions / methods

## Credits

* (S)quirrel for some parts of the syntax and initial inspiration <https://github.com/mepsoid/vscode-s-quirrel>
* Valve Development Community for TF2 Vscript Documentation <https://developer.valvesoftware.com/wiki/VScript>