'use strict';

/**
 * Allows to log messages via the LP logger. This is the internal logger version.
 * Usually the "logger.js" should be used instead. This file is mainly of interest
 * to support logging when the config is not completely loaded yet (i.e. logging
 * in the config.js file).
 *
 * User: jmollner
 * Date: 02/12/15
 */

const logger = require('lp_js_logger');

// the number of different loggers (by loggerName)
require('events').EventEmitter.defaultMaxListeners = 15;

module.exports = (config, loggerName) => {
    return logger.getLogger({
        'name': 'system',
        'context': loggerName || 'default',
        'configJSON': config.get('logger')
    });
};
