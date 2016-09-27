'use strict';

/**
 * Expose metrics about the server and service to Prometheus.
 *
 * User: jmollner
 * Date: 01/07/16
 */

const metrics = require('prom-client');
const register = metrics.register;
const HttpStatus = require('http-status');
const appMetrics = require('appmetrics');
const logger = require('./logger')('server_metrics');
const config = require('./config');

// node runtime metrics
(() => { // some encapsulation
    // and disable all the other stuff we don't need/use:
    ['profiling', 'mongo', 'socketio', 'mqlight', 'postgresql',
        'mqtt', 'mysql', 'redis', 'riak', 'memcached', 'oracledb',
        'oracle', 'strong-oracle', 'trace'].forEach(appMetrics.disable);
    // configure monitoring
    appMetrics.setConfig('http', {'filters': [{'pattern': '^(GET).*', 'to': ''}]}); // exclude get requests from monitoring

    const monitoring = appMetrics.monitor();
    monitoring.on('initialized', () => {
        const env = monitoring.getEnvironment();
        const appVersion = config.isDeployed()
            ? `${config.get('build').buildNumber} (${config.get('build').appTimestamp})`
            : '_staging_';
        logger.info(`Running ${artifactId} build ${appVersion} on ${env['os.name']} ${env['os.version']} (${env['os.arch']}) with PID ${env.pid}.`);
        // For debugging:
        // Object.keys(env).forEach(key => logger.silly(`> Env (${key}): ${env[key]}`));
    });

    const responseCode = new metrics.Counter('${artifactId}_response_code', 'The HTTP response status code returned by the app layer for non GET requests. The '
        + 'status codes are grouped into their classes', ['bucket']);
    const requestDuration = new metrics.Summary('${artifactId}_response_duration', 'The required time/duration to process a request by the app layer for non GET requests in milliseconds');
    monitoring.on('http', http => {
        // monitor >incoming< http requests
        // due to the specified filter, we only receive non GET requests (since we are not interested in stuff like resource loading)
        responseCode.inc({'bucket': `${Math.floor(http.statusCode / 100)}xx`});
        responseCode.inc({'bucket': 'total'});
        requestDuration.observe(http.duration);
    });
    const javascriptHeap = new metrics.Gauge('${artifactId}_javascript_heap', 'Heap information of the Node.js JavaScript runtime in byte', ['value']);
    monitoring.on('gc', gc => {
        javascriptHeap.set({'value': 'size'}, gc.size);
        javascriptHeap.set({'value': 'used'}, gc.used);
    });
    const eventLoopLatency = new metrics.Gauge('${artifactId}_eventloop_latency', 'Event loop latency information of the Node.js JavaScript runtime in milliseconds. Indicates the average latency of the last 5sec');
    monitoring.on('eventloop', eventLoop => {
        eventLoopLatency.set(eventLoop.latency.avg);
    });
    const eventTickTime = new metrics.Gauge('${artifactId}_event_tick_time', 'Event tick information of the Node.js JavaScript runtime in milliseconds. Indicates the average time of the last 60sec');
    monitoring.on('loop', loop => {
        eventTickTime.set(loop.average);
    });
    const cpuUtilizationProcess = new metrics.Gauge('${artifactId}_cpu_utilization_process', 'The percentage of CPU used by the Node.js/${artifactId} application itself. This is a value between 0.0 and 1.0');
    const cpuUtilizationSystem = new metrics.Gauge('${artifactId}_cpu_utilization_system', 'The percentage of CPU used by the system as a whole. This is a value between 0.0 and 1.0');
    monitoring.on('cpu', cpu => {
        cpuUtilizationProcess.set(cpu.process);
        cpuUtilizationSystem.set(cpu.system);
    });
    const memoryUtilizationProcess = new metrics.Gauge('${artifactId}_memory_utilization_process', 'The percentage of RAM used by the Node.js/${artifactId} application itself. This is a value between 0.0 and 1.0 (amount of RAM used by the Node.js application in bytes / total amount of RAM available in bytes)');
    const memoryUtilizationSystem = new metrics.Gauge('${artifactId}_memory_utilization_system', 'The percentage of RAM used by the system as a whole. This is a value between 0.0 and 1.0 (total amount of free RAM available in bytes / total amount of RAM available in bytes)');
    monitoring.on('memory', memory => {
        memoryUtilizationProcess.set(memory.physical / memory.physical_total);
        memoryUtilizationSystem.set(memory.physical_used / memory.physical_total);
    });
})();

module.exports = () => {
    return (req, res) => {
        res.setHeader('Content-Type', 'text/plain');
        res.status(HttpStatus.OK).send(register.metrics());
    };
};
