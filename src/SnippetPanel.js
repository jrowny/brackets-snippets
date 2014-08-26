define(function (require, exports) {
    "use strict";

    // Brackets modules
    var CommandManager      = brackets.getModule("command/CommandManager"),
        Commands            = brackets.getModule("command/Commands"),
        EditorManager       = brackets.getModule("editor/EditorManager"),
        Menus               = brackets.getModule("command/Menus"),
        PanelManager        = brackets.getModule("view/PanelManager");

    // Dependencies
    var Main                = require("main"),
        Preferences         = require("src/Preferences"),
        SettingsDialog      = require("src/SettingsDialog"),
        panelHtml           = require("text!templates/bottom-panel.html"),
        snippetsHTML        = require("text!templates/snippets-table.html");

    // Module constants
    var SNIPPET_EXECUTE     = "snippets.execute",
        VIEW_HIDE_SNIPPETS  = "snippets.hideSnippets";

    // Module variables
    var panel,
        $panel;

    function renderTable(snippets) {
        // render snippets table
        var snippetsTableHtml = Mustache.render(snippetsHTML, { snippets: snippets });
        $panel.find(".resizable-content").empty().append(snippetsTableHtml);
    }

    function toggleSnippetPanel() {
        var isVisible = !panel.isVisible();

        if (isVisible) {
            panel.show();
        } else {
            panel.hide();
        }

        $("#snippets-enable-icon").toggleClass("opened", isVisible);

        CommandManager.get(VIEW_HIDE_SNIPPETS).setChecked(isVisible);
        EditorManager.resizeEditor();
    }

    function init() {
        var s = Mustache.render(panelHtml);
        panel = PanelManager.createBottomPanel(VIEW_HIDE_SNIPPETS, $(s), 100);
        panel.hide();

        $panel = $("#snippets");
        $panel
            .on("click", ".snippets-settings", function () {
                SettingsDialog.show();
            })
            .on("click", ".snippets-trigger", function () {
                CommandManager.execute(SNIPPET_EXECUTE, [$(this).attr("data-trigger")]);
            })
            .on("click", ".snippets-source", function () {
                CommandManager.execute(Commands.FILE_OPEN, { fullPath: Main.getSnippetsDirectory() + "/" + $(this).attr("data-source") });
            })
            .on("click", ".close", function () {
                CommandManager.execute(VIEW_HIDE_SNIPPETS);
            });

        // Add toolbar icon
        $("<a>")
            .attr({
                id: "snippets-enable-icon",
                href: "#"
            })
            .click(toggleSnippetPanel)
            .appendTo($("#main-toolbar .buttons"));

        // Add menu entry
        var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        menu.addMenuItem(VIEW_HIDE_SNIPPETS, Preferences.get("showSnippetsPanelShortcut"), Menus.AFTER, Commands.VIEW_HIDE_SIDEBAR);
    }

    // Register command
    CommandManager.register("Show Snippets", VIEW_HIDE_SNIPPETS, toggleSnippetPanel);

    // Public API
    exports.renderTable = renderTable;
    exports.init = init;
});
