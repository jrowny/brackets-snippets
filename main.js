define(function (require, exports, module) {

    // Brackets modules
    var AppInit         = brackets.getModule("utils/AppInit"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        FileSystem      = brackets.getModule("filesystem/FileSystem"),
        FileUtils       = brackets.getModule("file/FileUtils");

    // Require modules so their Event listeners are registered
    require("src/SnippetLoading");
    require("src/SnippetPanel");
    require("src/SnippetInsertion");

    // Extension modules
    var EventEmitter      = require("src/EventEmitter"),
        Events            = require("src/Events"),
        Preferences       = require("src/Preferences");

    // Fix snippets directory path to absolute
    var snippetsDirectory = Preferences.get("snippetsDirectory").replace(/\\/g, "/");
    if (!FileSystem.isAbsolutePath(snippetsDirectory)) {
        snippetsDirectory = FileUtils.getNativeModuleDirectoryPath(module) + "/" + snippetsDirectory;
    }
    Preferences.set("snippetsDirectory", snippetsDirectory);

    // Extension startup
    AppInit.appReady(function () {
        // Load styles
        ExtensionUtils.loadStyleSheet(module, "styles/snippets.less");
        // Notify modules that they can start their initialization
        EventEmitter.emit(Events.EXTENSION_INIT);
    });

});
