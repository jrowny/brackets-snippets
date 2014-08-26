define(function (require, exports, module) {

    // Brackets modules
    var _                 = brackets.getModule("thirdparty/lodash"),
        AppInit           = brackets.getModule("utils/AppInit"),
        CommandManager    = brackets.getModule("command/CommandManager"),
        ExtensionUtils    = brackets.getModule("utils/ExtensionUtils"),
        FileSystem        = brackets.getModule("filesystem/FileSystem"),
        FileUtils         = brackets.getModule("file/FileUtils"),
        KeyBindingManager = brackets.getModule("command/KeyBindingManager");

    // Dependencies
    var Preferences       = require("src/Preferences"),
        SnippetPanel      = require("src/SnippetPanel"),
        SnippetInsertion  = require("src/SnippetInsertion");

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
                SnippetInsertion.triggerSnippet(snippet);
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

    var _getSnippetsDirectory = null;
    function getSnippetsDirectory() {
        if (_getSnippetsDirectory) { return _getSnippetsDirectory; }

        var snippetsDirectory = Preferences.get("snippetsDirectory").replace(/\\/g, "/");
        if (!FileSystem.isAbsolutePath(snippetsDirectory)) {
            snippetsDirectory = FileUtils.getNativeModuleDirectoryPath(module) + "/" + snippetsDirectory;
        }

        _getSnippetsDirectory = snippetsDirectory;
        return _getSnippetsDirectory;
    }

    function loadAllSnippetsFromDataDirectory() {
        var deferred = new $.Deferred(),
            snippetsDirectory = getSnippetsDirectory();

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

                $.when.apply(module, loading).done(function () {
                    deferred.resolve(finalizeSnippetsLoading(_.toArray(arguments)));
                });
            });
        });
        return deferred.promise();
    }

    function reloadSnippets() {
        loadAllSnippetsFromDataDirectory().done(function (snippets) {
            SnippetPanel.renderTable(snippets);
            SnippetInsertion.updateSnippets(snippets);
        }).fail(function (err) {
            console.error(err);
        });
    }

    // Listeners for file changes.
    FileSystem.on("change", function (event, file) {
        if (file.fullPath.indexOf(getSnippetsDirectory()) === 0) {
            reloadSnippets();
        }
    });

    // Extension startup
    AppInit.appReady(function () {
        ExtensionUtils.loadStyleSheet(module, "styles/snippets.less");
        SnippetPanel.init();
        SnippetInsertion.init();
        reloadSnippets();
    });

    // Public API
    exports.getSnippetsDirectory = getSnippetsDirectory;
});
