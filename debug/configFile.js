'use strict';

/**
 * Creates a local ${artifactId} configuration if not present so far.
 *
 * User: jmollner
 * Date: 02/06/16
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const Hjson = require('hjson');
const logger = require(path.join(__dirname, '../src/base/logger'))('configFile');

const ${artifactId}Folder = '${artifactId}';
const configFile = 'app.conf';

const ${artifactId}FolderPath = path.join(os.homedir(), ${artifactId}Folder);
const configFilePath = path.join(${artifactId}FolderPath, configFile);


const createConfigFile = () => {
    logger.info(`No local ${artifactId} config file found. Going to create a new one with "debug" set to true in location: ${configFilePath}`);

    fs.mkdir(${artifactId}FolderPath, (err) => {
        if (err) {
            if (err.code === 'EEXIST') {
                logger.debug('${artifactId} folder exists, creating file...');
            }
            else {
                logger.error(`Failed to create ${artifactId} folder: ${err}`)
                return;
            }
        }
        else {
            fs.writeFile(configFilePath, '"debug": true', 'utf8', err2 => {
                if (err2) return logger.error(`Failed to create new ${artifactId} app.conf config file: ${err2}`);
                return logger.debug('New ${artifactId} config file successfully created.');
            });
        }
    });
};

module.exports.check = () => {
    fs.stat(configFilePath, (err, stats) => {
        if (err) return createConfigFile();

        if (stats.isFile()) {
            logger.debug(`Local ${artifactId} config file found in location: ${configFilePath}`);
            return fs.readFile(configFilePath, 'utf8', (err2, contents) => {
                if (err2) return logger.error(`Local ${artifactId} config file exists in location '${configFilePath}', but cannot be read: ${err2}`);

                const config = Hjson.parse(contents);
                if (config.debug === true) {
                    logger.debug('Debug mode is enabled locally in the ${artifactId} config. Local modules will be loaded.');
                } else {
                    logger.warn('Debug mode is disabled locally in the ${artifactId} config. NO LOCAL MODULES WILL BE LOADED!');
                }
                return config;
            });
        }

        // else: not a file...
        return createConfigFile();
    });
};
