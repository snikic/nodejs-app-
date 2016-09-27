'use strict';

define(function(require) {
    var registerSuite = require('intern!object');
    var assert = require('intern/chai!assert');
    var HttpStatus = require('intern/dojo/node!http-status');
    var requestRetry = require('intern/dojo/node!requestretry');

    var testDomain;
    var testPath;
    var testHttpPort;
    var testHttpsPort;

    var maxAttempts = 15;
    var retryDelay = 5000;

    registerSuite({
        'name': 'k8s post deployment checks',

        'setup': function() {
            testDomain = process.env.testDomain || 'localhost.dev.lprnd.net';
            testPath = process.env.testPath || '/';
            testHttpPort = process.env.testHttpPort || 80;
            testHttpsPort = process.env.testHttpsPort || 443;
        },

        'teardown': function() {
            testHttpPort = null;
            testHttpsPort = null;
        },

        'podsHttpTest': function() {
            var deferred = this.async(maxAttempts * retryDelay + 5000);
            console.log('Checking: http://' + testDomain + ':' + testHttpPort + testPath);
            requestRetry({
                uri: 'http://' + testDomain + ':' + testHttpPort + testPath,
                port: testHttpPort,
                method: 'GET',
                headers: [
                    {
                        name: 'accept',
                        value: '*/*'
                    }
                ],
                followRedirect: false,
                maxAttempts: maxAttempts,
                retryDelay: retryDelay,
                retryStrategy: requestRetry.RetryStrategies.HTTPOrNetworkError // (default) retry on 5xx or network errors
            }, function(err, response, body) {
                // this callback will only be called when the request succeeded or after maxAttempts or on error
                if (err) {
                    deferred.reject(err);
                }
                if (response) {
                    assert.strictEqual(response.statusCode, HttpStatus.MOVED_PERMANENTLY,
                        'HTTP should be redirect to HTTPS via status code 301');
                    assert.match(response.headers.location, /^https:\/\//,
                        'HTTP location header should redirect to https');
                    console.log('Success at the ' + response.attempts + '. of maximal ' + maxAttempts + ' attempts.');
                    deferred.resolve();
                } else {
                    deferred.reject(new Error('Unknown error!'));
                }
            });
        },

        'podsHttpsTest': function() {
            var deferred = this.async(maxAttempts * retryDelay + 5000);
            console.log('Checking: https://' + testDomain + ':' + testHttpsPort + testPath);
            requestRetry({
                uri: 'https://' + testDomain + ':' + testHttpsPort + testPath,
                port: testHttpsPort,
                method: 'GET',
                headers: [
                    {
                        name: 'accept',
                        value: '*/*'
                    }
                ],
                followRedirect: false,
                maxAttempts: maxAttempts,
                retryDelay: retryDelay,
                retryStrategy: requestRetry.RetryStrategies.HTTPOrNetworkError // (default) retry on 5xx or network errors
            }, function(err, response, body) {
                // this callback will only be called when the request succeeded or after maxAttempts or on error
                if (err) {
                    deferred.reject(err);
                }
                if (response) {
                    assert.strictEqual(response.statusCode, HttpStatus.OK,
                        'HTTPS should respond with status code 200');
                    console.log('Success at the ' + response.attempts + '. of maximal ' + maxAttempts + ' attempts.');
                    deferred.resolve();
                } else {
                    deferred.reject(new Error('Unknown error!'));
                }
            });
        }
    });
});
