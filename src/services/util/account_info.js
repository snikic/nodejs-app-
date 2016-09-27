/**
 * Created by sseedorf on 12/05/16.
 */

'use strict';

const HttpStatus = require('http-status');
const config = require('../../base/config');
const sfConnector = require('./salesforce_connector');

module.exports = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    sfConnector.getAccountInfo(req.siteId).then(result => {
        res.send(result);
        res.end();
    }, error => {
        res.send({error: error.message});
        res.end();
    });
};
