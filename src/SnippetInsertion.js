define(function (require, exports) {
    "use strict";

    // Brackets modules
    var _                 = brackets.getModule("thirdparty/lodash"),
        CommandManager    = brackets.getModule("command/CommandManager"),
        DocumentManager   = brackets.getModule("document/DocumentManager"),
        EditorManager     = brackets.getModule("editor/EditorManager"),
        FileSystem        = brackets.getModule("filesystem/FileSystem"),
        FileUtils         = brackets.getModule("file/FileUtils"),
        KeyBindingManager = brackets.getModule("command/KeyBindingManager");

    // Dependencies
    var Main              = require("main"),
        InlineSnippetForm = require("src/InlineSnippetForm"),
        Preferences       = require("src/Preferences"),
        SnippetPresets    = require("src/SnippetPresets");

    // Module variables
    var snippets;

    // create context for inserting snippets that is passed between the functions
    function _createContext() {
        var editor     = EditorManager.getCurrentFullEditor(),
            pos        = editor.getCursorPos(),
            document   = DocumentManager.getCurrentDocument(),
            line       = document.getLine(pos.line);
        return {
            editor: editor,
            pos: pos,
            document: document,
            line: line
        };
    }

    // parse parts of the line as possible arguments or snippet triggers
    function _parseArgs(str) {
        var result = [],
            current = "",
            inQuotes = false,
            quotes = ["\"", "'"];
        for (var i = 0, l = str.length; i < l; i++) {
            if (str[i] === " " && inQuotes === false) {
                if (current.length > 0) {
                    result.push({
                        str: current,
                        ch: i - current.length
                    });
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
        if (current) {
            result.push({
                str: current,
                ch: i - current.length
            });
        }
        return result;
    }

    // loads snippets by filename from snippets directory, currently hard-coded
    function _readSnippetFromFile(fileName) {
        var deferred = new $.Deferred(),
            snippetFilePath = Main.getSnippetsDirectory() + "/snippets/" + fileName;
        FileSystem.resolve(snippetFilePath, function (err, snippetFile) {
            if (err) {
                FileUtils.showFileOpenError(err, snippetFilePath);
                return deferred.reject(err);
            }

            snippetFile.read(function (err, text) {
                if (err) {
                    FileUtils.showFileOpenError(err, snippetFile.fullPath);
                    return deferred.reject(err);
                }

                deferred.resolve(text);
            });
        });
        return deferred.promise();
    }

    // loads snippet from file if required, or resolves immediately
    function _loadSnippetTemplate(template) {
        if (template.indexOf(".snippet") === template.length - 8) {
            return _readSnippetFromFile(template);
        } else {
            return $.Deferred().resolve(template).promise();
        }
    }

    function _getVariablesFromTemplate(template) {
        var snippetVariables = [];

        // find variables
        var tmp = template.match(/\$\$\{[0-9A-Z_a-z]{1,32}\}/g);
        // remove duplicate variables
        if (tmp && tmp.length > 0) {
            for (var j = 0; j < tmp.length; j++) {
                if ($.inArray(tmp[j], snippetVariables) === -1) {
                    snippetVariables.push(tmp[j]);
                }
            }
        }

        return snippetVariables;
    }

    function _getInlineSnippetForm(context) {
        var hostEditor = context.editor;
        var props = context.templateVariables;
        var snippet = context.template;
        return $.when(new InlineSnippetForm(props, snippet).load(hostEditor));
    }

    // finishes snippet insertion
    function _insertSnippet(context) {
        var cursorOffsetLine,
            cursorOffsetChar,
            template = context.template,
            snippetLines = template.split("\n");

        // figure out cursor pos, remove cursor marker
        for (var s = 0; s < snippetLines.length; s++) {
            cursorOffsetChar = snippetLines[s].indexOf("!!{cursor}");
            if (cursorOffsetChar >= 0) {
                cursorOffsetLine = s;
                template = template.replace("!!{cursor}", "");
                break;
            }
        }

        var line = context.pos.line,
            chFrom = context.snippetTrigger.ch,
            chTo = context.snippetTrigger.ch + context.snippetTrigger.str.length;

        // include used arguments in replace range
        if (context.snippetArgs.length > 0) {
            var firstStart = _.first(context.snippetArgs).ch;
            if (firstStart < chFrom) {
                chFrom = firstStart;
            }
            var last = _.last(context.snippetArgs),
                lastEnd = last.ch + last.str.length;
            if (lastEnd > chTo) {
                chTo = lastEnd;
            }
        }

        // do insertion
        context.document.replaceRange(template, { line: line, ch: chFrom }, { line: line, ch: chTo });

        // set cursor
        context.editor._codeMirror.setCursor(line + cursorOffsetLine, chFrom + cursorOffsetChar);

        // indent lines
        for (var x = 0; x < snippetLines.length; x++) {
            context.editor._codeMirror.indentLine(line + x);
        }

        // give focus back
        EditorManager.focusEditor();
    }

    // expects snippet, snippetTrigger, snippetArgs in context
    function _executeSnippet(context) {
        if (!context.snippet.template) {
            return console.error("[brackets-snippets] Snippet '" + context.snippet.name + "' has no template defined!");
        }
        // load snippet from file if required
        return _loadSnippetTemplate(context.snippet.template).done(function (template) {
            context.template = template;
            // prefill standard variables
            context.template = SnippetPresets.execute(context.template);
            // we need to find out if our snippet needs any more variables to fill
            context.templateVariables = _getVariablesFromTemplate(context.template);

            var variablesDifference = context.snippetArgs.length - context.templateVariables.length;
            if (variablesDifference > 0) {
                // we have more variables than we require so we need to drop excess
                if (context.snippetTrigger.str) {
                    // if we have trigger string we want variables right of it
                    context.snippetArgs = context.snippetArgs.slice(0, context.templateVariables.length);
                } else {
                    // if we don't have trigger string we want variables before cursor position
                    context.snippetArgs = context.snippetArgs.slice(context.snippetArgs.length - context.templateVariables.length);
                }
            }

            if (variablesDifference >= 0) {
                // we can now fill all our variables without the need for insert form
                context.templateVariables.forEach(function (variable, index) {
                    // even my escapes have escapes
                    var re = new RegExp(variable.replace("$${", "\\$\\$\\{").replace("}", "\\}"), "g");
                    context.template = context.template.replace(re, context.snippetArgs[index].str);
                });
                return _insertSnippet(context);
            } else {
                // snippet form has to be triggered

                // we are not using any variables from line
                context.snippetArgs = [];

                return _getInlineSnippetForm(context).done(function (inlineWidget) {
                    // decite a position for the widget
                    var newPos = {
                        line: context.pos.line - 1,
                        ch: context.pos.ch
                    };

                    context.editor.addInlineWidget(newPos, inlineWidget);

                    var inlineComplete = function () {
                        context.templateVariables.forEach(function (variable) {
                            var re = new RegExp(variable.replace("$${", "\\$\\$\\{").replace("}", "\\}"), "g"),
                                variableNormalized = variable.replace("$${", "").replace("}", ""),
                                variableValue = inlineWidget.$form.find(".snipvar-" + variableNormalized).val();
                            context.template = context.template.replace(re, variableValue);
                        });
                        return _insertSnippet(context);
                    };

                    inlineWidget.$form.on("complete", function () {
                        inlineComplete();
                        inlineWidget.close();
                    });

                }).fail(function (err) {
                    console.error(err);
                });
            }
        });
    }

    // triggers passed snippet on current cursor position
    function triggerSnippet(snippet, snippetTrigger) {
        var context = _createContext();
        context.snippet = snippet;
        context.snippetTrigger = snippetTrigger || {
            str: "",
            ch: context.pos.ch
        };

        // we need to get arguments from the line to fill snippetArgs
        var props = _parseArgs(context.line);

        // if we pass custom trigger, exclude it from the props
        if (snippetTrigger && snippetTrigger.str) {
            var newProps = [];
            for (var i = props.length - 1; i >= 0; i--) {
                if (props[i].str === snippetTrigger.str) {
                    break;
                }
                newProps.unshift(props[i]);
            }
            props = newProps;
        }

        // filter only those props that are before the cursor position
        context.snippetArgs = _.filter(props, function (prop) {
            return prop.ch <= context.pos.ch;
        });

        return _executeSnippet(context);
    }

    // parses snippet from current line and triggers it
    function triggerSnippetOnLine() {
        var context = _createContext();

        // find arguments on the line to identify a snippet to trigger
        var props = _parseArgs(context.line);
        if (props.length === 0) { return; }

        // try to find the snippet, given the trigger text
        var triggers = _.pluck(snippets, "trigger");

        // go in backwards order for a case there is an inline snippet along the way
        for (var i = props.length - 1; i > 0; i--) {

            var io,
                requireInline = true;

            // launch non-inline in inline mode snippets when %trigger is found
            if (props[i].str[0] === "%") {
                requireInline = false;
                io = triggers.indexOf(props[i].str.substring(1));
            } else {
                io = triggers.indexOf(props[i].str);
            }

            if (io !== -1 && (snippets[io].inline || !requireInline)) {
                // found inline snippet
                context.snippet = snippets[io];
                context.snippetTrigger = props[i];
                context.snippetArgs = props.slice(i + 1);
                return _executeSnippet(context);
            }
        }

        // no inline snippet found so look for any snippet that matches props[0]
        // it can also have % as a prefix so remove
        var lookFor = props[0].str;
        if (lookFor[0] === "%") {
            lookFor = lookFor.substring(1);
        }
        var snippet = _.find(snippets, function (s) {
            return s.trigger === lookFor;
        });
        if (snippet) {
            context.snippet = snippet;
            context.snippetTrigger = props[0];
            context.snippetArgs = props.slice(1);
            return _executeSnippet(context);
        }
    }

    function init() {
        // add the keybinding
        var SNIPPET_EXECUTE_CMD = "snippets.execute";
        CommandManager.register("Run Snippet", SNIPPET_EXECUTE_CMD, triggerSnippetOnLine);
        KeyBindingManager.addBinding(SNIPPET_EXECUTE_CMD, Preferences.get("triggerSnippetShortcut"));
    }

    function updateSnippets(_snippets) {
        // fill module variable
        snippets = _snippets;
    }

    // Public API
    exports.triggerSnippet        = triggerSnippet;
    exports.triggerSnippetOnLine  = triggerSnippetOnLine;
    exports.init                  = init;
    exports.updateSnippets        = updateSnippets;
});
