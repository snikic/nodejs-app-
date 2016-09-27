'use strict';

/**
 * Initializes the ServiceDirectory so it can be used in a simple way.
 *
 * User: jmollner
 * Date: 11/11/15
 */

const serviceDirectoryJS = require('service-directoryjs');
const cipherPass = require('lp-js-cipherpass');
const config = require('./config');
const util = require('./util');
const logger = require('./logger')('serviceDirectory');
const serviceHealth = require('./server_health');

const serviceDirPropPrefix = 'lp-serviceDirectory';

// since we change the config here... we make a copy of it
const globalConf = Object.assign({}, config.get('serviceDirectory'));
globalConf.logger = logger;

globalConf.host = globalConf.url.split('://')[1]; // health check

if (globalConf.port) { // specified as string or int
    globalConf.url += `:${globalConf.port}`;
}

if (typeof globalConf.credentials === 'string') {
    globalConf.password = cipherPass.decipherPass(globalConf.credentials);
}

class ServiceDirectory {

    constructor(serviceType) {
        /* This guard ensures that the callee has invoked the class constructor function with the 'new'
         * keyword - failure to do this will result in the 'this' keyword referring to the callee's scope
         * (typically the window global) which will result in the following fields leaking into the global
         * namespace and not being set on this object. */
        if (!(this instanceof ServiceDirectory)) throw new TypeError('ServiceDirectory constructor cannot be called as a function.');

        if (typeof serviceType !== 'string') throw new TypeError('The "serviceType" argument must be a string');

        // object initialization...
        this._serviceType = serviceType;
        this._service = null;
        this._initializing = false;
        this._name = 'ServiceDirectory';
        serviceHealth.register(this);
    }

    getService() {
        if (this.initialized()) return Promise.resolve(this._service);

        // we cannot call 'serviceDirectoryJS.init' multiple times...
        if (this._initializing === true) return Promise.reject(new Error('ServiceDirectory is still initializing (cannot be initialized in parallel)...'));

        const self = this;

        const initServiceDirectory = new Promise((resolve, reject) => {
            // 'serviceDirectoryJS.init' can only be called once!

            if (self._initializing !== true) {
                self._initializing = true;

                // "clone" global configuration and add a instance specific errorCallback
                const configuration = Object.assign({
                    'errorCallback': err => {
                        self._initializing = false;
                        return reject(err);
                    }
                }, globalConf); // conf at the end so we don't change the object

                serviceDirectoryJS.init(configuration, error => {
                    if (error) {
                        // if there was an error, we set 'initializing' to false, to allow retries
                        self._initializing = false;
                        return reject(error);
                    }

                    // so far we did not completed the initialization... still need to initialize the serviceType:
                    // --> don't set initializing to false yet
                    return resolve();
                });
            }
            return reject(new Error('ServiceDirectory is still initializing (cannot be initialized in parallel)...'));
        });

        const initServiceType = new Promise((resolve, reject) => {
            // 'serviceDirectoryJS.initServiceType' can be called multiple times (not useful, but also not harmful)
            serviceDirectoryJS.initServiceType(self._serviceType, (error, service) => {
                if (error) return reject(error);
                self._service = {
                    'hosts': service[`${serviceDirPropPrefix}-hostName`].split(','),
                    'port': service[`${serviceDirPropPrefix}-port`],
                    'username': service[`${serviceDirPropPrefix}-user`],
                    'credentials': service[`${serviceDirPropPrefix}-password`], // store original credentials
                    'password': cipherPass.decipherPass(service[`${serviceDirPropPrefix}-password`])
                };

                // if there wasn't any error, the initialization is complete; in the case of an error, don't change the
                // status of the initialization, to allow retries
                self._initializing = false;
                return resolve(self._service);
            });
        });

        return initServiceDirectory
            .then(initServiceType);
    }

    initialized() {
        // if 'this._service' is an object, the initialization was completed (null is also considered as object in JS... why why)
        return this._service && typeof this._service === 'object';
    }

    name() {
        return this._name;
    }

    healthy() {
        return util.testConnection(globalConf.host, globalConf.port, globalConf.timeout)
            .then(result => result.success === true);
    }
}

module.exports = ServiceDirectory;
