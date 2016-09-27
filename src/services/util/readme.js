'use strict';

/* eslint-disable */

/**
 * Created by sseedorf on 18/05/16.
 */

const path = require('path');
const fs = require('fs');
const isThere = require('is-there');
const marked = require('marked');
const config = require('../../base/config');
const logger = require('../../base/logger')('getReadme');
const moduleManager = require('../../base/module_management');

let renderer = new marked.Renderer();

// replace h1 - h5 headings with h5
renderer.heading = function (text, level) {
    if (level != 6) level = 5;
    return '<h' + level + ' class="_300 margin"' +'>' + text + '</h' + level + '>';
};

// format md tables as Flatkit theme 'static table'
renderer.table = function (header, body) {
    return '<table class="table table-striped b-t"><thead>' + header + '</thead><tbody>' + body + '</tbody></table>';
};

marked.setOptions({
    renderer: renderer,
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: true,
    smartLists: true,
    smartypants: false
});

module.exports = (req, res, next) => {
    const appId = req.query.app;
    logger.debug('Get readme file for app id '+appId);
    const module = moduleManager.getModule(appId, true);
    if (module.readmeFile) {
        fs.readFile(module.readmeFile, "utf8", function (err, data) {
            marked(data, (err, html) => {
                if (err) {
                    res.sendStatus(404);
                    return;
                }
                res.send(html);
                res.end();
            })
        });
    } else {
        res.sendStatus(404);
        return;
    }
};
