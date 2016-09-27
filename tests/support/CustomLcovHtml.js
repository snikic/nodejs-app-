'use strict';

// http://stackoverflow.com/a/23046477

define([
    'intern/lib/reporters/lcovhtml',
    'intern/dojo/node!glob'
], function(Lcovhtml, glob) {
    var Reporter = function(config) {
        Lcovhtml.call(this, config);
        this._config = config || {};
    };

    Reporter.prototype = Object.create(Lcovhtml.prototype);
    //Reporter.prototype.constructor = Reporter;

    Reporter.prototype.runStart = function(executor) {
        console.log('RUN START!=!');
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
