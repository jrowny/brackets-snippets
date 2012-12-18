**WARNING!** The current master does not work with Brackets Sprint 17 and below, either use Brackets on Master or download the B13-B17 tag https://github.com/jrowny/brackets-snippets/tags

brackets-snippets
=================

A brackets snippets extension. To install, place the extension in your extensions folder. Find your extensions folder by going to "Help -> Show Extensions Folder"

Usage
=====
**Ctrl-Shift-S** shows you what snippets are available

type a trigger followed by parameters, hit **Ctrl-Alt-V** to insert the snippet. (Cmd-Alt-V) on Mac. 

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

If you omit parameters, an inline form will appear. 

Adding Snippets
===============
You can create new JSON files in the ```data``` directory or you can edit the existing ```javascript.json``` file. 
