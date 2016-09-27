'use strict';

/**
 * Provides information about the server and service status via the LP service status module.
 *
 * User: jmollner
 * Date: 23/11/15
 */

const logger = require('./logger')('server_health');
const config = require('./config');
const analytics = require('./analytics');
const fs = require('fs');
const HttpStatus = require('http-status');

// see: http://kubernetes.io/docs/user-guide/pod-states/#container-probes

const terminationMessagePath = config.get('terminationMessagePath');
const isDeployed = config.isDeployed();
const healthCheckInterval = 30 * 1000; // milliseconds
const services = [];

const _resultMapper = (result, index) => {
    const name = services[index].name;
    return {result, name};
};

const _runCheck = (testFunc, res) => {
    const checks = services.map(service => service[testFunc].call()); // replace with Reflect.apply when we update to Node6
    Promise.all(checks) // Promise.all returns an array if we have multiple checks; else just the simple value
        .then(results => Array.isArray(results) ? results : [results])
        .then(results => results.map(_resultMapper))
        .then(serviceResults => res
            .status(serviceResults.every(service => service.result === true)
                ? HttpStatus.OK
                : HttpStatus.INTERNAL_SERVER_ERROR)
            .send(serviceResults)
        );
};

// Indicates whether the container is live, i.e. running. If the liveness fails, kubernetes
// will kill the container and the container will be subjected to its RestartPolicy
const livenessCheck = () => (req, res) => _runCheck('healthy', res);

// Indicates whether the container is ready to service requests. If the readiness fails,
// the endpoints controller will remove the pod’s IP address from the endpoints of all
// services that match the pod.
const readinessCheck = () => (req, res) => _runCheck('ready', res);

// creates (or overrides if already present) a termination message, which will be gathered
// by k8s.
const handleTerminationMessage = message => {
    try {
        // while async is usually better, in this case we want to block and ensure that
        // it's completely written before we shutdown

        // eslint-disable-next-line no-sync
        fs.writeFileSync(terminationMessagePath, message);
    } catch (err) {
        logger.warn(`Failed to write termination message: ${message}`);
    }
};

const register = service => {
    if (!service) throw new Error('Cannot register null/undefined object!');
    if (typeof service.name !== 'function') throw new Error('Object must provide a "name" method!');
    if (typeof service.healthy !== 'function') throw new Error('Object must provide a "healthy" method!');

    const name = service.name();

    const errorHandler = err => {
        const message = `Health check failed for service '${name}': ${JSON.stringify(err)}`;
        logger.warn(message);
        if (isDeployed) {
            analytics.getVisitor().exception(`server-health-error; '${name}': ${JSON.stringify(err)}`, true).send();
            handleTerminationMessage(message);
        }
        return false;
    };

    const ready = (() => {
        // if 'service.isReady()' returns true once... the service is "always" ready; so cache it and directly return true
        let _ready = false;
        return () => {
            if (!_ready) {
                return service.healthy()
                    .catch(errorHandler)
                    .then(result => {
                        _ready = result;
                        return result;
                    });
            }
            return Promise.resolve(_ready);
        };
    })();

    const healthy = (() => {
        // lets cache the healthy status for performance reasons
        let _healthy = false;
        let _lastCheck = -1; // unix time
        return () => {
            const currentTime = Date.now();
            if (_lastCheck + healthCheckInterval < currentTime) {
                return service.healthy()
                    .catch(errorHandler)
                    .then(result => {
                        _healthy = result;
                        _lastCheck = currentTime;
                        return result;
                    });
            }
            return Promise.resolve(_healthy);
        };
    })();

    services.push({ready, healthy, name});
};

module.exports = {
    livenessCheck,
    readinessCheck,
    register
};
