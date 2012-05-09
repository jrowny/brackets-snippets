brackets-snippets
=================

A brackets snippets extension. To install, place in ```brackets/src/extensions/user``` folder. 
When installed, ```main.js``` should be at ```brackets/src/extensions/user/brackets-snippets/main.js```

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

Adding Snippets
===============
You can create new JSON files in the ```data``` directory or you can edit the existing ```javascript.json``` file. 