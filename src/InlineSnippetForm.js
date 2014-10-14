define(function (require, exports, module) {
    "use strict";

    // Brackets modules
    var InlineWidget        = brackets.getModule("editor/InlineWidget").InlineWidget;

    function InlineSnippetForm(props, snippet) {
        this.props = props;
        this.snippet = snippet;

        InlineWidget.call(this);
    }

    function textWidth(text) {
        var html = $("<span>" + text + "</span>");
        $("body").append(html);
        var width = html.width()+18;
        html.remove();
        return width;
    }

    InlineSnippetForm.prototype = new InlineWidget();
    InlineSnippetForm.prototype.constructor = InlineSnippetForm;
    InlineSnippetForm.prototype.parentClass = InlineWidget.prototype;

    InlineSnippetForm.prototype.props = null;
    InlineSnippetForm.prototype.$wrapperDiv = null;
    InlineSnippetForm.prototype.$form = null;
    InlineSnippetForm.prototype.$insert = null;

    InlineSnippetForm.prototype.load = function (hostEditor) {

        var htmlOutput = this.snippet,
            x;

        this.parentClass.load.call(this, hostEditor);
        this.$form = $("<div class='snippet-form'><div/>");

        function formElement(property) {
            property = property.replace("$${", "").replace("}", "");
            return "<input type='text' value='' class='snipvar-" + property + "' data-snippet='" + property + "' placeholder='" + property + "'/>";
        }

        // make our snippet look nice in the editor
        htmlOutput = htmlOutput.replace(/</g, "&lt;")
                               .replace(/>/g, "&gt;")
                               .replace(/(\r\n|\n|\r)/gm, "<br>")
                               .replace(/\t/g, "    ")
                               .replace("!!{cursor}", "")
                               .replace(/ /g, "&nbsp;");

        // turn the snippets into form fields
        for (x = 0; x < this.props.length; x++) {
            htmlOutput = htmlOutput.split(this.props[x]).join(formElement(this.props[x]));
        }

        this.$form.append(htmlOutput);

        // size the inputs to the placeholders and changing text
        this.$form.find("input").each(function () {
            var $input = $(this);
            var newWidth = 0;
            $input.width(textWidth($(this).attr("placeholder")));
            $input.keyup(function () {
                if ($input.is(":focus")) {
                    if ($(this).val() === "") {
                        newWidth = textWidth($(this).attr("placeholder"));
                    } else {
                        // dash gives it some extra space while typing
                        newWidth = textWidth($(this).val());
                    }
                    $input.parent().find(".snipvar-" + $(this).attr("data-snippet")).width(newWidth);
                    $input.parent().find(".snipvar-" + $(this).attr("data-snippet")).not(this).val($(this).val());
                }
            });
        });

        // listen for keypress
        this.$form.keydown(function (e) {
            // on enter, complete snippet
            if (e.which === 13) {
                e.stopImmediatePropagation();
                e.preventDefault();
                $(this).trigger("complete");
            } else if (e.which === 9) {
                // we will control the tabing
                e.stopImmediatePropagation();
                e.preventDefault();
                // select the next empty element unless there is no next element... or the next element is the current element
                var next = $(this).find("input").filter(function () { return $(this).val() === ""; });
                if (next.length && !$(next[0]).is(":focus")) {
                    $(next[0]).focus();
                } else {
                    $(this).trigger("complete");
                }
            }
        });

        this.$htmlContent.addClass("snippet-form-widget");
        this.$htmlContent.append(this.$form);

        return this;
    };

    InlineSnippetForm.prototype.close = function () {
        this.hostEditor.removeInlineWidget(this);
    };

    InlineSnippetForm.prototype.onAdded = function () {
        InlineSnippetForm.prototype.parentClass.onAdded.apply(this, arguments);
        window.setTimeout(this._sizeEditorToContent.bind(this));
        this.$form.find("input").first().focus();
    };

    InlineSnippetForm.prototype._sizeEditorToContent = function () {
        this.hostEditor.setInlineWidgetHeight(this, this.$form.height(), true);
    };

    module.exports = InlineSnippetForm;
});
