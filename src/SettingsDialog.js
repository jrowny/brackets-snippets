define(function (require, exports) {
    "use strict";

    // Brackets modules
    var CommandManager          = brackets.getModule("command/CommandManager"),
        Dialogs                 = brackets.getModule("widgets/Dialogs");

    // Extension modules
    var Preferences             = require("src/Preferences"),
        Strings                 = require("strings"),
        settingsDialogTemplate  = require("text!templates/settings-dialog.html"),
        questionDialogTemplate  = require("text!templates/question-dialog.html");

    // Module variables
    var dialog,
        $dialog;

    function setValues(values) {
        $("*[settingsProperty]", $dialog).each(function () {
            var $this = $(this),
                type = $this.attr("type"),
                property = $this.attr("settingsProperty");
            if (type === "checkbox") {
                $this.prop("checked", values[property]);
            } else {
                $this.val(values[property]);
            }
        });
    }

    function collectValues() {
        $("*[settingsProperty]", $dialog).each(function () {
            var $this = $(this),
                type = $this.attr("type"),
                property = $this.attr("settingsProperty");
            if (type === "checkbox") {
                Preferences.set(property, $this.prop("checked"));
            } else {
                Preferences.set(property, $this.val().trim() || null);
            }
        });
        Preferences.save();
    }

    function assignActions() {
        $("button[data-button-id='defaults']", $dialog).on("click", function (e) {
            e.stopPropagation();
            setValues(Preferences.getDefaults());
        });
    }

    function init() {
        setValues(Preferences.getAll());
        assignActions();
    }

    function showRestartDialog() {
        var compiledTemplate = Mustache.render(questionDialogTemplate, {
            title: Strings.RESTART,
            question: Strings.Q_RESTART_BRACKETS,
            Strings: Strings
        });
        Dialogs.showModalDialogUsingTemplate(compiledTemplate).done(function (buttonId) {
            if (buttonId === "ok") {
                CommandManager.execute("debug.refreshWindow");
            }
        });
    }

    exports.show = function () {
        var compiledTemplate = Mustache.render(settingsDialogTemplate, Strings);

        dialog = Dialogs.showModalDialogUsingTemplate(compiledTemplate);
        $dialog = dialog.getElement();

        init();

        dialog.done(function (buttonId) {
            if (buttonId === "ok") {
                // Save everything to preferences
                collectValues();
                // Restart brackets to reload changes.
                showRestartDialog();
            }
        });
    };
});
