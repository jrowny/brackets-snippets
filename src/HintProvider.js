define(function(require, exports){

    // Brackets modules
    var _                 = brackets.getModule("thirdparty/lodash"),
        CodeHintManager   = brackets.getModule("editor/CodeHintManager");

    // Dependencies
    var SnippetInsertion  = require("src/SnippetInsertion");

    function HintProvider() {
        this.snippets = [];
    }

    HintProvider.prototype.hasHints = function (editor, implicitChar) {
        this.editor = editor;
        return implicitChar === "@";
    };

    HintProvider.prototype._getHintWord = function () {
        var cursor        = this.editor.getCursorPos(),
            line          = this.editor.document.getLine(cursor.line),
            beforeCursor  = line.slice(0, cursor.ch).match(/\@.*$/);

        beforeCursor = beforeCursor ? beforeCursor[0] : "";

        var posStart = {
            line: cursor.line,
            ch: cursor.ch - beforeCursor.length
        };

        return {
            word: beforeCursor ? beforeCursor.match(/^\S+/)[0] : null,
            start: posStart
        };
    };

    HintProvider.prototype.getHints = function (/*implicitChar*/) {
        var word = this._getHintWord().word;
        var hints;

        if (!word) {
            return;
        } else if (word === "@") {
            // show all
            hints = _.compact(_.map(this.snippets, function (snippet) {
                return snippet.trigger;
            }));
        } else {
            if (word.indexOf("@") === 0) { word = word.slice(1); }
            // show only the ones beggining with word
            hints = _.compact(_.map(this.snippets, function (snippet) {
                if (snippet.trigger.indexOf(word) === 0) {
                    return snippet.trigger;
                }
            }));
        }

        return {
            hints: hints,
            match: null, // the CodeHintManager should not format the results
            selectInitial: true
        };
    };

    HintProvider.prototype.insertHint = function ($hintObj) {
        var wordObj = this._getHintWord();

        var snippet = _.find(this.snippets, function (s) {
            return s.trigger === $hintObj;
        });

        SnippetInsertion.triggerSnippet(snippet, {
            str: wordObj.word,
            ch: wordObj.start.ch
        });

        // Return false to indicate that another hinting session is not needed
        return false;
    };

    // TODO: simplify this to singleton
    var hintProviderInstance = null;

    function init() {
        hintProviderInstance = new HintProvider();
        CodeHintManager.registerHintProvider(hintProviderInstance, ["all"], 999);
    }

    function updateSnippets(snippets) {
        hintProviderInstance.snippets = _.filter(snippets, function (snippet) {
            return snippet.trigger;
        });
    }

    exports.init = init;
    exports.updateSnippets = updateSnippets;

});
