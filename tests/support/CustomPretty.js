'use strict';

// http://stackoverflow.com/a/23046477

define([
    'intern/lib/reporters/pretty',
    'intern/dojo/node!glob'
], function(Pretty, glob) {
    var Reporter = function(config) {
        Pretty.call(this, config);
        this._config = config || {};
    };

    Reporter.prototype = Object.create(Pretty.prototype);
    //Reporter.prototype.constructor = Reporter;

    Reporter.prototype.runStart = function(executor) {
        Pretty.prototype.runStart.call(this)
        var that = this;
        glob('src/**/*.js', {'nonull': false, 'realpath': true}, function(er, files) {
            files.forEach(function(file) {
                var coverageData = {};
                coverageData[file] = {
                    path: file,
                    s: {},
                    b: {},
                    f: {},
                    fnMap: {},
                    statementMap: {},
                    branchMap: {}
                };
                that.coverage(null, coverageData);
            });
        });
    };

    return Reporter;
});
