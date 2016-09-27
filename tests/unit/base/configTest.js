'use strict';

define(function(require) {
    var registerSuite = require('intern!object');
    var assert = require('intern/chai!assert');
    var config = require('intern/dojo/node!../../../src/base/config');

    registerSuite({
        'name': 'config.js Tests',

        'setup': function() {
            // executes before suite starts;
            // can also be called `before` instead of `setup`
        },

        'teardown': function() {
            // executes after suite ends;
            // can also be called `after` instead of `teardown`
        },

        'beforeEach': function(test) {
            // executes before each test
        },

        'afterEach': function(test) {
            // executes after each test
        },

        'Test foo': function() {
            // a test case
        },

        'Test bar': function() {
            // another test case
        },

        'passing test': function() {
            var result = 2 + 3;

            assert.equal(result, 5,
                'Addition operator should add numbers together');
        }/*,
        'failing test': function() {
            var result = 2 * 3;

            assert.equal(result, 5,
                'Addition operator should add numbers together');
        }*/
    });
});
