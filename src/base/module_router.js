'use strict';

/**
 * Serves bundled modules/apps to the browser.
 *
 * User: jmollner
 * Date: 23/01/16
 */

const express = require('express');
const bodyParser = require('body-parser').urlencoded({'extended': false, 'parameterLimit': 3, 'limit': '10kb'});
const serveStatic = require('serve-static');
const staticTransform = require('connect-static-transform');
const cheerio = require('cheerio');

const fs = require('fs');
const HttpStatus = require('http-status');

const helmet = require('helmet');

const moduleManagement = require('./module_management');
const config = require('./config');
const util = require('./util');

const metrics = require('prom-client');
const moduleCounter = new metrics.Counter('${artifactId}_module_total', 'The number of times a modules was requested from a browser (track module usage; non-unique: a user can increase the counter multiple times by requesting a module more than once)', ['module']);

const domain = config.getDomain();
const isDebug = config.isDebug();

const moduleRouter = gatekeeperMiddleware => {
    const router = new express.Router({'mergeParams': true});

    const authentication = util.chainMiddleware([bodyParser, gatekeeperMiddleware]);

    router.use((req, res, next) => {
        const moduleIdParam = req.params.moduleId;
        if (moduleIdParam) {
            const moduleId = moduleManagement.normalize(moduleIdParam);
            const module = moduleManagement.getModule(moduleId, true);
            if (module) {
                req.module = module;
                req.moduleId = moduleId;
                req.moduleProperties = module.${artifactId}; // just a shortcut
                return next();
            }
        }

        res.status(HttpStatus.NOT_FOUND);
        return next(new Error(`Invalid module: ${moduleIdParam}`));
    });

    // TODO
    const csp = (req, res, next) => helmet.contentSecurityPolicy(req.moduleProperties.config.csp)(req, res, next);
    const frameGuard = helmet.frameguard({'action': 'allow-from', domain});

    const securityHeaders = util.chainMiddleware([csp, frameGuard]);

    const provideContent = (req, res) => {
        const module = req.module;
        const moduleConfig = req.moduleProperties.config;
        if (moduleConfig.iFrame === true) {
            const pageContext = {
                '_moduleId': module.id,
                '_html': module.content,
                '_domain': domain,
                '_basePath': `a/${req.siteId}`,
                '_defaultStyle': moduleConfig.include.defaultStyle === true,
                '_jquery': moduleConfig.include.jquery === true,
                '_requirejs': moduleConfig.include.requirejs === true,
                '_underscore': moduleConfig.include.underscore === true
            };

            return res.render('module_container', pageContext);
        }
        return res.status(HttpStatus.OK).send(module.content);
    };

    // serve the app.core.xhtml file rendered back to the client (gatekeeper protected);
    // we use post to not conflict with potential resources which are loaded via GET
    router.post('/', authentication, securityHeaders, (req, res, next) => {
        const module = req.module;

        moduleCounter.inc({'module': req.moduleId});

        if (module.content && !isDebug) {
             // serve cached version (from 'module.content') only in production mode.
             // in debug/local/dev mode... always read the file from the disk (instead of using the cached version)
            return provideContent(req, res);
        }

        try {
            return fs.readFile(module.indexFile, 'utf8', (err, data) => {
                if (err) return next(new Error(`Failed to read index file of app: ${module.id}`), req, res, next);

                if (module.${artifactId}.config.iFrame === true) {
                    module.content = data;
                } else {
                    const content = cheerio.load(data);
                    content('link[rel="stylesheet"][href]').each((i, element) => {
                        const elem = cheerio(element);
                        const linkHref = elem.attr('href');
                        const linkId = elem.attr('id');

                        elem.replaceWith(`<style${linkId ? ` id= ${linkId}` : ''}>@import "${linkHref}";</style>`);
                    });
                    module.content = content.html();
                }
                return provideContent(req, res);
            });
        } catch (ex) {
            res.status(HttpStatus.NOT_FOUND);
            ex.message = 'App template cannot be opened.';
            return next(ex, req, res, next);
        }
    });

    // serve static resources of module (can be accessed without protection):
    // send any file back to the client, >except< the "app.core.xhtml" (which should only be served via template and POST)

    const serve = (req, res, next) => {
        const module = req.module;
        serveStatic(module.webFolder, {
            'dotfiles': 'ignore',
            'cacheControl': false, // will be set by nginx
            'etag': false, // will be set by nginx
            'lastModified': true, // set header according to the system's last modified value
            'fallthrough': true,
            'index': false
        })(req, res, next);
    };

    // static module resources; cannot be protected via gatekeeper
    router.get(/\/(?!app.core.xhtml$).*/, serve);

    return router;
};

module.exports = moduleRouter;
