'use strict';

/**
 * Proxies requests to CSDS services.
 *
 * User: jmollner
 * Date: 11/03/16
 */

const httpProxy = require('http-proxy');
const HttpStatus = require('http-status');
const dnsErrors = require('dnserrors');
const metrics = require('prom-client');
const proxyAgent = require('./proxy_agent').httpsAgent;
const analytics = require('./analytics');
const proxyStatus = new metrics.Counter('${artifactId}_proxy_status', 'Tracks the status of requests/responses via the ${artifactId} proxy', ['success', 'upstream']);
const loginCounter = new metrics.Counter('${artifactId}_login_total', 'The number of logins per accountId (track ${artifactId} usage)', ['account']);
const url = require('url');
const bodyParser = require('body-parser').urlencoded({'extended': true});

const errorUtil = require('./error_util');
const config = require('./config');
const logger = require('./logger')('proxy');

const dataCenter = config.getDataCenter();
const csdsName = config.get('csdsName'); // ${artifactId} csds name

const CsdsClient = require('./csds');
const csdsInstance = new CsdsClient(config.get('csds'));

const liveEngageCsdsDomain = 'liveEngage';

const isDeployed = config.isDeployed();

const verboseLogging = false;

const _reportProxyStatus = (req, httpCode) => {
    const httpSuccess = httpCode >= HttpStatus.OK && httpCode < HttpStatus.BAD_REQUEST;
    proxyStatus.inc({
        'success': httpSuccess,
        'upstream': req.params.csds || 'url-via-fetchify'
    });
    if (req.loginAttempt === true) {
        analytics.createVisitor(req).event('login', httpSuccess ? 'success' : 'failure').send();
    }
};

const errorHandler = (err, req, res, next) => {
    // sets the response status code and adds/merges the provided headers
    const error = dnsErrors(err);

    if (!error.status) error.status = error.statusCode = HttpStatus.BAD_GATEWAY;

    res.setHeader('x-proxy-error-details', errorUtil.prettyPrint(error));
    res.setHeader('x-proxy-upstream-status', 'error');
    if (error.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        if (!res.headersSent) {
            res.setHeader('x-proxy-error-message', '${artifactId} proxy failed to perform request (server side exception)! Reason could '
                + 'be e.g. network or farm issues, invalid/illegal requests, problems with the target/upstream service or within ${artifactId}, '
                + 'etc. See details for more information.');
            res.setHeader('x-proxy-server-status', 'error');
        }
        // the exception is not necessarily fatal (in other words, we don't know it), so we set it to false
        analytics.createVisitor(req)
            .exception(`proxy-error: ${JSON.stringify(error)}`, false).send();
    }

    if (isDeployed) {
        // only report errors to analytics when we run in QA or production (i.e. not locally)
        analytics.createVisitor(req)
            .event('proxy', `error_${JSON.stringify(error)}`).send();
    }

    _reportProxyStatus(req, error.status);

    return next(error);
};

const createProxy = /* LP farm */ internal => {
    const isDebug = config.isDebug();

    const options = {
        'xfwd': false, // do not add x-forwarded headers
        'secure': !isDebug, // do not verify SSL certs (when in debug); otherwise verify
        'changeOrigin': true // updates the host header accordingly (prevents "Hostname/IP doesn't match certificate's altnames" issues in GA)
    };

    if (!internal && config.requiresProxy()) { // not the 'proxy' in this class, but the "LP Http Production Proxy"
        // options.toProxy = true; // passes the absolute URL as the path (useful for proxying to proxies)
        options.agent = proxyAgent; // object to be passed to http(s).request
    }

    const _proxy = httpProxy.createProxyServer(options);
    _proxy.on('proxyRes', (proxyRes, req, res) => {
        // do not use 'res.writeHead' or 'res.end' in this method, else the proxy will fail to write further headers...
        if (proxyRes.statusCode >= HttpStatus.BAD_REQUEST) {
            // the upstream server return with status code >= 400; so this is not an error of ${artifactId} (or it's proxy)
            // but an error of the upstream itself
            if (!res.headersSent) {
                res.setHeader('content-type', 'text/plain');
                res.setHeader('x-proxy-error-message', '${artifactId} proxy is working as expected, but the request to the upstream/csds service failed!');
                res.setHeader('x-proxy-upstream-error-code', proxyRes.statusCode);
                res.setHeader('x-proxy-upstream-error-message', proxyRes.statusMessage);
                res.setHeader('x-proxy-server-status', 'ok');
                res.setHeader('x-proxy-upstream-status', 'error');
                // res.status(HttpStatus.BAD_GATEWAY); // keep the original statusCode!!!
            }

            logger.debug(`Proxy is working as expected, but the request to the upstream/csds service '${req.sanitize('csds').trim()}'`
                + ` failed. Upstream statusCode/message: ${proxyRes.statusCode}/${proxyRes.statusMessage}`);

            if (verboseLogging) {
                logger.debug(`RAW Response from the target: ${proxyRes.statusCode}`
                    + ` - '${proxyRes.statusMessage}'\n${JSON.stringify(proxyRes.headers, true, 2)}`);
            }
        }

        _reportProxyStatus(req, proxyRes.statusCode);
    });

    _proxy.on('end', (req, res, proxyRes) => {
        // TODO
    });

    _proxy.on('proxyReq', (proxyReq, req, res) => {
        // TODO: should we really add the auth header to each internal request?
        if (internal === true) {
            if (typeof req.header('authorization') !== 'string') {
                const bearer = req.sanitize('token').trim();
                if (bearer) proxyReq.setHeader('Authorization', `Bearer ${bearer}`);
            }

            try {
                // add csds name of ${artifactId} to the request as header, so the target/upstream services know the source of the request
                proxyReq.setHeader('x-source-proxy', csdsName);
            } catch (err) {
                // https://github.com/nodejitsu/node-http-proxy/issues/986
                // https://github.com/nodejitsu/node-http-proxy/issues/867
                // https://github.com/nodejitsu/node-http-proxy/issues/908
                // https://github.com/nodejitsu/node-http-proxy/issues/930
                logger.debug(`(trace) Failed to set 'x-source-proxy' header: ${JSON.stringify(err)}`);
            }
        }

        // TODO: remove 'account', 'user', 'token' from request (body (if present) and header)

        // marker to identify on client/browser side if the request was proxied
        if (!res.headersSent) res.setHeader('x-proxy', 'true');

        const reqMethod = req.sanitize('method').trim();
        proxyReq.method = reqMethod ? reqMethod : 'GET';
    });

    return _proxy;
};

// proxy to be used for http(s) requests within the LP farm
const internalProxy = createProxy(true); // supports http and https
// proxy to be used for https requests targeting servers/services outside of the LP farm
const externalProxy = createProxy(false); // supports only https (security)

const csdsProxy = gateKeeperMiddleware => {
    return (req, res, next) => bodyParser(req, res, err => { // TODO: do we need the body parser here? we don't do it for the fetchProxy
        if (err) return next(err);

        return gateKeeperMiddleware(req, res, err2 => {
            if (err2) return next(err2);

            // already run through "expressValidator" via "gateKeeperMiddleware", so it can be reused

            // to improve security of parameters!
            if (req.method !== 'POST') {
                return next(new Error('Proxy allows only POST! Use the optional "method" parameter '
                    + 'to specify the HTTP method which should be used during proxying the request (default GET).'));
            }

            req.check('csds').notEmpty();
            if (req.validationErrors()) {
                res.status(HttpStatus.BAD_REQUEST).send('Invalid or missing CSDS input.');
                return next(new Error('Invalid proxy request!'));
            }
            const siteId = req.sanitize('account').trim();
            const csds = req.sanitize('csds').trim();

            return csdsInstance.get(siteId, csds, (err3, domain) => {
                if (err3) return next(err3);

                // provide information about the proxy request back to the client
                res.setHeader('x-proxy-upstream-url', req.url);
                res.setHeader('x-proxy-upstream-csds', csds);
                res.setHeader('x-proxy-upstream-domain', domain);

                return internalProxy.web(req, res, {
                    // always use HTTPS to improve security
                    'target': `https://${domain}`
                }, err4 => errorHandler(err4, req, res, next));
            });
        });
    });
};

const fetchProxy = gateKeeperMiddleware => {
    return (req, res, next) => gateKeeperMiddleware(req, res, err => {
        if (err) return next(err);

        const fetchUrl = url.parse(decodeURIComponent(req.params[0]));
        const domain = `${fetchUrl.protocol}//${fetchUrl.host}`;

        req.url = fetchUrl.path;
        req.params.method = req.method;

        res.setHeader('x-proxy-upstream-domain', fetchUrl.host);
        res.setHeader('x-proxy-upstream-url', req.url);

        const proxy = req.external === true
            ? externalProxy
            : internalProxy;

        return proxy.web(req, res, {
            'target': domain
        }, err2 => errorHandler(err2, req, res, next));
    });
};

const analyticsProxy = gateKeeperMiddleware => {
    const _proxyMiddleware = fetchProxy(gateKeeperMiddleware);
    return (req, res, next) => {
        req.skipGatekeeper = true;

        // normalize for analytics
        req.siteId = req.query.cd2; // custom dimension 2 contains the siteId
        req.clientId = req.query.cid;
        req.userId = req.query.uid;

        // mark as request as external, since we want to communicate with the "outside" internet
        req.external = true;

        // prepare fetch
        const path = req.url.replace('/proxy/analytics', '');
        req.params[0] = `https://www.google-analytics.com${path}`;

        return _proxyMiddleware(req, res, next);
    };
};

const loginProxy = gateKeeperMiddleware => {
    const _proxyMiddleware = csdsProxy(gateKeeperMiddleware);

    return (req, res, next) => {
        // the proxy usually requires authentication, but requests via lp-authentication
        // do not need gatekeeper authentication
        req.skipGatekeeper = true;

        if (req.method === 'POST') {
            // POST calls are logins (create a session)
            loginCounter.inc({'account': req.params.account});
            req.loginAttempt = true;
        }

        // normalize for analytics
        req.siteId = req.params.account;

        // save the original method
        req.params.method = req.method;
        // the proxy usually only allows post methods, so set it to post
        req.method = 'POST';

        req.url = req.baseUrl + req.url;
        req.baseUrl = `/proxy/${liveEngageCsdsDomain}`;
        req.params.csds = liveEngageCsdsDomain;

        res.setHeader('x-data-center', dataCenter);
        return _proxyMiddleware(req, res, next);
    };
};

module.exports = {
    analyticsProxy,
    csdsProxy,
    fetchProxy,
    loginProxy
};
