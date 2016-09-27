'use strict';

/**
 * Installs the modules/apps for ${artifactId}.
 *
 * User: jmollner
 */

const shell = require('shelljs');

const repository = 'RnD-Mannheim/${artifactId}-modules';
const currentDir = shell.pwd();
shell.echo(`Working dir: ${currentDir}`);

const gitExec = shell.which('git');
if (gitExec) {
    shell.echo(`Using git executable: ${gitExec}`);
} else {
	shell.echo('Sorry, this script requires git');
    shell.exit(1);
}

const bashExec = shell.which('bash');
if (bashExec) {
    shell.echo(`Using bash executable: ${bashExec}`);
} else {
	shell.echo('Sorry, this script requires bash');
    shell.exit(1);
}

const sshExec = shell.which('ssh-agent');
if (sshExec) {
    shell.echo(`Using ssh-agent executable: ${sshExec}`);
} else {
	shell.echo('Sorry, this script requires ssh-agent');
    shell.exit(1);
}

const npmExec = shell.which('npm');
if (npmExec) {
    shell.echo(`Using npm executable: ${npmExec}`);
} else {
	shell.echo('Sorry, this script requires npm');
    shell.exit(1);
}

shell.chmod('600', './build/modules-read-access_rsa');

// no-optional: don't install optional dependencies
// production: don't install dev dependencies (npm2)
// only=production: don't install dev dependencies (npm3)
// no-bin-links: argument will prevent npm from creating symlinks for any binaries --> not needed
// global-style: install modules in sub folders (npm3; default on npm2)
const cmd = `ssh-agent bash -c 'ssh-add ./build/modules-read-access_rsa; `
    + `npm install git+ssh://git@lpgithub.dev.lprnd.net:${repository}.git `
    + `--no-optional --production --only=production --global-style'`;

if (shell.exec(cmd).code !== 0) {
    shell.echo('Error: "git clone or npm install" failed');
    shell.exit(1);
}
// do not exit here (otherwise e.g. grunt will not execute)
// shell.exit(0);
