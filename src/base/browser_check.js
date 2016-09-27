'use strict';

/**
 * A middleware which validates if the used browser is supported by ${artifactId}.
 *
 * User: jmollner
 * Date: 20/05/16
 */

const parser = require('ua-parser-js');
const cookieParser = require('cookie-parser')(); // cookies are not supported... will be removed by nginx

module.exports.validate = () => {
    return (req, res, next) => cookieParser(req, res, err => {
        if (err) return next(err);

        if (req.cookies.skipBrowserTest !== true) {
            const browser = parser(req.headers['user-agent']).browser;
            if (browser.name !== 'Chrome' && browser.name !== 'Chromium') {
                const context = {};
                return res.render('unsupported_browser', context);
            }
        }
        return next();
    });
};
