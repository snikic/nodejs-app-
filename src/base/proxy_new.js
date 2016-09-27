// 'use strict';
//
// /**
//  * Proxies requests to CSDS services.
//  *
//  * User: jmollner
//  * Date: 11/03/16
//  */
//
// const httpProxy = require('http-proxy');
// const HttpStatus = require('http-status');
//
// const errorUtil = require('./error_util');
// const config = require('./config');
// const logger = require('./logger')('proxy');
//
// const csdsName = config.get('csdsName'); // ${artifactId} csds name
//
// const CsdsClient = require('lp-js-csds-client');
// const csdsInstance = new CsdsClient(config.get('csds'));
//
// const verboseLogging = false;
//
// const proxy = () => {
//     const isDebug = config.isDebug();
//
//     const _proxy = httpProxy.createProxyServer({
//         'xfwd': false, // do not add x-forwarded headers
//         'secure': !isDebug, // do not verify SSL certs (when in debug); otherwise verify
//         'changeOrigin': true // updates the host header accordingly (prevents "Hostname/IP doesn't match certificate's altnames" issues in GA)
//     });
//     _proxy.on('error', (err, req, res) => {
//         // sets the response status code and adds/merges the provided headers
//         const errorString = errorUtil.prettyPrint(err);
//         res.writeHead(HttpStatus.INTERNAL_SERVER_ERROR, {
//             'content-type': 'text/plain',
//             'x-proxy-error-message': '${artifactId} proxy failed to perform request (server side exception)! Reason could '
//             + 'be e.g. network or farm issues, problems within ${artifactId}, etc. See details for more information.',
//             'x-proxy-error-details': errorString
//         });
//
//         logger.error(`Failed to perform proxy request to CSDS service: ${req.sanitize('csds').trim()}. Error: ${errorString}`);
//
//         res.end('Something went wrong while proxying the request.');
//     });
//     _proxy.on('proxyRes', (proxyRes, req, res) => {
//         // do not use 'res.writeHead' or 'res.end' in this method, else the proxy will fail to write further headers...
//         if (proxyRes.statusCode >= HttpStatus.BAD_REQUEST) {
//             // the upstream server return with status code >= 400; so this is not an error of ${artifactId} (or it's proxy)
//             // but an error of the upstream itself
//             res.setHeader('content-type', 'text/plain');
//             res.setHeader('x-proxy-error-message', '${artifactId} proxy is working as expected, but the request to the upstream/csds service failed!');
//             res.setHeader('x-proxy-upstream-error-code', proxyRes.statusCode);
//             res.setHeader('x-proxy-upstream-error-message', proxyRes.statusMessage);
//             res.status(HttpStatus.BAD_GATEWAY);
//
//             logger.debug(`Proxy is working as expected, but the request to the upstream/csds service '${req.sanitize('csds').trim()}'`
//                 + ` failed. Upstream statusCode/message: ${proxyRes.statusCode}/${proxyRes.statusMessage}`);
//
//             if (verboseLogging) {
//                 logger.debug(`RAW Response from the target: ${proxyRes.statusCode}`
//                     + ` - '${proxyRes.statusMessage}'\n${JSON.stringify(proxyRes.headers, true, 2)}`);
//             }
//         }
//     });
//
//     _proxy.on('end', (req, res, proxyRes) => {
//         // TODO
//     });
//
//     _proxy.on('proxyReq', (proxyReq, req) => {
//         const bearer = req.sanitize('account').trim();
//         if (bearer) proxyReq.setHeader('Authorization', `Bearer ${bearer}`);
//
//         // TODO: remove 'account', 'user', 'token' from request
//
//         // add csds name of ${artifactId} to the request as header, so the target/upstream services know the source of the request
//         proxyReq.setHeader('x-source-proxy', csdsName);
//
//         const reqMethod = req.sanitize('method').trim();
//         proxyReq.method = reqMethod ? reqMethod : 'GET';
//     });
//
//     return _proxy;
// };
//
// const middleware = (req, res, next) => {
//     // already run through "expressValidator" via "gateKeeperMiddleware", so it can be reused
//
//     req.check('csds').notEmpty();
//     if (req.validationErrors()) {
//         res.status(HttpStatus.BAD_REQUEST).send('Invalid or missing CSDS input.');
//         return next(new Error('Invalid proxy request!'));
//     }
//     const siteId = req.sanitize('account').trim();
//     const csds = req.sanitize('csds').trim();
//
//     // param[0] contains the path/url following the proxy request: /api/proxy/<csds>/<url>
//     //req.url = req.params[0]
//     //    ? `/${req.params[0]}`
//     //    : req.url;
//     //req.url = req.baseUrl + req.url;
//     //req.baseUrl = '/';
//
//     return csdsInstance.get(siteId, csds, (err2, domain) => {
//         if (err2) return next(err2);
//
//         // provide information about the proxy request back to the client
//         res.setHeader('x-proxy-upstream-url', req.url);
//         res.setHeader('x-proxy-upstream-csds', csds);
//         res.setHeader('x-proxy-upstream-domain', domain);
//
//         return proxy.web(req, res, {
//             // always use HTTPS to improve security
//             'target': `https://${domain}`
//         });
//     });
// };
//
// module.exports = middleware;
