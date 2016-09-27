/* eslint-disable global-require,no-unused-vars */
'use strict';
module.exports = function(grunt) {
    const path = require('path');
    const jscpd = require('./build/util/jscpd');
    const gitHub = require('./build/util/github-release');

    const buildType = grunt.option('buildType');

    const runsOnTeamcity = grunt.option('teamcity') || false;

    require('time-grunt')(grunt);
    require('load-grunt-config')(grunt, {
        // path to task.js files, defaults to grunt dir
        'configPath': path.join(process.cwd(), 'build'),

        // auto grunt.initConfig
        'init': true,

        // data passed into config.  Can use with <%= test %>
        'data': {
            'test': false
        },

        // can optionally pass options to load-grunt-tasks.
        // If you set to false, it will disable auto loading tasks.
        'loadGruntTasks': {
            'pattern': ['grunt-*'],
            'config': require('./package.json'),
            'scope': 'devDependencies'
        },

        // can post process config object before it gets passed to grunt
        'postProcess': config => {
            if (runsOnTeamcity && config.eslint) {
                config.eslint.options = config.eslint.options || {};
                config.eslint.options.format = require.resolve('eslint-teamcity');
            }

            grunt.loadNpmTasks('intern');
            config.nsp = {
                'package': grunt.file.readJSON('package.json')
            };
        },

        // allows to manipulate the config object before it gets merged with the data object
        'preMerge': (config, data) => {}
    });

    grunt.registerTask('printConfig', 'Print out Grunt configuration', () =>
        grunt.log.writeln(JSON.stringify(grunt.config(), null, 2))
    );

    grunt.registerTask('jscpd', 'Validate files with jscpd', () => jscpd.run(runsOnTeamcity));

    grunt.registerTask('githubRelease', 'Create GitHub Release', function() { // do not use an arrow function due to 'this'
        const done = this.async(); // eslint-disable-line no-invalid-this
        gitHub.publishRelease({
            'gruntLog': grunt.log,
            'preRelease': buildType !== 'release',
            'asset': grunt.option('assetFile'),
            'buildNo': grunt.option('buildNo'),
            'buildId': grunt.option('buildId'),
            'callback': done
        });
    });
};
