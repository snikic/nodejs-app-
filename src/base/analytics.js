'use strict';

/**
 * Analytics/reporting for ${artifactId}.
 *
 * User: jmollner
 * Date: 12/08/16
 */

const os = require('os');
const config = require('./config');
const Visitor = require('./analytics_wrapper').Visitor;
const _gaID = config.getGA();
const _buildNumber = config.get('build:buildNumber');

// dimension1: appVersion
// dimension2: siteId
// dimension3: the source of the event (platform, module 1, module 2, etc.)

const baseOptions = {
    'https': true
};

const baseVisitorContext = {
    'aip': 1, // anonymize IP
    'cd3': os.hostname(), // custom dimension 3
    'ds': 'server' // data source
};
if (_buildNumber) baseVisitorContext.cd1 = _buildNumber; // custom dimension 1

const _construct = (cid, options, context) => {
    // tid: trackingId (first param)
    // cid: clientId
    // options: npm module options (e.g. enable https but also uid/userId)
    // context: GA parameters
    return new Visitor(_gaID, cid, options, context);
};

// global visitor is mainly used for exception reporting, not related to direct client requests
const _globalVisitor = (() => {
    // use a fixed clientId, so a server will be recognized as same system e.g. after restarts
    const cid = '729fe76f-217f-47c9-9dc0-79e417632c46'; // clientId
    const options = Object.assign({'uid': 'server'}, baseOptions); // uid: userId
    const context = Object.assign({
        'cd2': 'global', // custom dimension 2
        'ni': 1 // non-interaction hit (don't consider the global/server visitor as 'active' user on the page)
    }, baseVisitorContext);
    return _construct(cid, options, context);
})();

const createVisitor = req => {
    if (req && req.visitor) return req.visitor;

    const cid = req.clientId ? req.clientId : null; // clientId
    const options = Object.assign({'strictCidFormat': false}, baseOptions); // uid: userId
    const context = Object.assign({
        'cd2': req.siteId // custom dimension 2
    }, baseVisitorContext);
    if (req.userId) options.uid = req.userId; // userId
    req.visitor = _construct(cid, options, context);

    return req.visitor;
};

const getVisitor = req => req && req.visitor ? req.visitor : _globalVisitor;

module.exports = {
    getVisitor, // get the previously created visitor or the global visitor if non was created
    createVisitor // create a new visitor or return existing one (but never the global visitor)
};
