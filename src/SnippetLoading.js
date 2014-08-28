define(function (require) {
    "use strict";

    // Brackets modules
    var _                 = brackets.getModule("thirdparty/lodash"),
        CommandManager    = brackets.getModule("command/CommandManager"),
        FileSystem        = brackets.getModule("filesystem/FileSystem"),
        FileUtils         = brackets.getModule("file/FileUtils"),
        KeyBindingManager = brackets.getModule("command/KeyBindingManager");

    // Extension modules
    var EventEmitter = require("src/EventEmitter"),
        Events       = require("src/Events"),
        Preferences  = require("src/Preferences");

    // Module variables
    var _commandCounter = 0;

    function finalizeSnippetsLoading(arrays) {
        // merge all results into snippets array
        var snippets = arrays.reduce(function (snippets, arr) {
            return snippets.concat(arr);
        }, []);

        // register keyboard shortcuts for snippets
        _.filter(snippets, function (snippet) {
            return typeof snippet.shortcut === "string";
        }).forEach(function (snippet) {

            _commandCounter++;

            var commandName = "Run snippet '" + snippet.name + "'",
                commandString = "snippets.execute." + _commandCounter;

            CommandManager.register(commandName, commandString, function () {
                EventEmitter.emit(Events.TRIGGER_SNIPPET, snippet);
            });

            // remove any old bindings
            KeyBindingManager.removeBinding(snippet.shortcut);

            // add new binding
            KeyBindingManager.addBinding(commandString, snippet.shortcut);

        });

        return snippets;
    }

    function loadSnippetsFromFile(fileEntry) {
        var deferred = new $.Deferred();
        fileEntry.read(function (err, text) {
            if (err) {
                FileUtils.showFileOpenError(err, fileEntry.fullPath);
                return deferred.reject(err);
            }

            var newSnippets;
            // TODO: a better check for valid snippets
            try {
                newSnippets = JSON.parse(text);
            } catch (err) {
                console.error("Can't parse snippets from " + fileEntry.fullPath + " - " + err);
                return deferred.reject(err);
            }

            newSnippets.forEach(function (item) {
                item.source = fileEntry.name;
            });
            deferred.resolve(newSnippets);
        });
        return deferred.promise();
    }

    function loadAllSnippetsFromDataDirectory() {
        var deferred = new $.Deferred(),
            snippetsDirectory = Preferences.get("snippetsDirectory");

        // loop through the directory to load snippets
        FileSystem.resolve(snippetsDirectory, function (err, rootEntry) {
            if (err) {
                console.error("[Snippets] Error -- could not open snippets directory: " + snippetsDirectory);
                return deferred.reject(err);
            }

            rootEntry.getContents(function (err, entries) {
                if (err) {
                    console.error("[Snippets] Error -- could not read snippets directory: " + snippetsDirectory);
                    return deferred.reject(err);
                }

                var loading = _.compact(entries.map(function (entry) {
                    if (entry.name.charAt(0) === ".") {
                        // ignore dotfiles
                        return;
                    }
                    if (entry.isDirectory) {
                        // ignore directories
                        return;
                    }
                    return loadSnippetsFromFile(entry);
                }));

                $.when.apply(null, loading).done(function () {
                    deferred.resolve(finalizeSnippetsLoading(_.toArray(arguments)));
                });
            });
        });

        return deferred.promise();
    }

    function reloadSnippets() {
        loadAllSnippetsFromDataDirectory().done(function (snippets) {
            EventEmitter.emit(Events.SNIPPETS_LOADED, snippets);
        }).fail(function (err) {
            console.error("[brackets-snippets]", err);
        });
    }

    // Register event handlers
    EventEmitter.on(Events.EXTENSION_INIT, function () {
        reloadSnippets();
    });

    // Listeners for file changes.
    FileSystem.on("change", function (event, file) {
        if (file.fullPath.indexOf(Preferences.get("snippetsDirectory")) === 0) {
            reloadSnippets();
        }
    });

});
