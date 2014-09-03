brackets-snippets
=================

Brackets Snippets extension.

Extension is available in the [Brackets extension registry](https://brackets-registry.aboutweb.com/).

To install, go to the Brackets Extension Manager and search for `brackets snippets`.

Usage
=====
Icon on the right toolbar shows you what snippets are available. Click any snippet to begin inserting.<br>
**Ctrl-Alt-Space** to insert the snippet. (Cmd-Alt-Space on Mac).

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

Adding Snippets
===============
You can create new JSON files in the ```data``` directory or you can edit the existing ```javascript.json``` file. Your JSON files can reference template files if they have a `.snippet` extension and are in the `data\snippets` directory. See html5.snippet for an example.
