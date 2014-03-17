brackets-snippets
=================

Brackets Snippets extension.

Extension is available in the [Brackets extension registry](https://brackets-registry.aboutweb.com/).

To install, go to the Brackets Extension Manager and search for `brackets snippets`.

Usage
=====
**Ctrl-Shift-S** shows you what snippets are available. Click any snippet to begin inserting.<br>
**Ctrl-Alt-V** to insert the snippet. (Cmd-Alt-V on Mac).

type a trigger followed by parameters (optional), then hit Ctrl-Alt-V  

```f myFunc``` becomes 

```
function myFunc () {
}
```

```for x myArray```
becomes:
```
var x;
for (x = 0; x < myArray.length; x++) {

}
```

If you omit parameters, an inline form will appear. Use `ESC` to close the inline form or `ENTER` to complete the insertion.

![Example animation](https://raw.github.com/jrowny/brackets-snippets/master/docs/angularExample.gif)

Own snippets
============

It's recommended to copy data directory from extension to your own place and link to it through settings dialog.
You can edit the data directory inside the extension __but this will be overridden on every extension update__.

You can create new JSON files in the ```data``` directory or you can edit the existing ```javascript.json``` file.
Your JSON files can reference template files if they have a `.snippet` extension and are in the `data\snippets` directory. See html5.snippet for an example.

Snippets with keyboard shortcuts
================================

You can defined own shortcuts for immediate snippet execution on current cursor position like this:

```
{
    "name": "Sample inline script for console logging",
    "trigger": "log",
    "usage": "log x",
    "description": "Log a message into console",
    "template": "console.log($${message});!!{cursor}",
    "inline": true,
    "shortcut": "Alt-L"
}
```

And then simply use it while working on your code:

- using arguments on the line:

![Shortcut sample animation](https://raw.github.com/jrowny/brackets-snippets/master/docs/snippetShortcutArgs.gif)

- or using snippet widget:

![Shortcut sample animation 2](https://raw.github.com/jrowny/brackets-snippets/master/docs/snippetShortcutWidget.gif)
