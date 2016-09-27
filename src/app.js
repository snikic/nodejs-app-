'use strict';

/**
 * Starting point of the app.
 *
 * User: jmollner
 * Date: 14/10/15
 */

if (process.getuid && process.getuid() === 0) {
    throw new Error('${artifactId} should not be run with superuser privileges '
        + '(e.g. sudo/root) to improve security!');
}

const config = require('./base/config');

const analytics = require('./base/analytics');
const prettyPrint = require('./base/error_util').prettyPrint;
const logger = require('./base/logger')('app');

const isDeployed = config.isDeployed();

if (isDeployed) {
    // https://nodejs.org/api/process.html#process_event_uncaughtexception
    process.on('uncaughtException', err => {
        // catch for logging purposes
        analytics.getVisitor().exception(`uncaught-node-process-exception: ${prettyPrint(err, true)}`, true).send();
        logger.error('Fatal uncaught exception. Node process will be stopped!');
        // intentionally rethrow to crash the node process; it's not safe to resume the process (see also link above)
        throw err;
    });
}
process.on('unhandledRejection', (reason, promise) => {
    if (isDeployed) analytics.getVisitor().exception(`unhandled-promise-rejection: promise: ${promise}; reason: ${reason}`, false).send();
    logger.warn(`Unhandled rejection for promise: ${promise}. Reason: ${reason}`);
});

logger.info(`Debug mode is ${config.isDebug() ? 'enabled' : 'disabled'}!`);
logger.info('Starting project...');
require('./base/server').start();
