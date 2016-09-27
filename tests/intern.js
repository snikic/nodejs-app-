'use strict';

// https://theintern.github.io/intern/#configuration
define({
    'capabilities': {
        'selenium-version': '2.48.0',
        'idle-timeout': 30
    },

    // Browsers to run integration testing against. Note that version numbers must be strings if used with Sauce
    // OnDemand. Options that will be permutated are browserName, version, platform, and platformVersion; any other
    // capabilities options specified for an environment will be copied as-is
    'environments': [
        {browserName: 'internet explorer', version: '11', platform: 'WIN8'},
        {browserName: 'internet explorer', version: '10', platform: 'WIN8'},
        {browserName: 'internet explorer', version: '9', platform: 'WINDOWS'},
        {browserName: 'firefox', version: '37', platform: ['WINDOWS', 'MAC']},
        {browserName: 'chrome', version: '39', platform: ['WINDOWS', 'MAC']},
        {browserName: 'safari', version: '8', platform: 'MAC'}
    ],

    // Maximum number of simultaneous integration tests that should be executed on the remote WebDriver service
    'maxConcurrency': 2,

    'reporters': [
        {'id': 'JUnit', 'filename': './dist/junit_test_report.xml'},
        {'id': 'TeamCity', 'filename': './dist/teamcity_test_report.xml'},
        {'id': 'tests/support/CustomPretty'},
        {'id': 'tests/support/CustomLcovHtml', 'directory': './dist/coverage'}
    ],

    // Non-functional/unit test suite(s) to run in each browser
    'suites': ['tests/unit/all'],

    // Functional test suite(s) to execute against each browser once non-functional tests are completed
    'functionalSuites': ['tests/integration/all'],

    'excludeInstrumentation': /^(?:tests|node_modules)\//
});
