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
        },
        compress: {
            main: {
                options: {
                    archive: "brackets-snippets.zip"
                },
                files: [
                    { src: ["data/**"], dest: "/" },
                    { src: ["nls/**"], dest: "/" },
                    { src: ["src/**"], dest: "/" },
                    { src: ["styles/**"], dest: "/" },
                    { src: ["templates/**"], dest: "/" },
                    { src: ["thirdparty/**"], dest: "/" },
                    { src: ["LICENSE", "*.js", "*.json", "*.md"], dest: "/", filter: "isFile" }
                ]
            }
        },
        lineending: {
            dist: {
                options: {
                    eol: "lf",
                    overwrite: true
                },
                files: {
                    "": [
                        "main.js",
                        "strings.js",
                        "Gruntfile.js",
                        "data/**/*.*",
                        "nls/**/*.js",
                        "src/**/*.js",
                        "styles/**/*.less",
                        "templates/**/*.html",
                        "thirdparty/**/*.js"
                    ]
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-jscs");
    grunt.loadNpmTasks("grunt-contrib-compress");
    grunt.loadNpmTasks("grunt-lineending");

    grunt.registerTask("package", ["lineending", "compress"]);
    grunt.registerTask("default", ["jshint", "jscs"]);
    grunt.registerTask("test", ["jshint", "jscs"]);

};
