/*
 * Copyright (c) 2013 Jonathan Rowny. All rights reserved.
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
/*global define, brackets, $, Mustache */

define(function (require, exports, module) {

    var _                       = brackets.getModule("thirdparty/lodash"),
        AppInit                 = brackets.getModule("utils/AppInit"),
        Commands                = brackets.getModule("command/Commands"),
        CommandManager          = brackets.getModule("command/CommandManager"),
        EditorManager           = brackets.getModule("editor/EditorManager"),
        DocumentManager         = brackets.getModule("document/DocumentManager"),
        ExtensionUtils          = brackets.getModule("utils/ExtensionUtils"),
        FileSystem              = brackets.getModule("filesystem/FileSystem"),
        KeyBindingManager       = brackets.getModule("command/KeyBindingManager"),
        FileUtils               = brackets.getModule("file/FileUtils"),
        Menus                   = brackets.getModule("command/Menus"),
        PanelManager            = brackets.getModule("view/PanelManager");

    // Local modules
    var InlineSnippetForm = require("InlineSnippetForm"),
        Preferences       = require("src/Preferences"),
        SettingsDialog    = require("src/SettingsDialog"),
        SnippetPresets    = require("SnippetPresets"),
        panelHtml         = require("text!templates/bottom-panel.html"),
        snippetsHTML      = require("text!templates/snippets-table.html");
        
        //Snippets array
    var snippets = [],
        //directory where snippets are
        snippetsDirectory = Preferences.get("snippetsDirectory").replace(/\\/g, "/"),
        $snippetsPanel,
        $snippetsContent,
        panel;
        
    //commands
    var SNIPPET_EXECUTE = "snippets.execute",
        VIEW_HIDE_SNIPPETS = "snippets.hideSnippets";
    
    function _handleHideSnippets() {
        if (panel.isVisible()) {
            panel.hide();
            CommandManager.get(VIEW_HIDE_SNIPPETS).setChecked(false);
        } else {
            panel.show();
            CommandManager.get(VIEW_HIDE_SNIPPETS).setChecked(true);
        }
        EditorManager.resizeEditor();
    }
    
    function inlineSnippetFormProvider(hostEditor, props, snippet) {
        var result = new $.Deferred();

        var snippetForm = new InlineSnippetForm(props, snippet);
        snippetForm.load(hostEditor);
        result.resolve(snippetForm);
        
        return result.promise();
    }

    function _parseArgs(str) {
        str = str.trim();

        var result = [],
            current = "",
            inQuotes = false,
            quotes = ['"', "'"];

        for (var i = 0, l = str.length; i < l; i++) {
            if (str[i] === " " && inQuotes === false) {
                if (current.length > 0) {
                    result.push(current);
                    current = "";
                }
                continue;
            }
            if (inQuotes && str[i] === inQuotes) {
                inQuotes = false;
            }
            if (current.length === 0 && quotes.indexOf(str[i]) !== -1) {
                inQuotes = str[i];
            }
            current += str[i];
        }
        result.push(current);

        return result;
    }

    function _handleSnippet(props) {
        var editor    = EditorManager.getCurrentFullEditor(),
            document  = DocumentManager.getCurrentDocument(),
            pos       = editor.getCursorPos(),
            line      = document.getLine(pos.line),
            preInline = [];

        if (!props) {
            props = _parseArgs(line);
        }

        function completeInsert(editor, pos, output) {
            var s,
                x,
                cursorPos,
                cursorOffset;

            // add back text that was found before inline snippet
            if (preInline.length > 0) {
                output = preInline.join(" ") + " " + output;
            }

            var lines = output.split("\n");
           
            //figure out cursor pos, remove cursor marker
            for (s = 0; s < lines.length; s++) {
                cursorOffset = lines[s].indexOf('!!{cursor}');
                if (cursorOffset >= 0) {
                    cursorPos = s;
                    output = output.replace('!!{cursor}', '');
                    break;
                }
            }

            //do insertion
            document.replaceRange(output + "\n", {line: pos.line, ch: 0}, {line: pos.line, ch: 0});
            
            //set cursor
            editor._codeMirror.setCursor(pos.line + cursorPos, cursorOffset);
            
            //indent lines
            for (x = 0; x < lines.length; x++) {
                editor._codeMirror.indentLine(pos.line + x);
            }
            
            //give focus back
            EditorManager.focusEditor();
        }
        function startInsert(output) {
            //we don't need to see the trigger text
            CommandManager.execute(Commands.EDIT_DELETE_LINES);

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
                snippetPromise = inlineSnippetFormProvider(editor, snippetVariables, output);
                
                snippetPromise.done(function (inlineWidget) {
                    var newPos = {line: pos.line - 1, ch: pos.ch};
                    editor.addInlineWidget(newPos, inlineWidget);
                    var inlineComplete = function () {
                        var z;
                        for (z = 0; z < snippetVariables.length; z++) {
                            //even my escapes have escapes
                            var re = new RegExp(snippetVariables[z].replace('$${', '\\$\\$\\{').replace('}', '\\}'), 'g');
                            output = output.replace(re, inlineWidget.$form.find('.snipvar-' + snippetVariables[z].replace('$${', '').replace('}', '')).val());
                        }
                        
                        completeInsert(editor, pos, output);
                    };
                    inlineWidget.$form.on('complete', function () {
                        inlineComplete();
                        inlineWidget.close();
                    });
                }).fail(function () {
                    result.reject();
                    console.log("Can't create inline snippet form");
                });
            }
        }
                
        function readSnippetFromFile(fileName) {
            var snippetFilePath = snippetsDirectory + '/snippets/' + fileName;
            FileSystem.resolve(snippetFilePath, function (err, snippetFile) {
                if (err) {
                    FileUtils.showFileOpenError(err, snippetFilePath);
                    return;
                }

                snippetFile.read(function (err, text) {
                    if (err) {
                        FileUtils.showFileOpenError(err, snippetFile.fullPath);
                        return;
                    }

                    startInsert(SnippetPresets.execute(text));
                });
            });
        }
        
        if (props.length) {
            //try to find the snippet, given the trigger text
            var i,
                triggers = _.pluck(snippets, "trigger");
            //go in backwards order for a case there is an inline snippet along the way
            for (i = props.length; i > 0; i--) {
                var io = triggers.indexOf(props[i]);
                if (io !== -1 && snippets[io].inline) {
                    // found inline snippet
                    preInline = props.slice(0, i);
                    props = props.slice(i);
                    startInsert(SnippetPresets.execute(snippets[io].template));
                    return;
                }
            }
            //no inline snippet found so look for any snippet that matches props[0]
            var snippet = _.find(snippets, function (s) {
                return s.trigger === props[0];
            });
            if (snippet) {
                var output = snippet.template;
                if (output.indexOf('.snippet') === output.length - 8) {
                    readSnippetFromFile(output);
                } else {
                    startInsert(SnippetPresets.execute(output));
                }
            }
        }
    }
    
    //builds the snippets table
    function setupSnippets() {
        var s = Mustache.render(panelHtml);
        panel = PanelManager.createBottomPanel(VIEW_HIDE_SNIPPETS, $(s), 100);
        panel.hide();
        
        $snippetsPanel = $('#snippets');
        $snippetsContent = $snippetsPanel.find(".resizable-content");
        $snippetsPanel
            .on("click", ".snippets-settings", function () {
                SettingsDialog.show();
            })
            .on("click", ".snippets-close", function () {
                CommandManager.execute(VIEW_HIDE_SNIPPETS);
            });
    }
    
    function finalizeSnippetsTable() {
        var i,
            len,
            $snippetsTable;
        for (i = 0, len = arguments.length; i < len; i++) {
            if (arguments[i] && arguments[i].length) {
                snippets = snippets.concat(arguments[i]);
            }
        }
        $snippetsTable = Mustache.render(snippetsHTML, {"snippets" : snippets});
        $snippetsPanel.find('.resizable-content').append($snippetsTable);
        $snippetsPanel.find('.snippets-trigger').on('click', function () {
            CommandManager.execute(SNIPPET_EXECUTE, [$(this).attr('data-trigger')]);
        });
        $snippetsPanel.find('.snippets-source').on('click', function () {
            CommandManager.execute(Commands.FILE_OPEN, { fullPath: snippetsDirectory + "/" + $(this).attr('data-source') });
        });
    }
            
    //parse a JSON file with a snippet in it
    function loadSnippet(fileEntry) {
        var result = new $.Deferred();
        fileEntry.read(function (err, text) {
            if (err) {
                FileUtils.showFileOpenError(err, fileEntry.fullPath);
                result.reject(err);
                return;
            }

            try {
                //TODO: a better check for valid snippets
                var newSnippets = JSON.parse(text);
                newSnippets.forEach(function (item) {
                    item.source = fileEntry.name;
                });
                result.resolve(newSnippets);
            } catch (err) {
                console.error("Can't parse snippets from " + fileEntry.fullPath + " - " + err);
                result.reject(err);
            }
        });
        return result;
    }

    CommandManager.register("Run Snippet", SNIPPET_EXECUTE, _handleSnippet);
    CommandManager.register("Show Snippets", VIEW_HIDE_SNIPPETS, _handleHideSnippets);
    
    function loadSnippets() {
        if (!FileSystem.isAbsolutePath(snippetsDirectory)) {
            snippetsDirectory = FileUtils.getNativeModuleDirectoryPath(module) + "/" + snippetsDirectory;
        }
        //loop through the directory to load snippets
        FileSystem.resolve(snippetsDirectory, function (err, rootEntry) {
            if (err) {
                console.error("[Snippets] Error -- could not open snippets directory: " + snippetsDirectory);
                console.error(err);
                return;
            }

            rootEntry.getContents(function (err, entries) {
                if (err) {
                    console.error("[Snippets] Error -- could not read snippets directory: " + snippetsDirectory);
                    console.error(err);
                    return;
                }

                var loading = _.compact(entries.map(function (entry) {
                    if (entry.name.charAt(0) === ".") {
                        //ignore dotfiles
                        return;
                    }
                    if (entry.isDirectory) {
                        //ignore directories
                        return;
                    }
                    return loadSnippet(entry);
                }));

                $.when.apply(module, loading).done(finalizeSnippetsTable);
            });
        });
    }

    AppInit.appReady(function () {
        //add the HTML UI
        setupSnippets();
        
        //load css
        ExtensionUtils.loadStyleSheet(module, "snippets.css");
        
        //add the menu and keybinding for view/hide
        var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        menu.addMenuItem(VIEW_HIDE_SNIPPETS, Preferences.get("showSnippetsPanelShortcut"), Menus.AFTER, Commands.VIEW_HIDE_SIDEBAR);

        // Add toolbar icon 
        $("<a>")
            .attr({
                id: "snippets-enable-icon",
                href: "#"
            })
            .click(_handleHideSnippets)
            .appendTo($("#main-toolbar .buttons"));
        
        //add the keybinding
        KeyBindingManager.addBinding(SNIPPET_EXECUTE, Preferences.get("triggerSnippetShortcut"));
                
        //load snippets
        loadSnippets();
    });
    
});
