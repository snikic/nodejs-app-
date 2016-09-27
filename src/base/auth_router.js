'use strict';

/**
 * Allows to login/authenticate the client.
 *
 * User: jmollner
 * Date: 18/01/16
 */
const express = require('express');
const xssFilters = require('xss-filters');
const config = require('./config');
const LpAuth = require('lp-authentication');
const lpAuth = new LpAuth();

const csdsName = config.get('csdsName');
const authDomain = config.get('authDomain');

const siteIdPathMatcher = /\/a\/([^\s\/]+)\//;

const authRouter = () => {
    const router = new express.Router({'mergeParams': true});

    // Extract the siteID from the request (if available)
    router.use((req, res, next) => {
        const pathMatch = siteIdPathMatcher.exec(req.url);
        if (pathMatch && pathMatch[1]) {
            req.siteId = pathMatch[1];
            req.url = `/${req.url.replace(siteIdPathMatcher, '')}`;
        }
        const clientId = req.header('X-LP-CLIENT');
        if (clientId) req.clientId = xssFilters.inUnQuotedAttr(clientId);

        return next();
    });

    // redirect requests to LP login page
    router.get('/login', (req, res) => res.redirect(lpAuth.getLoginUrl(authDomain, csdsName)));

    return router;
};

module.exports = authRouter;
