'use strict';

/**
 * jscpd reporter for TeamCity.
 *
 * User: jmollner
 * Date: 18/05/16
 */

/**
 * Escape special characters with the respective TeamCity escaping.
 * See below link for list of special characters:
 * https://confluence.jetbrains.com/display/TCD9/Build+Script+Interaction+with+TeamCity
 * @param {string} str An error message to display in TeamCity.
 * @returns {string} An error message formatted for display in TeamCity
 */
const escapeTeamCityString = str => {
    if (!str) {
        return '';
    }

    return str.replace(/\|/g, '||')
        .replace(/\'/g, '|\'')
        .replace(/\n/g, '|n')
        .replace(/\r/g, '|r')
        .replace(/\u0085/g, '|x') // TeamCity 6
        .replace(/\u2028/g, '|l') // TeamCity 6
        .replace(/\u2029/g, '|p') // TeamCity 6
        .replace(/\[/g, '|[')
        .replace(/\]/g, '|]');
};

const reportName = 'JSCPD Violations';

// options: supplied by jscpd to all reporters
module.exports = function(options) { // eslint-disable-line no-unused-vars
    let output = `##teamcity[testSuiteStarted name='${reportName}']\n`;

    // this is fine here, since we are within the context of the Report object:
    // https://github.com/kucherenko/jscpd#reporters
    const clones = this.map.clones; // eslint-disable-line no-invalid-this

    const refSorted = {};
    clones.forEach(clone => {
        refSorted[clone.firstFile] = refSorted[clone.firstFile] || [];
        refSorted[clone.firstFile].push(clone);
    });

    Object.keys(refSorted).forEach(key => {
        output += `##teamcity[testStarted name='${reportName}: ${escapeTeamCityString(key)}']\n`;
        refSorted[key].forEach(clone => {
            const message = escapeTeamCityString(`${clone.linesCount} duplicate lines of code found, starting at line ${clone.firstFileStart}. Second location: ${clone.secondFile} (line ${clone.secondFileStart})`);
            output += `##teamcity[testFailed name='${reportName}: ${escapeTeamCityString(key)}' message='${message}']\n`;
        });
        output += `##teamcity[testFinished name='${reportName}: ${escapeTeamCityString(key)}']\n`;
    });

    output += `##teamcity[testSuiteFinished name='${reportName}']\n`;

    // [raw, dump, log]
    return [output, null, output];
};
