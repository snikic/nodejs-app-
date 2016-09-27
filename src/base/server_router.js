'use strict';

/**
 * Exposes server health and metrics.
 *
 * User: jmollner
 * Date: 25/07/16
 */

const express = require('express');

const metrics = require('./server_metrics');
const health = require('./server_health');

const serverRouter = () => {
    const router = new express.Router({'mergeParams': true});

    // expose metrics about the server and service to Prometheus
    router.get('/metrics', metrics());
    // expose server/service health (according to the LP service health RFC) to kubernetes
    router.get('/_health/startup', health.readinessCheck());
    router.get('/_health/current', health.livenessCheck());

    return router;
};

module.exports = serverRouter;
