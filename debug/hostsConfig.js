'use strict';

/**
 * Updates the hosts file configuration automagically.
 *
 * User: jmollner
 * Date: 31/01/16
 */

// this is a CLI tool, so allow process exits
/* eslint-disable no-process-exit */

const path = require('path');
const util = require('./util');
const logger = require(path.join(__dirname, '../src/base/logger'))('hostsFile');
const hostile = require('hostile');

const localhostIp = '127.0.0.1';
const dev${artifactId}Domain = '${artifactId}.dev.lprnd.net';

process.stdin.resume(); // so the program will not close instantly

const exitHandler = (options, err) => {
    if (options.cleanup) hostile.remove(localhostIp, dev${artifactId}Domain);
    if (err) logger.error(err.stack);
    if (options.exit) process.exit();
};

module.exports.init = () => {
    if (!util.isPrivileged()) {
        logger.error('Modifying the hosts file requires root/admin privileges!');
        process.exit(-1);
    }

    hostile.set(localhostIp, dev${artifactId}Domain);

    // do something when app is closing
    process.on('exit', exitHandler.bind(null, {'cleanup': true}));
    // catches ctrl+c event and exit normally via exit event
    process.on('SIGINT', exitHandler.bind(null, {'exit': true}));
    // catches uncaught exceptions and exit normally via exit event
    process.on('uncaughtException', exitHandler.bind(null, {'exit': true}));
};
