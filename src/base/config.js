'use strict';

/**
 * Allows to access the application config by setting up the configuration.
 *
 * User: jmollner
 * Date: 09/11/15
 */

const name = '${artifactId}';
const os = require('os');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const hjson = require('hjson').rt;
const expandHomeDir = require('expand-home-dir');

const packageFile = require(path.join(__dirname, '..', '..', 'package.json'));

// the ordering is important, first data source with the desired key "wins"
const conf = require('nconf')
    .env({'separator': '_'}) // since ':' or '.' are not allowed
    .file('production', {'file': `/liveperson/code/${name}/app.conf`, 'format': hjson})
    .file('userHome', {'file': path.join(os.homedir(), name, 'app.conf'), 'format': hjson})
    .file('default', {'file': path.join(__dirname, '..', 'config', 'app.conf'), 'format': hjson});

// set application name
conf.set('name', name);

// make homeFolder path absolute if ~ is used (node doesn't resolve this automatically)
conf.set('homeFolder', expandHomeDir(conf.get('homeFolder')));

conf.set('serverStart', Date.now());

const logger = require('./logger_internal')(conf, 'config');

// load build information if available
fs.readFile(path.join(__dirname, '..', 'config', 'build.json'), 'utf8', (err, data) => {
    if (err) {
        logger.debug('The optional "build.json" is not present. It\'s only available when ${artifactId} was build on TeamCity.');
        conf.set('build', {});
    } else {
        conf.set('build', JSON.parse(data));
    }
});

const lookup = (configGetKey, configSetKey) => {
    const hostName = conf.get(configGetKey);
    dns.lookup(hostName, {'all': false}, (err, address) => {
        if (!err && typeof address === 'string') {
            conf.set(configSetKey, address);
            logger.debug(`Set '${configSetKey}' to value '${address}'.`);
        }
    });
};

// resolving these host names will only work when running in kubernetes
lookup('kubernetes:app:name', 'kubernetes:app:address');
lookup('kubernetes:web:name', 'kubernetes:web:address');

conf.set('proxy', conf.get('proxyHosts')[conf.get('datacenter')] || 'NOT_AVAILABLE');

// small helper methods...
conf.isLocal = () => conf.get('datacenter') === 'localDev';
conf.isDeployed = () => !conf.isLocal();
conf.getName = () => name;
conf.getVersion = () => packageFile.version;
conf.getDataCenter = () => conf.get('datacenter');
conf.getZone = () => conf.get('zone');
conf.getDomain = () => `https://${conf.get('domain')}`;
conf.getGA = () => `${conf.get('ga:account')}-${conf.get('ga:id')}`;
// why this way? conf.get('debug') can be of type boolean (when accessed from config file) or of type string (when overridden env parameter)
conf.isDebug = () => String(conf.get('debug')).toLowerCase() === 'true';
// if a https proxy is required for external requests (i.e. requests outside of the LP farm) --> needed for Alpha and GA, but not locally or in QA
conf.requiresProxy = () => !conf.get('domain').endsWith('.dev.lprnd.net');

module.exports = conf;
