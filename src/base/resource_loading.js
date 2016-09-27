'use strict';

/**
 * Serves static content to the browser.
 *
 * User: jmollner
 * Date: 28/01/16
 */

const path = require('path');
const serveStatic = require('serve-static');
const async = require('async');
const config = require('./config');
const _gaID = config.getGA();
const _domain = config.get('domain');

const serve = rootPath => serveStatic(rootPath, {
    'dotfiles': 'ignore',
    'cacheControl': false, // will be set by nginx
    'etag': false, // will be set by nginx
    'lastModified': true, // set header according to the system's last modified value
    'fallthrough': true,
    'index': false
});

const serveAssets = serve(path.join(__dirname, '..', 'assets'));
const serveApp = serve(path.join(__dirname, 'static'));
const serveRobotoFont = serve(path.join(path.dirname(require.resolve('roboto-fontface')), '..'));
const serveJQuery = serve(path.dirname(require.resolve('jquery')));
const serveStore2 = serve(path.dirname(require.resolve('store2')));
const serveLpAuth = serve(path.dirname(require.resolve('lp-authentication')));
const serveRequire = serve(path.join(path.dirname(require.resolve('requirejs')), '..'));
const serveXssFilter = serve(path.join(path.dirname(require.resolve('xss-filters')), '..', '/dist'));
const serveMoment = serve(path.dirname(require.resolve('moment')));
const serveJsViews = serve(path.dirname(require.resolve('jsviews')));
const serveAlertify = serve(path.join(path.dirname(require.resolve('alertify.js')), '..'));
const serveFrameResizer = serve(path.join(path.dirname(require.resolve('iframe-resizer')), 'js'));

const _analytics = (req, res, cb) => {
    if (req.path) {
        if (req.path === '/analytics.js') {
            res.header('Content-Type', 'application/javascript');
            const _source = req.query && req.query.s ? req.query.s : ''; // template is escaping, so no need to do it here
            const _clickTracking = config.getZone() === 'z0'; // for now, only track clicks locally and in QA
            return res.render('analytics.js', {_gaID, _source, _clickTracking});
        } else if (req.path === '/analytics_ga.js') {
            res.header('Content-Type', 'application/javascript');
            return res.render('analytics_ga.js', {_domain});
        }
    }
    return cb();
};

module.exports.handleStatic = () => {
    return (req, res, next) => {
        if (req.method !== 'GET') return next();
        // console.log(path.join(path.dirname(require.resolve('roboto-fontface')), '..'));
        return async.series([
            cb => _analytics(req, res, cb),
            cb => serveApp(req, res, cb),
            cb => serveAssets(req, res, cb),
            cb => serveRobotoFont(req, res, cb),
            cb => serveJQuery(req, res, cb),
            cb => serveStore2(req, res, cb),
            cb => serveLpAuth(req, res, cb),
            cb => serveRequire(req, res, cb),
            cb => serveXssFilter(req, res, cb),
            cb => serveMoment(req, res, cb),
            cb => serveJsViews(req, res, cb),
            cb => serveAlertify(req, res, cb),
            cb => serveFrameResizer(req, res, cb)
        ], next);
    };
};
