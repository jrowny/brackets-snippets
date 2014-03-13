/*
 * Copyright (c) 2013 Jonathan Rowny
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
/*global define, window, $, brackets */

define(function (require, exports, module) {
    'use strict';
    var DocumentManager = brackets.getModule("document/DocumentManager");
    
    require("date-format");
    
    var now,
        doc,
        presets = {
            //$${DATE}  Ex: 11/17/2007
            "$${DATE}": function () {
                return now.format("shortDate");
            },
            //$${MONTH} Ex: November
            "$${MONTH}" : function () {
                return now.format("mmmm");
            },
            ///$${TIME} Ex: 14:25:00 PM
            "$${TIME}" : function () {
                return now.format("H:MM:ss TT");
            },
            //$${DATETIME}  Ex: 11/17/2007 2:42:00 PM
            "$${DATETIME}" : function () {
                return now.format("m/d/yyyy h:MM:ss TT");
            },
            //$${DAYOFWEEK} Ex: Friday
            "$${DAYOFWEEK}" : function () {
                return now.format("dddd");
            },
            //$${CURRENTFILE}   Ex: index.html - Current file name
            "$${CURRENTFILE}" : function () {
                return doc.file.name;
            },
            //$${CURRENTFOLDER} Ex: D:\workspace\myproject - Current folder
            "$${CURRENTFOLDER}" : function () {
                return doc.file.fullPath.replace("/" + doc.file.name, "");
            },
            //$${CURRENTPATH}   Ex: D:\workspace\myproject\index.html - Full path
            "$${CURRENTPATH}" : function () {
                return doc.file.fullPath;
            },
            //$${CURRENTPRJPATH}    Ex: myproject - Just the folder
            "$${CURRENTPRJPATH}" : function () {
                //TODO: this probably needs testing on mac
                var dirs = doc.file.fullPath.split("/");
                return dirs[dirs.length - 2];
            },
            //$${USERNAME}  Current user NOT IMPLEMENTED
            /*"$${USERNAME}" : function () {
                
            },*/
            //$${MONTHNUMBER}   Month as a number
            "$${MONTHNUMBER}" : function () {
                return now.format("m");
            },
            //$${DAYOFMONTH}    Day of month as a number
            "$${DAYOFMONTH}" : function () {
                return now.format("d");
            },
            //$${DAYOFWEEKNUMBER}   Day of week (the week starts on Sunday)
            "$${DAYOFWEEKNUMBER}" : function () {
                return now.getDay() + 1;
            },
            //$${DATETIME24}    Ex: 01/12/2007 14:42:00 - 24 hour clock version of datetime.
            "$${DATETIME24}" : function () {
                return now.format("m/d/yyyy H:MM:ss TT");
            },
            //$${YEAR}  Ex: 2007 - Current year
            "$${YEAR}" : function () {
                return now.getFullYear();
            },
            //$${YEAR2DIGIT}    Ex: 07 - Current two digit year
            "$${YEAR2DIGIT}" : function () {
                return now.getFullYear().toString().slice("1");
            },
            //$${CURRENTFILENOEXT}  The name of the current file with no extension Ex: "index" for "index.html"
            "$${CURRENTFILENOEXT}" : function () {
                return doc.file.name.replace("." + doc.extension, "");
            }
        };
    
    function _execute(input) {
        doc = DocumentManager.getCurrentDocument();
        now = new Date();
        var key;
        for (key in presets) {
            if (presets.hasOwnProperty(key) && input.indexOf(key) > -1) {
                input = input.replace(key, presets[key].call());
            }
        }
        return input;
    }
    exports.execute = _execute;
    
});