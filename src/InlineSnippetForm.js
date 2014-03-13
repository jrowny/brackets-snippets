/*
 * Copyright (c) 2013 Jonathan Rowny. All rights reserved.
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
 * 
 */


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, window */

define(function (require, exports, module) {
    'use strict';
    // Load Brackets modules
    var InlineWidget        = brackets.getModule("editor/InlineWidget").InlineWidget;
    function InlineSnippetForm(props, snippet) {
        this.props = props;
        this.snippet = snippet;
        
        InlineWidget.call(this);
    }
    
    function textWidth(text) {
        var html = $('<span style="postion:absolute;width:auto;left:-9999px">' +  text + '</span>');
        $('body').append(html);
        var width = html.width();
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
        this.$form = $('<div class="snippet-form"><div/>');
        
        function formElement(property) {
            property = property.replace('$${', '').replace('}', '');
            return '<input type="text" value="" class="snipvar-' + property + '" data-snippet="' + property + '" placeholder="' + property + '"/>';
        }
        
        //make our snippet look nice in the editor
        htmlOutput = htmlOutput.replace(/</g, '&lt;')
                               .replace(/>/g, '&gt;')
                               .replace(/(\r\n|\n|\r)/gm, '<br>')
                               .replace(/\t/g, '    ')
                               .replace('!!{cursor}', '')
                               .replace(/ /g, '&nbsp;');
        
        //turn the snippets into form fields
        for (x = 0; x < this.props.length; x++) {
            htmlOutput = htmlOutput.split(this.props[x]).join(formElement(this.props[x]));
        }
                
        this.$form.append(htmlOutput);
        
        //size the inputs to the placeholders and changing text
        this.$form.find('input').each(function () {
            var $input = $(this);
            var newWidth = 0;
            $input.width(textWidth($(this).attr('placeholder')));
            $input.keyup(function () {
                if ($input.is(':focus')) {
                    if ($(this).val() === "") {
                        newWidth = textWidth($(this).attr('placeholder'));
                    } else {
                        //dash gives it some extra space while typing
                        newWidth = textWidth($(this).val());
                    }
                    $input.parent().find('.snipvar-' + $(this).attr('data-snippet')).width(newWidth);
                    $input.parent().find('.snipvar-' + $(this).attr('data-snippet')).not(this).val($(this).val());
                }
            });
        });
                
        //listen for keypress
        this.$form.keydown(function (e) {
            //on enter, complete snippet
            if (e.which === 13) {
                e.stopImmediatePropagation();
                e.preventDefault();
                $(this).trigger('complete');
            } else if (e.which === 9) {
                //we will control the tabing
                e.stopImmediatePropagation();
                e.preventDefault();
                
                //select the next empty element unless there is no next element... or the next element is the current element
                var next = $(this).find('input').filter(function () { return $(this).val() === ""; });
                if (next.length && !$(next[0]).is(':focus')) {
                    $(next[0]).focus();
                } else {
                    $(this).trigger('complete');
                }
            }
        });
                        
        this.$htmlContent.addClass('snippet-form-widget');
        this.$htmlContent.append(this.$form);
    };
    
    InlineSnippetForm.prototype.close = function () {
        this.hostEditor.removeInlineWidget(this);
    };
    InlineSnippetForm.prototype.onAdded = function () {
        InlineSnippetForm.prototype.parentClass.onAdded.apply(this, arguments);
        window.setTimeout(this._sizeEditorToContent.bind(this));
        this.$form.find('input').first().focus();
    };
    
    InlineSnippetForm.prototype._sizeEditorToContent = function () {
        this.hostEditor.setInlineWidgetHeight(this, this.$form.height(), true);
    };
    
    module.exports = InlineSnippetForm;
});
