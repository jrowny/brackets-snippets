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
        FileUtils               = brackets.getModule("file/FileUtils"),
        Menus                   = brackets.getModule("command/Menus");
    
    // Local modules
    var InlineSnippetForm       = require("InlineSnippetForm"),
        SnippetPresets          = require("SnippetPresets");

    //Snippets array
    var snippets = [];
    
    //commands
    var SNIPPET_EXECUTE = "snippets.execute",
        VIEW_HIDE_SNIPPETS = "snippets.hideSnippets";
    
    function _handleHideSnippets() {
        var $snippets = $("#snippets");
        
        if ($snippets.css("display") === "none") {
            $snippets.show();
            CommandManager.get(VIEW_HIDE_SNIPPETS).setName("Hide Snippets");
        } else {
            $snippets.hide();
            CommandManager.get(VIEW_HIDE_SNIPPETS).setName("Show Snippets");
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
        
    function _handleSnippet(props) {
        var editor = EditorManager.getCurrentFullEditor();
        var pos = editor.getCursorPos();
        var line = editor.getLineText(pos.line);
        if (!props) {
            props = $.trim(line).split(" ");
        }
        
        function completeInsert(editor, pos, output) {
            var s,
                cursorPos,
                lines = output.split("\n");

            for (s = 0; s < lines.length; s++) {
                if (lines[s].indexOf('!!{cursor}') >= 0) {
                    cursorPos = s;
                    lines[s] = lines[s].replace('!!{cursor}', '');
                }
                if (s !== lines.length - 1) {
                    lines[s] = lines[s] + "\n";
                }
                editor._codeMirror.setLine(pos.line, lines[s]);
                editor._codeMirror.indentLine(pos.line);
                pos.line++;
            }
            if (cursorPos) {
                editor._codeMirror.setCursor(pos.line - (lines.length - cursorPos), pos.ch);
            }
            EditorManager.focusEditor();
        }
        
        function startInsert(output) {
            //find variables
            var tmp = output.match(/\$\$\{[0-9A-Z_a-z]{1,32}\}/g);
             //remove duplicate variables
            var snippetVariables = [],
                j;
            
                        
            if (tmp && tmp.length > 0) {
                for (j = 0; j < tmp.length; j++) {
                    if ($.inArray(tmp[j], snippetVariables) === -1) {
                        snippetVariables.push(tmp[j]);
                    }
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
                    startInsert(SnippetPresets.execute(output));
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
                        .append(makeCell('<a href="#" class="insert-snippet" trigger="' + item.trigger + '">' + item.name + '</a>'))
                        .append(makeCell(item.description))
                        .append(makeCell(item.trigger))
                        .append(makeCell(item.usage))
                        .appendTo($snippetsTable);
        });
        
        $("#snippets .table-container")
            .empty()
            .append($snippetsTable);
        
        $('#snippets .insert-snippet').click(function () {
            CommandManager.execute(exports.SNIPPET_EXECUTE, [$(this).attr('trigger')]);
        });
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
    
  
		
    CommandManager.register("Run Snippet", SNIPPET_EXECUTE, _handleSnippet);
    CommandManager.register("Show Snippets", VIEW_HIDE_SNIPPETS, _handleHideSnippets);
    
    function init() {
        //add the HTML UI
        $('.content').append('  <div id="snippets" class="bottom-panel">'
                             + '  <div class="toolbar simple-toolbar-layout">'
                             + '    <div class="title">Snippets</div><a href="#" class="close">&times;</a>'
                             + '  </div>'
                             + '  <div class="table-container"/>'
                             + '</div>');
        $('#snippets').hide();
        
        //add the menu and keybinding for view/hide
        var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        menu.addMenuItem("menu-snippets-view", VIEW_HIDE_SNIPPETS, "Ctrl-Shift-S", Menus.AFTER, "menu-view-sidebar");
        
        //add the keybinding
        KeyBindingManager.addBinding(SNIPPET_EXECUTE, "Ctrl-Alt-S");
        
        $('#snippets .close').click(function () {
            CommandManager.execute(exports.VIEW_HIDE_SNIPPETS);
        });
        
        function test() {
            
        }
        
        //snippet module's directory
        var moduleDir = FileUtils.getNativeModuleDirectoryPath(module);
        var configFile = new NativeFileSystem.FileEntry(moduleDir + '/config.js');
        
        FileUtils.readAsText(configFile)
            .done(function (text, readTimestamp) {
                var config = {};
                
                //try to parse the config file
                try {
                    config = JSON.parse(text);
                } catch (e) {
                    console.log("Can't parse config.js - " + e);
                    config.dataDirectory = "data";
                }
                var directory = moduleDir + "/" + config.dataDirectory;
                
                //Look for any marker of a non relative path
                if (config.dataDirectory.indexOf("/") !== -1 || config.dataDirectory.indexOf("\\") !== -1) {
                    directory = config.dataDirectory;
                }
                
                //loop through the directory to load snippets
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
           
            })
            .fail(function (error) {
                FileUtils.showFileOpenError(error.code, configFile);
            });

    }
    
    init();
    
});