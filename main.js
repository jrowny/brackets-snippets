/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, window */

define(function (require, exports, module) {
    'use strict';
    
    var Commands                = brackets.getModule("command/Commands"),
        CommandManager          = brackets.getModule("command/CommandManager"),
        EditorManager           = brackets.getModule("editor/EditorManager"),
        NativeFileSystem        = brackets.getModule("file/NativeFileSystem").NativeFileSystem,
        KeyBindingManager       = brackets.getModule("command/KeyBindingManager"),
        KeyMap                  = brackets.getModule("command/KeyMap"),
        FileUtils               = brackets.getModule("file/FileUtils");
        
    //Snippets array
    var snippets = [];
    function _handleHideSnippets() {
        var $snippets = $("#snippets");
        
        if ($snippets.css("display") === "none") {
            $snippets.show();
            $("#menu-view-hide-snippets span").first().text("Hide Snippets");
        } else {
            $snippets.hide();
            $("#menu-view-hide-snippets span").first().text("Show Snippets");
        }
        EditorManager.resizeEditor();
    }
    
    function _handleSnippet() {
        var editor = EditorManager.getCurrentFullEditor();
        var pos = editor.getCursorPos();
        var line = editor.getLineText(pos.line);
        var props = $.trim(line).split(" ");
               
        if (props.length) {
            //try to find the snippet, given the trigger text
            var i;
            for (i = 0; i < snippets.length; i++) {
                if (snippets[i].trigger === props[0]) {
                    var output = snippets[i].template;
                    //find variables
                    var tmp = snippets[i].template.match(/\$\$\{[0-9A-Z_a-z]{1,32}\}/g);
                     //remove duplicate variables
                    var snippetVariables = [];
                    var j;
                    for (j = 0; j < tmp.length; j++) {
                        if ($.inArray(tmp[j], snippetVariables) === -1) {
                            snippetVariables.push(tmp[j]);
                        }
                    }
                    //if the same number of variables
                    if (props.length - 1 >= snippetVariables.length) {
                        var x;
                        for (x = 0; x < snippetVariables.length; x++) {
                            //even my escapes have escapes
                            var re = new RegExp(snippetVariables[x].replace('$${', '\\$\\$\\{').replace('}', '\\}'), 'g');
                            output = output.replace(re, props[x + 1]);
                        }
                        editor._codeMirror.setLine(pos.line, output);
                        var s;
                        for (s = 0; s < output.split("\n").length; s++) {
                            editor._codeMirror.indentLine(pos.line + s);
                        }
                    } else {
                        console.log("Opps, this doesn't work yet :(");
                    }
                    break;
                }
            }
        }
    }
    
    //shows the snippets table
    function showSnippets() {
        var $snippetsTable = $("<table class='zebra-striped condensed-table'>").append("<tbody>");
        $("<tr><th>Name</th><th>Description</th><th>Trigger</th></tr>").appendTo($snippetsTable);
        
        snippets.forEach(function (item) {
            var makeCell = function (content) {
                return $("<td/>").html(content);
            };
            var $row = $("<tr/>")
                        .append(makeCell(item.name))
                        .append(makeCell(item.description))
                        .append(makeCell(item.trigger))
                        .appendTo($snippetsTable);
        });
        
        $("#snippets .table-container")
            .empty()
            .append($snippetsTable);
    }
    
    //parse a JSON file with a snippet in it
    function loadSnippet(fullPath) {
        var fileEntry = new NativeFileSystem.FileEntry(fullPath);
        FileUtils.readAsText(fileEntry)
            .done(function (text, readTimestamp) {
                try {
                    //TODO: a better check for valid snippets
                    snippets = snippets.concat(JSON.parse(text));
                } catch (e) {
                    console.log("Can't parse snippets from " + fullPath);
                }
            })
            .fail(function (error) {
                FileUtils.showFileOpenError(error.code, fullPath);
            });
    }
    
    
    
    exports.SNIPPET_EXECUTE = "snippets.execute";
    exports.VIEW_HIDE_SNIPPETS = "snippets.hideSnippets";
    
    function init() {
        //add the HTML
        $('#main-toolbar .nav li:nth-child(3) ul.dropdown-menu').append('<li><a href="#" id="menu-view-hide-snippets"><span>Show Snippets</span></a></li>');
        $('.content').append('<div id="snippets"/>');
        $('#snippets').append('<div class="toolbar simpleToolbarLayout"/>');
        $('#snippets .toolbar').append('<div class="title">Snippets</div><a href="#" class="close">&times;</a>');
        $('#snippets').append('<div class="table-container"/>');
        $('#snippets').hide();
        //add the keybinding
        var currentKeyMap = KeyBindingManager.getKeymap(),
            key = "",
            newMap = [],
            newKey = {};
        
        currentKeyMap['Ctrl-Alt-S'] = exports.SNIPPET_EXECUTE;
        currentKeyMap['Ctrl-Shift-S'] = exports.VIEW_HIDE_SNIPPETS;
        
        for (key in currentKeyMap) {
            if (currentKeyMap.hasOwnProperty(key)) {
                newKey = {};
                newKey[key] = currentKeyMap[key];
                newMap.push(newKey);
            }
        }
        var _newGlobalKeymap = KeyMap.create({
                "bindings": newMap,
                "platform": brackets.platform
            });
        KeyBindingManager.installKeymap(_newGlobalKeymap);
        
        $('#snippets .close').click(function () {
            CommandManager.execute(exports.VIEW_HIDE_SNIPPETS);
        });
        
        var directory = FileUtils.getNativeBracketsDirectoryPath() + "/extensions/user/snippets/data";
        NativeFileSystem.requestNativeFileSystem(directory,
            function (rootEntry) {
                rootEntry.createReader().readEntries(
                    function (entries) {
                        var i;
                        for (i = 0; i < entries.length; i++) {
                            loadSnippet(directory + "/" + entries[i].name);
                        }
                        showSnippets();
                    },
                    function (error) {
                        console.log("[Snippets] Error -- could not read snippets directory: " + directory);
                    }
                );
            },
            function (error) {
                console.log("[Snippets] Error -- could not open snippets directory: " + directory);
            });
    }
    
    init();
    
    CommandManager.register(exports.SNIPPET_EXECUTE, _handleSnippet);
    CommandManager.register(exports.VIEW_HIDE_SNIPPETS, _handleHideSnippets);
});