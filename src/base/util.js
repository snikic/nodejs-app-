'use strict';

const net = require('net');
const dnsErrors = require('dnserrors');

module.exports = {
    // small helper, due to the fact that path parameter aren't available
    // in sub-routers; see e.g.:
    // https://github.com/expressjs/express/issues/1881
    'paramExtract': param => {
        return (req, res, next) => {
            if (req.params[param]) {
                req.params2 = req.params2 || {};
                req.params2[param] = req.params[param];
            }
            return next();
        };
    },
    'chainMiddleware': middlewares => {
        return (req, res, next) => {
            if (!Array.isArray(middlewares)) return next();

            const _createNext = (middleware, i) => {
                return err => {
                    if (err) return next(err);

                    const nextIndex = i + 1;
                    const nextMiddleware = middlewares[nextIndex]
                        ? _createNext(middlewares[nextIndex], nextIndex)
                        : next;
                    try {
                        return middleware(req, res, nextMiddleware);
                    } catch (ex) {
                        return next(ex);
                    }
                };
            };
            return _createNext(middlewares[0], 0)();
        };
    },
    'acceptsMiddleware': acceptMimeType => {
        if (typeof acceptMimeType !== 'string') throw new TypeError(`The 'acceptMimeType' parameter must be of type 'string' but was '${typeof acceptMimeType}'.`);
        return (req, res, next) => {
            // http://stackoverflow.com/q/11805371
            if (req.accepts(acceptMimeType)) return next();
            return next('route');
        };
    },
    // returns promise
    'testConnection': (hostname, port, connectTimeout) => {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();

            const host = hostname.split(':')[0]; // remove port from host if present

            const success = false;
            const output = {success, host, port};

            const doReturn = (err, data) => {
                // intentionally fall through for the callback
                if (err) {
                    err.data = data;
                    return reject(err);
                }
                return resolve(data);
            };

            socket.connect(port, host);
            socket.setTimeout(connectTimeout);

            // connection success -> return 'true'
            socket.on('connect', () => {
                socket.destroy();
                output.success = true;
                return doReturn(null, output);
            });

            // connection error -> return error
            socket.on('error', err => {
                socket.destroy();
                output.socketError = 'error';
                return doReturn(dnsErrors(err), output);
            });

            // connection timeout -> return error
            socket.on('timeout', err => {
                socket.destroy();
                output.socketError = 'timeout';
                return doReturn(dnsErrors(err), output);
            });
        });
    }
};
