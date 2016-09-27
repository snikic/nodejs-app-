'use strict';

/**
 * Serving basic stuff, e.g. the html main page, the favicon, etc.
 *
 * User: jmollner
 * Date: 22/12/15
 */

// const validateBrowser = require('./browser_check').validate();

const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');

const config = require('./config');
const security = require('./security');
const util = require('./util');
const resourceFiles = require('./resource_loading');
const moduleManagement = require('./module_management');

const domain = config.getDomain(); // ${artifactId} domain

const globalAppContext = {
    'debug': config.get('debug'),
    '_domain': domain,
    '_serverStartTime': config.get('serverStart'),
    '_${artifactId}Version': config.getVersion(),
    '_count': 0,
    '_sortedModules': []
};

moduleManagement.initialized()
    .then(() => {
        globalAppContext._count = moduleManagement.count();
        globalAppContext._sortedModules = moduleManagement.sortedModules(true);
    });

const preStartIndexFile = path.join(__dirname, 'static', 'pre_start', 'index.html');

const coreRouter = () => {
    const router = new express.Router({'mergeParams': true});

    // fav icon
    router.use(favicon(path.join(__dirname, 'static', 'favicon.ico')));

    // Static content:
    router.use(resourceFiles.handleStatic());

    // serve the index html file (supporting html5 history api)
    // $ due to: only match the module "root", not sub-resources
    // matches:
    // - /
    // - /module/foo/
    // does not match:
    // - /foo
    // - /bar/
    // - /module/foo bar/
    // - /module/foo/bar/
    router.get(/^\/(module\/([^\s\/]+)\/)?$/, util.acceptsMiddleware('text/html'), security.htmlSecurity(), (req, res) => {
        // serve the normal page if the siteId is present
        if (req.siteId) return res.render('index', globalAppContext);

        // if the siteID is not present, serve the pre_start page which redirects
        // accordingly on the client side
        return res.sendFile(preStartIndexFile, {
            'dotfiles': 'ignore',
            'cacheControl': false, // will be set by nginx
            'etag': false, // will be set by nginx
            'lastModified': true // set header according to the system's last modified value
        });
    });

    return router;
};

module.exports = coreRouter;
