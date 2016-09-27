'use strict';

/**
 * Security related functionality.
 *
 * User: jmollner
 * Date: 25/07/16
 */

const express = require('express');
const helmet = require('helmet');
const enforcesSsl = require('express-enforces-ssl');
const hpp = require('hpp');

const config = require('./config');

const domain = config.getDomain();

module.exports = {
    // baseSecurity must be added to all requests (for all http verbs and for all static or dynamic resources)
    'baseSecurity': () => {
        const router = new express.Router({'mergeParams': true});

        // Prevent exposing unnecessary server information (removes the "X-Powered-By" header):
        router.use(helmet.hidePoweredBy());
        // Prevent IE from executing downloads (via "X-Download-Options" header):
        // https://blogs.msdn.microsoft.com/ie/2008/07/02/ie8-security-part-v-comprehensive-protection/
        router.use(helmet.ieNoOpen());
        // Reducing MIME type security risks: don't infer/sniff the MIME type (IE, Chrome, soon Firefox):
        // https://msdn.microsoft.com/library/gg622941(v=vs.85).aspx
        router.use(helmet.noSniff());
        // HTTP Parameter Pollution (HPP): prevent multiple HTTP parameters with the same name:
        // https://www.owasp.org/index.php/Testing_for_HTTP_Parameter_pollution_%28OTG-INPVAL-004%29
        // https://speakerdeck.com/ckarande/top-overlooked-security-threats-to-node-dot-js-web-applications?slide=48
        router.use(hpp());
        // Allow only HTTPS requests: if accessed via HTTP, redirect to HTTPS:
        router.use(enforcesSsl());

        return router;
    },
    // htmlSecurity must be added to all static or dynamic html files which are rendered in the browser. therefore, must
    // only be added to GET requests. this is an addition to 'baseSecurity', which should be added to html files as well!
    'htmlSecurity': () => {
        const router = new express.Router({'mergeParams': true});

        // Enable "basic" XSS filter (IE, Chrome) to make reflected XSS attacks more difficult:
        // https://blogs.msdn.microsoft.com/ie/2008/07/02/ie8-security-part-iv-the-xss-filter/
        router.use(helmet.xssFilter({'setOnOldIE': true}));
        // X-Frame-Options: Don't allow embedding the app into iframes to prevent clickjacking:
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/X-Frame-Options
        router.use(helmet.frameguard({'action': 'sameorigin'}));
        // HTTP Strict Transport Security: tell browsers to use HTTPS:
        // https://developer.mozilla.org/en-US/docs/Web/Security/HTTP_strict_transport_security
        router.use(helmet.hsts(config.get('server:hsts')));
        // HTTP Public Key Pinning (HPKP):
        // https://developer.mozilla.org/en/docs/Web/Security/Public_Key_Pinning
        router.use(helmet.hpkp(config.get('server:hpkp')));

        // Content Security Policy (CSP):
        // https://developer.mozilla.org/en-US/docs/Web/Security/CSP/CSP_policy_directives
        router.use(helmet.contentSecurityPolicy({
            'directives': {
                'defaultSrc': ['\'self\''],
                // the hash is for the embedded script tag which loads modules via POST (by auto-triggering form submission)
                // TODO 'scriptSrc': ['\'self\'', '\'sha256-CNpGs301fn1abxhLSmcOuQ1govWG+iiQizQpEPLwBd4=\''],
                'scriptSrc': ['\'self\'', '\'unsafe-eval\'', '\'unsafe-inline\''],  // unsafe-inline and unsafe-eval are only temporary!!!
                // the hash is part of alertify
                // TODO 'styleSrc': ['\'self\'', '\'sha256-TJTk20oGqQkDR9rkIaZSbZvBQzF3lqnkh4cRaFO6NrU=\''],
                'styleSrc': ['\'self\'', '\'unsafe-inline\''], // TODO this is only temporary!!!
                'objectSrc': ['none'], // say no to flash and other plugins
                'formAction': [domain], // form "targets", does not default to 'defaultSrc' so specify explicitly
                'baseUri': [domain], // base tag "targets", does not default to 'defaultSrc' so specify explicitly
                'frameAncestors': ['\'none\''], // don't allow embedding the app into iFrames to prevent click-jacking
                'upgradeInsecureRequests': '', // enforce HTTPS (no value needed)
                'blockAllMixedContent': '', // prevent loading assets using HTTP (when the page is using HTTPS) (no value needed)
                'reflectedXss': 'block', // activate heuristics to block reflected XSS attacks
                'referrer': 'origin' // only send the origin in the referrer header (and not the complete url)
            },
            'browserSniff': false
        }));

        return router;
    }
};
