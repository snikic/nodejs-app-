'use strict';

/**
 * Extends the LP CSDS client with health service functions.
 *
 * User: jmollner
 * Date: 14/07/16
 */

const BaseCsdsClient = require('lp-js-csds-client');
const serviceHealth = require('./server_health');

class CsdsClient extends BaseCsdsClient {

    constructor(options) {
        super(options);
        this._name = 'CSDS';
        serviceHealth.register(this);
    }

    name() {
        return this._name;
    }

    healthy() {
        const self = this;
        return new Promise((resolve, reject) => {
            self.test(err => {
                if (err) return reject(err);
                return resolve(true);
            });
        });
    }
}

module.exports = CsdsClient;
