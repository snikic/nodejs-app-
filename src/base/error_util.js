'use strict';

/**
 * Error related utility methods.
 *
 * User: jmollner
 * Date: 26/04/16
 */

const errno = require('errno');
const HttpStatus = require('http-status');

module.exports = {
    'prettyPrint': (err, includeStack) => {
        let str = err.errno ? `${err.errno}: ` : '';
        // if it's a libuv error then get the description from errno
        const errDetails = errno.errno[err.errno];
        if (errDetails) {
            str += errDetails.description;
        } else {
            str += err.message;
        }

        // if it's a "fs" error then we will also add also the  "path" property
        if (err.path) {
            str += ` [path=${err.path}]`;
        }

        if (err.syscall) {
            str += ` [system_call=${err.syscall}]`;
        }

        // http errors/exceptions
        if (err.status || err.statusCode) {
            const status = err.status || err.statusCode;
            str += ` [status=${status};${HttpStatus[status]}]`;
        }

        if (includeStack && err.stack) {
            str += `\n${err.stack}`;
        }

        return str;
    }
};
