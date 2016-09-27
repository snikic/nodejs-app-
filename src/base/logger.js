'use strict';

/**
 * Allows to log messages via the LP logger.
 *
 * User: jmollner
 * Date: 11/11/15
 */

const config = require('./config');
const logger = require('./logger_internal');

module.exports = loggerName => {
    return logger(config, loggerName);
};
