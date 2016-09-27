/* eslint-disable */

'use strict';
module.exports = function(grunt, options) {
    var buildType = grunt.option('buildType');
    var buildVersion = grunt.option('buildVersion');
    var buildNo = grunt.option('buildNo');
    var teamcity = grunt.option('teamcity') || false;
    process.env.buildType = buildType;
    process.env.buildVersion = buildVersion;

    var testHttpPort = grunt.option('webService');
    var testHttpsPort = grunt.option('secureWebService');
    process.env.testHttpPort = testHttpPort;
    process.env.testHttpsPort = testHttpsPort;
    var testDomain = grunt.option('testDomain');
    var testPath = grunt.option('testPath');
    process.env.testDomain = testDomain;
    process.env.testPath = testPath;

    // TODO: reenable eslint and nsp
    var tasks = ['teamcity', 'node_version', 'jscpd', 'eslint', 'intern:unitTest'/*, 'nsp'*/];

    if (teamcity) {
        tasks.push('githubRelease');
    }

    // computation...
    return {
        'tasks': ['availabletasks'],
        'default': tasks, // tasks run if "grunt" is called without specific goal
        'ci': tasks, // tasks run by TeamCity
        'test': [
            'node_version',
            'intern:unitTest'
        ]
    };
};
