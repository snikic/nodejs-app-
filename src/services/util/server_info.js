'use strict';

const config = require('./../../base/config');
const csdsName = config.get('csdsName');
const zone = config.getZone();
const domain = config.getDomain();
const dataCenter = config.getDataCenter();

module.exports = (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send({zone, domain, dataCenter, csdsName});
};
