'use strict';

/**
 * A very simple ssl offloader for local debugging/testing purposes.
 *
 * User: jmollner
 * Date: 09/11/15
 */

// this is a CLI tool, so sync calls
/* eslint-disable no-sync */
/* eslint no-magic-numbers: ["warn", { "ignore": [1, 2, 443, 10443] }] */

const fs = require('fs');
const https = require('https');
const httpProxy = require('http-proxy');
const HttpStatus = require('http-status');
const path = require('path');
const util = require('./util');

const logger = require(path.join(__dirname, '../src/base/logger'))('sslOffloader');
const config = require(path.join(__dirname, '../src/base/config'));

const httpsPort = util.isPrivileged() ? 443 : 10443;
const localhost = 'localhost';
const verboseLogging = false;

module.exports.init = function() {
    const httpsOptions = {
        'pfx': fs.readFileSync(path.join(__dirname, 'dev_wildCard.p12')),
        'passphrase': '123'
    };
    httpsOptions.agent = new https.Agent(httpsOptions);

    const proxy = httpProxy.createProxyServer({
        'xfwd': true, // add x-forwarded headers
        'secure': false // do not verify SSL certs
    });
    proxy.on('error', (err, req, res) => {
        res.writeHead(HttpStatus.INTERNAL_SERVER_ERROR, {
            'Content-Type': 'text/plain',
            'X-Exception': err // this is a local sll offloading proxy... no harm in exposing error (stack traces)
        });

        res.end('Something went wrong. Is ${artifactId} locally running?');
    });
    proxy.on('proxyRes', proxyRes => {
        if (verboseLogging && proxyRes.statusCode >= HttpStatus.BAD_REQUEST) {
            logger.debug(`RAW Response from the target: ${proxyRes.statusCode}`
                + ` - '${proxyRes.statusMessage}'\n${JSON.stringify(proxyRes.headers, true, 2)}`);
        }
    });

    const handler = (req, res) => {
        proxy.web(req, res, {
            'target': `http://localhost.dev.lprnd.net:${config.get('server:httpPort')}`
        });
    };

    https.createServer(httpsOptions, handler).listen(httpsPort, localhost);

    if (!util.isPrivileged()) {
        logger.debug(`Please remember to locally forward port ${httpsPort} to 443.`);
    }
    logger.debug(`You can access LP Mission Control via: https://${artifactId}.dev.lprnd.net
         or https://localhost.dev.lprnd.net (can only be accessed via https, not http)`);
};
