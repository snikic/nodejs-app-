'use strict';

/**
 * Initializes GateKeeper so it can be used in a simple way.
 *
 * User: jmollner
 * Date: 19/11/15
 */

const ServiceDirectory = require('./service_directory');
const gateKeeperJS = require('gate-Keeperjs');
const config = require('./config');
const util = require('./util');
const logger = require('./logger')('gateKeeper');
const serviceHealth = require('./server_health');

// since we change the config here... we make a copy of it
const globalConf = Object.assign({}, config.get('gateKeeper'));
globalConf.logger = logger;

class GateKeeper {

    constructor(serviceDirectory) {
        /* This guard ensures that the callee has invoked the class constructor function with the 'new'
         * keyword - failure to do this will result in the 'this' keyword referring to the callee's scope
         * (typically the window global) which will result in the following fields leaking into the global
         * namespace and not being set on this object. */
        if (!(this instanceof GateKeeper)) {
            throw new TypeError('GateKeeper constructor cannot be called as a function.');
        }

        // object initialization...
        this._serviceDirectory = serviceDirectory || new ServiceDirectory(globalConf.serviceType);
        this._serviceDirectory.getService(); // eager initialize the ServiceDirectory
        this._initialized = false;
        this._name = 'GateKeeper';
        serviceHealth.register(this);
    }

    isAuthenticated(accountId, userId, token) {
        const self = this;

        const initGateKeeper = serviceConf => {
            return new Promise((resolve, reject) => {
                if (self._initialized === true) return resolve();
                const conf = Object.assign({}, globalConf, serviceConf);
                return gateKeeperJS.init(conf, error => {
                    if (error) return reject(error);
                    self._initialized = true; // we initialized if no error occurred
                    return resolve();
                });
            });
        };

        const isAuthenticated = () => {
            return new Promise((resolve, reject) => {
                gateKeeperJS.isAuthenticated(accountId, userId, token, (error, result) => {
                    if (error) return reject(error); // error is present if an error happened during the validation (e.g. network issues)
                    return resolve(result); // result is null, if the token is invalid
                });
            });
        };

        return this._serviceDirectory.getService()
            .then(initGateKeeper)
            .then(isAuthenticated);
    }

    name() {
        return this._name;
    }

    healthy() {
        return this._serviceDirectory.getService()
            .then(serviceConf => {
                // array of promises to be checked (i.e. can we connect to all hosts
                return serviceConf.hosts
                    .map(host => util.testConnection(host, serviceConf.port, globalConf.timeout));
            })
            .then(checks => {
                return Promise.all(checks)
                // results is an array, if checks contains more than one promise, so we normalize the result
                    .then(results => Array.isArray(results) ? results : [results])
                    .then(results => results.some(service => service.success === true));
            });
    }

}

module.exports = GateKeeper;
