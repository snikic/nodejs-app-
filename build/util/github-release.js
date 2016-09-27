#set( $symbol_pound = '#' )
#set( $symbol_dollar = '$' )
#set( $symbol_escape = '\' )
#set( $symbol_left = '(' )
#set( $symbol_quote = '`' )
'use strict';

const path = require('path');
const fs = require('fs');

const GitHubApi = require('github');
const semver = require('semver');
const request = require('request');

/* eslint-disable no-process-env */
// ci user
const username = process.env.username || 'ci_user';
const password = process.env.password || 'Ci123456';
/* eslint-enable no-process-env */

const githubDomain = 'lpgithub.dev.lprnd.net';

const repo = {
    'user': 'RnD-Mannheim',
    'repo': '${artifactId}-app'
};

const github = new GitHubApi({
    'debug': false,
    'protocol': 'https',
    'host': githubDomain,
    'pathPrefix': '/api/v3',
    'headers': {
        'user-agent': '${artifactId}-release'
    },
    Promise,
    'followRedirects': false, // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
    'timeout': 5000
});

github.authenticate({
    'type': 'basic',
    username,
    password
});

/* eslint-disable no-console */
const log = (message, options) => options && options.gruntLog ? options.gruntLog.writeln(message) : console.log(message);
const logError = (error, options) => {
    if (options) {
        if (options.gruntLog) options.gruntLog.error(error);
        // http://gruntjs.com/frequently-asked-questions#why-doesn-t-my-asynchronous-task-complete
        if (options.callback) options.callback(false);
    }
    if (!options || !options.gruntLog) console.error(error);
};
/* eslint-enable no-console */

const _getNewVersion = (releases, preRelease) => {
    const preReleaseIdentifier = 'beta';

    const release = Array.isArray(releases) && releases.length > 0
        ? releases[0]
        : releases;

    const tagVersion = release && release.tag_name
        ? release.tag_name
        : `v1.0.0-${preReleaseIdentifier}.0`;
    const currentSemVer = tagVersion && tagVersion.startsWith('v')
        ? tagVersion.substr(1)
        : tagVersion;

    const newSemVer = semver.inc(currentSemVer, preRelease ? 'prerelease' : 'patch', preReleaseIdentifier);
    return `v${newSemVer}`;
};

const _createNewRelease = options => {
    const newVersion = options.newVersion;
    const preRelease = options.preRelease;
    const asset = options.asset;
    const buildId = options.buildId || 0;
    const buildNo = options.buildNo || 'unknown';
    const repoPath = `${repo.user}/${repo.repo}`;
    const rText = preRelease ? 'Pre release' : 'Stable release';
    // the new multiLine `` strings are not working with the github api :/
    const body = [
        `**${rText} ${newVersion} of ${artifactId}**`,
        `<sub>*[TeamCity build #${buildNo}](http://tlvci.tlv.lpnet.com/viewLog.html?buildId=${buildId})*</sub>\n`,
        'To run ${artifactId} locally, follow the following steps¹:\n',
        `1. Download the \`${path.basename(asset)}\` file below`,
        `2. Run \`docker-compose up\` from within the folder which contains the \`${path.basename(asset)}\` file`,
        '3. Grab some :coffee:. Seriously, if you are not located in the TLV office, this step can take quite some time when executed the first time',
        '4. ${artifactId} is running at [${artifactId}.dev.lprnd.net](https://${artifactId}.dev.lprnd.net) (https only)',
        '5. Get some :cake:. You deserve [it](http://knowyourmeme.com/memes/the-cake-is-a-lie)',
        `6. Find more information view the [readme](/README.md) and visit the [wiki pages](../../wiki)\n`,
        '<sub>1) Requires \`docker-compose\` installation, which is part of the [Docker Toolbox](https://www.docker.com/products/docker-toolbox). No need to install NodeJS or npm.</sub>'
    ];

    github.repos.createRelease(Object.assign({}, repo, {
        'tag_name': newVersion,
        'prerelease': preRelease,
        'name': `${artifactId} - ${newVersion}`,
        'body': body.join('\n')
    }), (err, newRelease) => {
        if (err) return logError(`Creating a new GH release failed: ${err}`, options);
        log(`New (pre)release created. See: ${newRelease.html_url}`, options);
        if (asset) {
            // due to: https://github.com/mikedeboer/node-github/issues/320
            const req = request({
                'method': 'POST',
                'auth': {
                    'user': username,
                    'pass': password
                },
                'headers': {
                    'content-type': 'application/x-yaml', // or: text/x-yaml
                    'user-agent': '${artifactId}-release'
                }
            }, (err2, response) => {
                if (err2) return logError(`Asset/file upload failed: ${err2}`, options);
                log(`Asset/file upload successful! Server responded with: ${response.statusCode}`, options);
                // http://gruntjs.com/frequently-asked-questions#why-doesn-t-my-asynchronous-task-complete
                if (options.callback) options.callback(true);
                return null;
            });
            return fs.createReadStream(asset).pipe(req);
        } // else:
        if (options.callback) options.callback(true);
        return null;
    });
};

const publishRelease = options => {
    const opt = options || {};
    const func = opt.preRelease ? github.repos.getReleases : github.repos.getLatestRelease;

    func(repo, (err, releases) => {
        if (err) return logError(`Getting last GH release failed: ${err}`, options);
        opt.newVersion = _getNewVersion(releases, opt.preRelease);
        // if "real" release... bump version in pom.xml and package.json and commit/push
        return _createNewRelease(opt);
    });
};

// publishRelease({preRelease: true, asset: path.join('.', 'docker-compose.yml')});

module.exports = {
    publishRelease
};
