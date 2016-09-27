'use strict';

/**
 * Error handling for express.
 *
 * User: jmollner
 * Date: 13/01/15
 */

const logger = require('./logger')('errorHandling');
const analytics = require('./analytics');
const HttpStatus = require('http-status');
const xssFilters = require('xss-filters');

const config = require('./config');

module.exports = {
    'notFoundHandler': () => {
        return (err, req, res, next) => {
            if (err && res.statusCode !== HttpStatus.NOT_FOUND) return next(err);

            const notFoundError = new Error('Not Found');
            notFoundError.status = HttpStatus.NOT_FOUND;
            notFoundError.message = `resource not found: ${req.method}:${req.path}`;
            return next(notFoundError);
        };
    },
    'logErrorHandler': () => {
        const isDeployed = config.isDeployed();
        return (err, req, res, next) => {
            logger.error(err.message ? err.message : err);
            // only report errors to analytics when we run in QA or production (i.e. not locally)
            if (isDeployed) analytics.createVisitor(req).exception(`server-start-error: ${JSON.stringify(err)}`, false).send();
            return next(err);
        };
    },
    'reportErrorHandler': () => {
        const isDebug = config.isDebug();
        return (err, req, res, next) => {
            res.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR);
            const data = {
                'status': 'error',
                'error': xssFilters.inHTMLData(err.status),
                'message': xssFilters.inHTMLData(err.message)
            };

            if (isDebug && err.stack) {
                // include stack trace only during dev time
                // (since this data is reported back to the client)
                data.trace = xssFilters.inHTMLData(err.stack);
                if (err.details) data.details = xssFilters.inHTMLData(err.details);
            }

            if (res.headersSent) {
                return next(err);
            }

            // if we not already sent the (error) request back to the client...
            return res.send(req.xhr || req.get('X-Requested-With') === 'fetch'
                ? data // return json if the request is done by XMLHttpRequest or the FetchAPI
                : `<pre style="white-space:pre-wrap;word-wrap:break-word;">${JSON.stringify(data, null, 2)}</pre>`
            );
        };
    }
};
