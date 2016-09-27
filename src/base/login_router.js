'use strict';

/**
 * Proxy and login handling for ${artifactId}.
 *
 * User: jmollner
 * Date: 17/06/16
 */

const expressValidator = require('express-validator')();
const proxy = require('./proxy_new');
const util = require('./util');

const dataCenter = require('./config').getDataCenter();
const liveEngageCsds = 'liveEngage';

const loginHandler = (req, res, next) => {
    req.params.csds = liveEngageCsds;
    res.set('x-data-center', dataCenter);
    return next(); // return next('route');
};

// proxy requires the 'expressValidator' middleware in advance
const loginMiddleware = util.chainMiddleware([loginHandler, expressValidator, proxy]);

// IMPORTANT: lessons learned... proxy will not work if the body is parsed by a bodyParser as well as
// will not work within an expressJS router :/ do we must structure this router a little bit different

// const proxyRouter = (app, gatekeeperMiddleware) => {
const proxyRouter = app => {
    // IMPORTANT: do NOT allow "post" requests to only '/le/account/:account/session' (without '/internal')
    //            this is part of enforcing LPA-only login!
    app.post('/le/account/:account/session/internal', loginMiddleware);
    app.get('/le/account/:account/session', loginMiddleware);
    app.delete('/le/account/:account/session', loginMiddleware);

    // since we run in on the /api/* path, gatekeeper was already checking the credentials (see api_router)
    app.all('/api/proxy/:csds/*', proxy);
};

module.exports = proxyRouter;
