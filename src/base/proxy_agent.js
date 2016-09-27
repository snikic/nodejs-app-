'use strict';

/**
 * A node HTTP(S) agent implementation which uses the LP HTTP proxy in production
 *
 * User: jmollner
 * Date: 23/08/16
 */

const url = require('url');
const agents = require('tunnel-agent');

const config = require('./config');

const proxy = url.parse(config.get('proxy'));

const create = func => {
    const proxyConfig = {
        'proxy': {
            'host': proxy.hostname,
            'port': proxy.port
        }
    };
    return config.requiresProxy()
        ? func(proxyConfig)
        : null;
};

const httpAgent = create(agents.httpOverHttp);
const httpsAgent = create(agents.httpsOverHttp);

module.exports = {
    httpAgent,
    httpsAgent
};
