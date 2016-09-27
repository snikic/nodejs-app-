'use strict';

/**
 * Locate, manage, and access bundled modules/apps.
 *
 * User: jmollner
 * Date: 01/03/16
 */

const path = require('path');
const fs = require('fs');
const EventEmitter = require('events').EventEmitter;
const isThere = require('is-there');
const glob = require('glob');
const merge = require('merge');
const readJson = require('read-package-json');
const logger = require('./logger')('moduleManagement');
const config = require('./config');
const domain = config.getDomain();

const eventEmitter = new EventEmitter();

const isDebug = config.isDebug();
const localModuleFolder = path.join(config.get('homeFolder'), 'modules');

const modulesNpmPackage = '${artifactId}-modules';
const modulePrefix = '${artifactId}-module-';

const modulesPackage = require.resolve(modulesNpmPackage);
const modulesBasePath = path.join(path.dirname(modulesPackage), 'node_modules');

const ${artifactId}Modules = {};
const ${artifactId}ModuleNames = [];
// non-sensitive module configuration that can be exposed to the client
const ${artifactId}ClientModules = {};
// if the module loading is completed
let _initialized = false;

// using a default config simplifies later the access (makes the need for 'undefined' checks obsolete)
const defaultConfig = {
    '${artifactId}': {
        'config': {
            'iFrame': true,
            'csp': {},
            'include': {
                'defaultStyle': true
            }
        }
    }
};
// this config is not overridable by the module config and will be applied to all configurations at the end (mostly due to security)
const configOverrides = {
    '${artifactId}': {
        'config': {
            'csp': {
                // below the default values that can NOT be overridden by the module
                'directives': {
                    'defaultSrc': [domain],
                    'childSrc': ['blob:'], // do not allow iFrames
                    'baseUri': [domain], // restrict the uri of the base element/tag; does not default to 'defaultSrc' so specify explicitly
                    'objectSrc': ['\'none\''], // say no to flash and other plugins
                    'formAction': ['\'none\''], // form "targets", does not default to 'defaultSrc' so specify explicitly
                    'frameAncestors': [domain], // modules should only be embedded into the ${artifactId} app; does not default to 'defaultSrc' so specify explicitly
                    'sandbox': ['allow-scripts', 'allow-same-origin', 'allow-modals'], // should be the same as the CSP sandbox properties in the data.js file
                    'upgradeInsecureRequests': '', // enforce HTTPS (no value needed)
                    'blockAllMixedContent': '', // prevent loading assets using HTTP (when the page is using HTTPS) (no value needed)
                    'reflectedXss': 'block', // activate heuristics to block reflected XSS attacks
                    'referrer': 'origin' // only send the origin in the referrer header (and not the complete url)
                },
                'browserSniff': false
            }
        }
    }
};

const initialized = () => {
    return new Promise(resolve => {
        if (_initialized) return resolve();
        return eventEmitter.once('initialized', () => resolve());
    });
};

const loadModule = modulesPath => {
    const configPath = path.join(modulesPath, 'package.json');
    // TODO: case insensitive path ? might be platform-dependent
    const webFolder = path.join(modulesPath, 'web');
    const indexFile = path.join(webFolder, 'app.core.xhtml');
    if (isThere(configPath) && isThere(indexFile)) {
        return new Promise((resolve, reject) => {
            readJson(configPath, logger, true, (err, properties) => {
                if (err) {
                    logger.error(`Failed to read package.json file: ${configPath}`);
                    return reject(err);
                }

                Object.assign(properties, {webFolder, indexFile});
                properties.id = properties.name.replace(modulePrefix, '');

                const mergedProps = merge.recursive(true, defaultConfig, properties);

                // readme handling
                if (!mergedProps.hasOwnProperty('readme') || mergedProps.readme === 'ERROR: No README data found!') {
                    glob(path.join(modulesPath, 'README?(.md)'), {'nocase': true}, (err2, readmeFiles) => {
                        if (err) return reject(err2);
                        if (Array.isArray(readmeFiles) && readmeFiles.length > 0) {
                            const readmeFile = readmeFiles[0];
                            fs.readFile(readmeFile, 'utf8', (err3, readmeContent) => {
                                // maybe not readable, or something... ignore if it happens
                                if (!err3) {
                                    mergedProps.readme = readmeContent;
                                    mergedProps.readmeFilename = readmeFile;
                                }
                            });
                        } else {
                            delete mergedProps.readme; // replace with reflect api when we update to the next major node LTS version
                        }
                        return null;
                    });
                }

                // construct CSP config
                const csp = mergedProps.${artifactId}.config.csp;
                Object.keys(csp).forEach(key => {
                    if (key.endsWith('Src') && Array.isArray(csp[key])) {
                        csp[key].push(domain);
                    }
                });
                mergedProps.${artifactId}.config.csp = {
                    'directives': csp
                };

                return resolve(merge.recursive(mergedProps, configOverrides)); // do NOT clone the object!!
            });
        });
    }

    if (!isThere(configPath)) {
        logger.warn(`Ignoring module: ${modulesPath} > package.json file is missing.`);
    }
    if (!isThere(webFolder)) {
        logger.warn(`Ignoring module: ${modulesPath} > The web folder is missing.`);
    }
    if (!isThere(indexFile)) {
        logger.warn(`Ignoring module: ${modulesPath} > app.core.xhtml file within the web folder is missing.`);
    }
    return Promise.reject(new Error(`Invalid module: ${modulesPath}`));
};

const loadModules = modulePaths => {
    return Promise.all(modulePaths.map(modulePath => {
        return loadModule(modulePath).catch(err => {
            // catch error, so we continue loading following modules (Promise.all fails fast)
            logger.error(`Failed to load module from path: ${modulePath}. Will be ignored. ${JSON.stringify(err)}`);
            return null;
        });
    }))
    .then(modules => Array.isArray(modules) ? modules : [modules])
    .then(modules => modules.filter(module => module !== null)) // if null, the module loading failed
    .then(modules => {
        const moduleMap = {};
        modules.forEach(module => (moduleMap[module.name] = module));
        return moduleMap;
    });
};

// load production modules
const loadProdModules = () => {
    return new Promise((resolve, reject) => {
        readJson(modulesPackage, logger, true, (err, properties) => {
            if (err) return reject(err);

            const dependencies = properties.dependencies;
            const modulePaths = Object.keys(dependencies)
                .map(moduleName => path.join(modulesBasePath, moduleName));

            const productionModules = loadModules(modulePaths)
                .then(modules => {
                    Object.keys(modules).forEach(moduleName => (modules[moduleName].specVersion = dependencies[moduleName]));
                    return modules;
                });
            return resolve(productionModules);
        });
    });
};

// load local/dev modules
const loadLocalModules = () => {
    if (isDebug) {
        return new Promise((resolve, reject) => {
            logger.info(`Loading local modules from path: ${localModuleFolder}`);
            glob(`${localModuleFolder}/*/`, (err, modulePaths) => { // match all subFolder
                if (err) return reject(err);
                return resolve(loadModules(modulePaths));
            });
        });
    }

    logger.debug('No local modules are loaded since the debug mode is disabled. If ${artifactId} runs in production, '
        + 'this is the expected/intended behaviour!');
    return Promise.resolve({});
};

const postModuleLoad = () => {
    Object.keys(${artifactId}Modules).forEach(moduleName => {
        ${artifactId}ModuleNames.push(moduleName);

        const mc = ${artifactId}Modules[moduleName];
        // all "whitelisted" properties that can be exposed
        ${artifactId}ClientModules[moduleName] = {
            'id': mc.id,
            'name': mc.name,
            'version': mc.version,
            'author': mc.author,
            'contributors': mc.contributors,
            'description': mc.description,
            'homepage': mc.homepage,
            '${artifactId}': {
                'iFrame': mc.${artifactId}.config.iFrame, // TODO: move to separate API call
                'description': mc.${artifactId}.description,
                'nameShort': mc.${artifactId}.nameShort,
                'nameLong': mc.${artifactId}.nameLong
            }
        };
    });
    eventEmitter.emit('initialized');
};

// load all modules
(() => {
    initialized().then(() => (_initialized = true));
    logger.debug('Initializing module loading...');
    // load production modules (as specified in the modules definition)
    const productionModules = loadProdModules()
        .then(modules => {
            logger.info(`Loaded ${Object.keys(modules).length} production module(s)`);
            return modules;
        })
        .catch(err => {
            // catch error, so we continue loading following modules (Promise.all fails fast)
            logger.error(`Failed to load production modules. No production modules will be available! ${err}`);
            return null;
        });

    // load local/dev modules (iff debug==true and local modules are available)
    const localModules = loadLocalModules()
        .then(modules => {
            logger.info(`Loaded ${Object.keys(modules).length} local module(s)`);
            return modules;
        })
        .catch(err => {
            // catch error, so we continue loading following modules (Promise.all fails fast)
            logger.error(`Failed to load local modules. No local modules will be available! ${err}`);
            return null;
        });

    // why this way? we nee to differentiate between local and production modules (since we "prefer" local ones);
    // - production modules plus local modules (iff debug==true and local modules are available).
    //   if identical name, prefer local modules over production modules to support development of (newer versions) of a module
    productionModules.then(pModules => {
        Object.assign(${artifactId}Modules, pModules); // permits null
        localModules.then(lModules => {
            Object.assign(${artifactId}Modules, lModules); // permits null
            logger.info(`Loaded ${Object.keys(${artifactId}Modules).length} module(s) in total`);
            postModuleLoad();
        });
    });
})();

const normalize = moduleName => moduleName.indexOf(modulePrefix) === 0 ? moduleName : modulePrefix + moduleName;

const getModule = (moduleName, serverSide) => (serverSide === true ? ${artifactId}Modules : ${artifactId}ClientModules)[normalize(moduleName)];

const isAvailable = moduleName => typeof ${artifactId}Modules[normalize(moduleName)] === 'object';

const getModules = serverSide => serverSide === true ? ${artifactId}Modules : ${artifactId}ClientModules;

const sortedModules = serverSide => {
    const modules = getModules(serverSide);
    const moduleArray = Object.keys(modules).map(key => modules[key]);
    return moduleArray.sort((m1, m2) => m1.id.localeCompare(m2.id, 'en'));
};

module.exports = {
    'basePath': () => modulesBasePath,
    'list': () => ${artifactId}ModuleNames,
    'count': () => ${artifactId}ModuleNames.length,
    normalize,
    isAvailable,
    getModule, // returns object!!
    sortedModules, // returns array!!
    getModules, // returns object!!
    'getIndexFile': moduleName => isAvailable(moduleName) ? getModule(moduleName, true).indexFile : null,
    initialized
};
