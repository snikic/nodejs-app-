'use strict';

/**
 * The web server of this project.
 *
 * User: jmollner
 * Date: 11/11/15
 */

// some security background/information in the context of nodeJS
// https://speakerdeck.com/ckarande/top-overlooked-security-threats-to-node-dot-js-web-applications

const config = require('./config');
const errorHandling = require('./error_handling');
const logger = require('./logger')('server');

const security = require('./security');
const analytics = require('./analytics');
const path = require('path');
const jsrender = require('jsrender');
const xssFilters = require('xss-filters');

const isDebug = config.isDebug();
const isDeployed = config.isDeployed();

const gatekeeperMiddleware = require('./gatekeeper_middleware').validateGateKeeper(true);
const proxy = require('./proxy');
const csdsProxy = proxy.csdsProxy(gatekeeperMiddleware);
const analyticsProxy = proxy.analyticsProxy(gatekeeperMiddleware);
const loginProxy = proxy.loginProxy(gatekeeperMiddleware);
const fetchProxy = proxy.fetchProxy(gatekeeperMiddleware);

// TODO: const loginRouter = require('./login_router');
const serverRouter = require('./server_router');
const authRouter = require('./auth_router');
const moduleRouter = require('./module_router');
const apiRouter = require('./api_router');
const coreRouter = require('./core_router');

const app = require('express')()
    // put the metrics and health APIs at the beginning, so we don't enforce authentication etc. (it's anyway blocked by Nginx for external traffic)
    // expose server/service metrics to Prometheus
    .use(serverRouter())
    // adding 'base' security header which should be added to all requests (i.e. all request verbs and all static and dynamic resources)
    .use(security.baseSecurity())
    // Authentication related parts, e.g. redirect to login service or extracting the siteID from the request (if available)
    .use(authRouter())
    // ${artifactId} apps/modules, protected via GateKeeper
    .use('/module/:moduleId', moduleRouter(gatekeeperMiddleware))
    // ${artifactId} API, protected via GateKeeper
    .use('/api', apiRouter(gatekeeperMiddleware))
    // Proxy: allows to proxy requests to CSDS services; can only be accessed via POST
    .post('/proxy/:csds', csdsProxy)
    .use('/fetch/*', fetchProxy)
    .get('/proxy/analytics/*', analyticsProxy) // for GA tracking
    // forward requests by lp-authentication to the proxy (by rewriting the request)
    // IMPORTANT: do NOT allow "post" requests to only '/le/account/:account/session'... this is part of enforcing LPA-only login
    .post('/le/account/:account/session/internal', loginProxy)
    .get('/le/account/:account/session', loginProxy)
    .delete('/le/account/:account/session', loginProxy)
    // Serve the main page (intentionally as last before the error handling)
    .use('/', coreRouter());

// handles proxy requests and the login process (see the proxy_router for details why we add the proxy this way)
// TODO loginRouter(app, gatekeeperMiddleware);

// Prevent exposing unnecessary server information (removes the "X-Powered-By: Express" header):
app.set('x-powered-by', false);

// Properly run ExpressJS behind proxies (such as Nginx in production); fixes the client IP address retrieval:
// http://expressjs.com/guide/behind-proxies.html
app.set('trust proxy', true);

// Enable strict routing in ExpressJS: because /abc isn't the same as /abc/
app.enable('strict routing'); // do NOT remove!

// Express templating via JsRender/JsView
const templateFolder = path.join(__dirname, 'templates');
logger.info(`Template folder is: ${templateFolder}`);
app.engine('html', jsrender.__express);
app.engine('js', jsrender.__express);
app.set('view engine', 'html');
app.set('views', templateFolder);
jsrender.views.settings.debugMode(isDebug);
// allows to use the XSS filters in templates:
// https://github.com/yahoo/xss-filters/wiki
jsrender.views.converters(xssFilters);

// If we reach this part, we have a 404: Catch 404 and forward to notFoundHandler
app.use(errorHandling.notFoundHandler());

// Log and report back potential errors (stack traces are only send to the client during "debug" mode)
app.use(errorHandling.logErrorHandler());
app.use(errorHandling.reportErrorHandler());

module.exports = {
    'start': () => {
        const port = config.get('server:httpPort');
        const handler = err => {
            if (err) logger.error(`Failed to send analytics event! Analytics will probably not work in at all! Details: ${JSON.stringify(err)}`);
        };
        try {
            app.listen(port); // asynchronous
            if (isDeployed) analytics.getVisitor().event('server-start', 'successfully_started', handler).send();
        } catch (ex) {
            // usually happens, if the port is already in use...
            // log exception (in particular to logstash) for better debugging and error tracing
            logger.error(`Failed to start server on port: ${port}. Exception: ${ex.message ? ex.message : ex}`);
            if (isDeployed) analytics.getVisitor().exception(`server-start-error: ${JSON.stringify(ex)}`, true, handler).send();
            // rethrow exception to stop the application (we are in a non recoverable state)
            throw ex;
        }
    }
};
