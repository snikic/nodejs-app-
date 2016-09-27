'use strict';

/**
 * Runs the jscpd task.
 *
 * User: jmollner
 * Date: 18/05/16
 */

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const Jscpd = require('jscpd');

module.exports.run = runsOnTeamcity => {
    const runsOnTC = runsOnTeamcity || false;
    // sync file access for simplicity; this code is only executed during build time anyway
    const config = yaml.safeLoad(fs.readFileSync(path.join(__dirname, '..', 'jscpd.yaml'), 'utf8')); // eslint-disable-line no-sync

    if (runsOnTC && config) {
        config.reporter = path.join(__dirname, 'jscpd_teamcity_reporter');
        config.output = 'dist/duplicates-report.log';
    }

    const instance = new Jscpd();
    instance.run(config);
};
