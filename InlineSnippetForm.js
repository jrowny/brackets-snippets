/*
 * Copyright (c) 2012 Jonathan Rowny. All rights reserved.
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
    function InlineSnippetForm(props) {
        this.props = props;
        InlineWidget.call(this);
    }
    
    InlineSnippetForm.prototype = new InlineWidget();
    InlineSnippetForm.prototype.constructor = InlineSnippetForm;
    InlineSnippetForm.prototype.parentClass = InlineWidget.prototype;
    
    InlineSnippetForm.prototype.props = null;
    InlineSnippetForm.prototype.$wrapperDiv = null;
    InlineSnippetForm.prototype.$form = null;
    InlineSnippetForm.prototype.$insert = null;
        
    InlineSnippetForm.prototype.load = function (hostEditor) {
        this.parentClass.load.call(this, hostEditor);
        this.$insert = $('<button class="btn btn-primary">Insert</button>');
        this.$cancel = $('<button class="btn">Cancel</button>');
        this.$form = $("<div/>");
        
        var $insWrapper = $('<div><label style="padding-right:4px;">&nbsp;</label></div>');
        
        $insWrapper.append(this.$insert).append(this.$cancel);
        
        function formElement(property) {
            property = property.replace('$${', '').replace('}', '');
            var $element = $('<div style="padding-bottom:4px;"/>');
            $element.append('<label for="' + property + '" style="padding-right:4px;">' + property + '</label>');
            $element.append('<input type="text" class="snipvar-' + property + '"/>');
            return $element;
        }
        
        var x;
        for (x = 0; x < this.props.length; x++) {
            this.$form.append(formElement(this.props[x]));
        }
               
        this.$insert.click(this.close.bind(this));
        this.$cancel.click(this.close.bind(this));
                                
        this.$form.append($insWrapper);
        // Wrapper
        this.$wrapperDiv = $('<div style="padding:10px;"/>')
            .append(this.$form);
        
        this.$htmlContent.append(this.$wrapperDiv);
    };
    
    InlineSnippetForm.prototype.close = function () {
        this.hostEditor.removeInlineWidget(this);
    };
    
    InlineSnippetForm.prototype.onAdded = function () {
        window.setTimeout(this._sizeEditorToContent.bind(this));
        this.$form.find('input').first().focus();
    };
    
    InlineSnippetForm.prototype._sizeEditorToContent = function () {
        this.hostEditor.setInlineWidgetHeight(this, this.$wrapperDiv.height() + 20, true);
    };
    
    module.exports = InlineSnippetForm;
});
