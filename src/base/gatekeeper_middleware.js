'use strict';

/**
 * Wraps GateKeeper as middleware.
 *
 * User: jmollner
 * Date: 20/11/15
 */

const GateKeeper = require('./gatekeeper');
const analytics = require('./analytics');
const logger = require('./logger')('gateKeeperMiddleware');
const expressValidator = require('express-validator')();
const HttpStatus = require('http-status');
const dnsErrors = require('dnserrors');

const getInput = req => {
    req.params = req.params || {};
    req.params.account = req.header('X-LP-ACCOUNT');
    req.params.user = req.header('X-LP-USER');
    req.params.token = req.header('X-LP-TOKEN');

    // since we only allow numeric/int or alphanumeric data, html/xss sanitization is not necessary
    // the least specific test should come at the end of the chain (for better error reporting)
    req.check('account')
        .isAlphanumeric().withMessage('The accountID value must be alphanumeric')
        .notEmpty().withMessage('\'X-LP-ACCOUNT\' header or \'account\' body parameter is required');
    req.check('user')
        .isInt().withMessage('The user value must be numeric')
        .notEmpty().withMessage('\'X-LP-USER\' header or \'user\' body parameter is required');
    req.check('token')
        .isAlphanumeric().withMessage('The (bearer) token value must be alphanumeric')
        .notEmpty().withMessage('\'X-LP-TOKEN\' header or \'token\' body parameter is required');

    return {
        'accountId': req.sanitize('account').trim(),
        'userId': req.sanitize('user').trim(),
        'token': req.sanitize('token').trim()
    };
};

// requires that a body parser was previously used to parse the request!
// lpaUsersOnly: only accept LPA user
module.exports.validateGateKeeper = lpaUsersOnly => {
    const gateKeeperInstance = new GateKeeper();
    const lpaOnlyMode = lpaUsersOnly === true; // allows to omit the param

    return (req, res, next) => expressValidator(req, res, err => {
        if (err) return next(err);

        if (req.skipGatekeeper === true) {
            // 'skipGatekeeper' is not a parameter which can be set via browser/client, it can
            // only be set by a server-side middleware in advance
            return next();
        }

        const data = getInput(req);
        const errors = req.validationErrors(true);
        if (errors) {
            Object.keys(errors).forEach((key, i) => res.setHeader(`x-invalid-input-${i}`, `${errors[key].msg}; received: ${errors[key].value}`));
            res.status(HttpStatus.BAD_REQUEST).send('Invalid or missing input. Please check the provided authentication data.');
            return next(new Error('Invalid request for GateKeeper protected resource! Missing or invalid authentication data.'));
        }

        req.siteId = req.siteId || data.accountId;
        req.userId = data.userId;

        const visitor = analytics.createVisitor(req);

        return gateKeeperInstance.isAuthenticated(data.accountId, data.userId, data.token).then(result => {
            if (result) { // gatekeeper token is valid
                logger.debug(`Authentication success for user '${data.userId}' using siteId '${data.accountId}'; AppServer '${result.appserver_name}' running ${result.appserver_ver}`);
                // logger.debug(`Response of GateKeeper: ${JSON.stringify(result)}`);
                res.setHeader('x-appserver-name', result.appserver_name);
                res.setHeader('x-appserver-version', result.appserver_ver);
                if (lpaOnlyMode) {
                    if (result.isLPA !== 'true') { // result only has string values
                        res.status(HttpStatus.FORBIDDEN).send('Insufficient permissions. Provided authentication data does not belong to a LPA!');
                        visitor.event('auth', 'failure', 'no-lpa').send();
                        return next(new Error('Insufficient permissions. Provided authentication data does not belong to a LPA!'));
                    }
                }
                visitor.event('auth', 'success').send();
                return next();
            }
            // else: validation was completed without error, but the token is invalid:
            const error = new Error('Provided authentication data not valid!');
            error.status = HttpStatus.UNAUTHORIZED;
            visitor.event('auth', 'failure', 'invalid-auth-data').send();
            return next(error);
        }).catch(error => { // an error happened during the gatekeeper validation (e.g. network issues)
            const dnsError = dnsErrors(error);
            if (!dnsError.status) dnsError.status = dnsError.statusCode = HttpStatus.SERVICE_UNAVAILABLE;
            dnsError.details = 'Unable to validate GateKeeper credentials';
            logger.error(`Unable to validate GateKeeper credentials: ${JSON.stringify(dnsError)}`);
            visitor.exception(`auth-error: ${JSON.stringify(dnsError)}`, true).send();
            return next(dnsError);
        });
    });
};
