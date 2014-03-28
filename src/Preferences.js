define(function (require, exports, module) {
    "use strict";

    // Brackets modules
    var _                   = brackets.getModule("thirdparty/lodash"),
        PreferencesManager  = brackets.getModule("preferences/PreferencesManager");

    // Module constants
    var PREFERENCES_KEY = "brackets-snippets";

    // Module variables
    var prefs = PreferencesManager.getExtensionPrefs(PREFERENCES_KEY);
    var defaultPreferences = {
        "snippetsDirectory": {                   "type": "string",            "value": "data"               },
        "triggerSnippetShortcut": {              "type": "string",            "value": "Ctrl-Alt-Space"     },
        "showSnippetsPanelShortcut": {           "type": "string",            "value": ""                   }
    };

    _.each(defaultPreferences, function (definition, key) {
        if (definition.os && definition.os[brackets.platform]) {
            prefs.definePreference(key, definition.type, definition.os[brackets.platform].value);
        } else {
            prefs.definePreference(key, definition.type, definition.value);
        }
    });
    prefs.save();

    prefs.getAll = function () {
        var obj = {};
        _.each(defaultPreferences, function (definition, key) {
            obj[key] = this.get(key);
        }, this);
        return obj;
    };

    prefs.getDefaults = function () {
        var obj = {};
        _.each(defaultPreferences, function (definition, key) {
            var defaultValue;
            if (definition.os && definition.os[brackets.platform]) {
                defaultValue = definition.os[brackets.platform].value;
            } else {
                defaultValue = definition.value;
            }
            obj[key] = defaultValue;
        }, this);
        return obj;
    };

    prefs.persist = function (key, value) {
        this.set(key, value);
        this.save();
    };

    module.exports = prefs;
});
