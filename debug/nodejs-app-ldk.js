'use strict';

/**
 * The ${artifactId} Local Development Kit (LDK), which simplifies the local development
 * by automating the following steps:
 * - Provide SSL offloading (usually done by Nginx if ${artifactId} is deployed on servers)
 * - Provide a reverse proxy to create LiveEngage sessions (usually done by Nginx if ${artifactId} is deployed on servers)
 * - Port forwarding
 * - Adding the '${artifactId}.dev.lprnd.net-->127.0.0.1' mapping to the hosts file
 * - ...
 *
 * You must run the LDK with root/admin permissions!
 *
 * User: jmollner
 * Date: 30/01/16
 */

// this is a CLI tool, so allow process exits
/* eslint-disable no-process-exit */

const path = require('path');
const configFile = require('./configFile');
const sslOffloading = require('./sslOffloading');
const hostsConfig = require('./hostsConfig');
const util = require('./util');

util.setLogLevel('info'); // set log level before we call the first time the logger

const logger = require(path.join(__dirname, '../src/base/logger'))('${artifactId}-ldk');

logger.info('Welcome to the ${artifactId} Local Development Kit (LDK).');
logger.info('Please also make sure that you are withing the LP network or connected via VPN!');

if (!util.isPrivileged()) {
    logger.error('Please run the ${artifactId} LDK with root/admin permissions '
        + '(use "sudo" or "root" on OSX and Linux; on Windows, run the script '
        + 'on a command promt with admin privileges)!');
    process.exit(-1);
}

configFile.check();
sslOffloading.init();
logger.info('SSL offloading and reverse proxy started.');
hostsConfig.init();
logger.info('Configured "hosts" file.');
logger.info('LDK started. Please keep the LDK running while working locally. And finally, keep calm and code on :)');
