module.exports = function (grunt) {
    "use strict";

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        jshint: {
            files: ["*.js", "src/**/*.js", "nls/**/*.js"],
            options: {
                jshintrc: true
            }
        },
        jscs: {
            src: ["*.js", "src/**/*.js", "nls/**/*.js"],
            options: {
                config: ".jscs.json"
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-jscs-checker");

    grunt.registerTask("default", ["jshint", "jscs"]);
    grunt.registerTask("test", ["jshint", "jscs"]);

};
