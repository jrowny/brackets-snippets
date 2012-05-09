brackets-snippets
=================

A brackets snippets extension. To install, place in ```brackets/src/extensions/user``` folder.

Usage
=====
**Ctrl-Shift-S** shows you what snippets are available

type a trigger followed by parameters, hit **Ctrl-Alt-S** to insert the snipped. (Cmd-Alt-S) on Mac. 

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