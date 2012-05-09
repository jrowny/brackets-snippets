/*
 * Copyright (c) 2012 Jonathan Rowny. All rights reserved.
 * http://www.jonathanrowny.com
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
    
    // Local modules
    var InlineSnippetForm       = require("InlineSnippetForm");

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
    
    function inlineSnippetFormProvider(hostEditor, props) {
        var result = new $.Deferred();

        var snippetForm = new InlineSnippetForm(props);
        snippetForm.load(hostEditor);
        
        result.resolve(snippetForm);
        
        return result.promise();
    }
    
    function _handleSnippet() {
        var editor = EditorManager.getCurrentFullEditor();
        var pos = editor.getCursorPos();
        var line = editor.getLineText(pos.line);
        var props = $.trim(line).split(" ");
        
        function completeInsert(editor, pos, output) {
            editor._codeMirror.setLine(pos.line, output);
            var s;
            for (s = 0; s < output.split("\n").length; s++) {
                editor._codeMirror.indentLine(pos.line + s);
            }
        }
        
        function startInsert(index, output) {
            //find variables
            var tmp = snippets[index].template.match(/\$\$\{[0-9A-Z_a-z]{1,32}\}/g);
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
                completeInsert(editor, pos, output);
            } else {
                var snippetPromise,
                    result = new $.Deferred();
                snippetPromise = inlineSnippetFormProvider(editor, snippetVariables);
                
                snippetPromise.done(function (inlineWidget) {
                    editor.addInlineWidget(pos, inlineWidget);
                    inlineWidget.$insert.click(function () {
                        var z;
                        for (z = 0; z < snippetVariables.length; z++) {
                            //even my escapes have escapes
                            var re = new RegExp(snippetVariables[z].replace('$${', '\\$\\$\\{').replace('}', '\\}'), 'g');
                            output = output.replace(re, inlineWidget.$form.find('.snipvar-' + snippetVariables[z].replace('$${', '').replace('}', '')).val());
                        }
                        
                        completeInsert(editor, pos, output);
                    });
                }).fail(function () {
                    result.reject();
                    console.log("Can't create inline snippet form");
                });
            }
        }
        
        if (props.length) {
            //try to find the snippet, given the trigger text
            var i;
            for (i = 0; i < snippets.length; i++) {
                var output = snippets[i].template;
                if (snippets[i].trigger === props[0]) {
                    startInsert(i, output);
                    break;
                }
            }
        }
    }
    
    //shows the snippets table
    function showSnippets() {
        var $snippetsTable = $("<table class='zebra-striped condensed-table'>").append("<tbody>");
        $("<tr><th>Name</th><th>Description</th><th>Trigger</th><th>Usage Example</th></tr>").appendTo($snippetsTable);
        
        snippets.forEach(function (item) {
            var makeCell = function (content) {
                return $("<td/>").html(content);
            };
            var $row = $("<tr/>")
                        .append(makeCell(item.name))
                        .append(makeCell(item.description))
                        .append(makeCell(item.trigger))
                        .append(makeCell(item.usage))
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
        //waiting on a menu API.. this doesn't work :(
        //$('#main-toolbar .nav li:nth-child(3) ul.dropdown-menu').append('<li><a href="#" id="menu-view-hide-snippets"><span>Show Snippets</span></a></li>');
        
        //add the HTML UI
        $('.content').append('<div id="snippets" class="bottom-panel"/>');
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
        
        var fullPath = FileUtils.getNativeBracketsDirectoryPath() + "/" + module.uri.replace('main.js', 'config.js');
        var fileEntry = new NativeFileSystem.FileEntry(fullPath);
        FileUtils.readAsText(fileEntry)
            .done(function (text, readTimestamp) {
                try {
                    try {
                        var config = JSON.parse(text);
                        var directory;
                        //Look for any marker of a non relative path
                        if (config.dataDirectory.indexOf("/") != -1 || config.dataDirectory.indexOf("\\") != -1) {
                            directory = config.dataDirectory;
                        } else {
                            directory = FileUtils.getNativeBracketsDirectoryPath() + "/" + module.uri.replace('main.js', '') + config.dataDirectory;
                        }
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

                    } catch (e) {
                        console.log("Can't parse config.js - " + e);
                    }
                } catch (e) {
                    console.log("Can't parse snippets from " + fullPath);
                }
            })
            .fail(function (error) {
                FileUtils.showFileOpenError(error.code, fullPath);
            });

    }
    
    init();
    
    CommandManager.register(exports.SNIPPET_EXECUTE, _handleSnippet);
    CommandManager.register(exports.VIEW_HIDE_SNIPPETS, _handleHideSnippets);
});