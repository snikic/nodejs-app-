'use strict';

/**
 * The APIs of ${artifactId}.
 *
 * User: jmollner
 * Date: 29/05/16
 */

const express = require('express');
const HttpStatus = require('http-status');

const moduleManagement = require('./module_management');
const config = require('./config');

// const accountInfo = require('../services/util/account_info');
const serverInfo = require('../services/util/server_info');
const readme = require('../services/util/readme');

const apiRouter = gatekeeperMiddleware => {
    const router = new express.Router({'mergeParams': true});

    // all requests to the API are gatekeeper protected
    router.use(gatekeeperMiddleware);

    router.get('/modules', (req, res) => res.json(moduleManagement.getModules(false)));

    router.get('/build', (req, res) => res.json(config.get('build')));

    router.get('/check', (req, res) => res.status(HttpStatus.OK).send()); // gatekeeper was already passed above

    router.get('/readme', readme);
    router.get('/info/server', serverInfo);
    // router.get('/info/account', accountInfo);

    // we cannot add the proxy here to the API, since the proxy will not work within
    // a expressJS router. more details see the proxy_router

    return router;
};

module.exports = apiRouter;
