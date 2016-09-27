'use strict';

/**
 * Wrap the analytics/reporting npm dependency to fix/extend stuff.
 *
 * User: jmollner
 * Date: 22/08/16
 */

const path = require('path');

const config = require('./config');
const agent = require('./proxy_agent').httpsAgent; // do not rename!
const logger = require('./logger')('analytics');
const requiresProxy = config.requiresProxy();

const ua = requiresProxy
    ? require('rewire')(path.join(path.dirname(require.resolve('universal-analytics')), 'lib', 'index.js'))
    : require('universal-analytics');

// some ugly fix to enable proxy support in the 'universal-analytics' module
if (requiresProxy) {
    // eslint-disable-next-line global-require
    const request = require('request').defaults({agent});
    ua.__set__('request', request);
    logger.info(`Proxy enabled for external requests. Using: ${config.get('proxy')}`);
}

const handler = fn => {
    return err => {
        if (err) logger.warn(`Failed to send analytics! Details: ${JSON.stringify(err)}`);
        if (fn) fn(err);
    };
};

// workaround until:
// https://github.com/peaksandpies/universal-analytics/issues/34
// https://github.com/peaksandpies/universal-analytics/pull/35
class ContextVisitor extends ua.Visitor {
    _withContext(context) {
        // this._context is never null, see Visitor constructor
        const ctx = Object.assign({}, this._context, context || {});

        // adopted from super method
        const visitor = new ContextVisitor(this.tid, this.cid, this.options, ctx);
        visitor._queue = this._queue;
        return visitor;
    }

    _enqueue(type, params, fn) {
        const parameter = typeof params === 'function' ? {} : params;
        const func = typeof params === 'function' ? params : fn;

        // this._context is never null, see Visitor constructor
        return super._enqueue(type, Object.assign({}, this._context, parameter), handler(func));
    }
}

module.exports.Visitor = ContextVisitor;
