'use strict';

/**
 * Some utility functionality.
 *
 * User: jmollner
 * Date: 31/01/16
 */

// this is a CLI tool, so sync calls
/* eslint-disable no-sync */

const path = require('path');
const childProcess = require('child_process');
const config = require(path.join(__dirname, '../src/base/config'));

const _isPrivileged = (() => {
    if (process.platform === 'win32') {
        // windows
		// http://stackoverflow.com/a/11995662/64949
        try {
            childProcess.execFileSync('net.exe', ['session']);
            // access allowed
            return true;
		} catch (err) {
            // access denied exception
            return false;
		}
	} else {
		// osx/linux
        return process.getuid && process.getuid() === 0;
	}
})();

module.exports = {
    'isPrivileged': () => _isPrivileged,
    'setLogLevel': level => {
        config.set('logLevel', level ? level : 'info');
    }
};
