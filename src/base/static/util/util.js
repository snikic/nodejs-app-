'use strict';

define(['auth/storage'], storage => {
    const getBasePath = () => `/a/${storage.getSiteId()}`;

    const _domain = window.document.querySelector('html').dataset.domain;

    // matches a module resource (and all sub-resources of a module)
    const _moduleRegex = new RegExp(`${getBasePath().split('/').join('\\/')}\/module\/([^S\/]+)\/(.*)`);

    return {
        // 'getRegex': () => _moduleRegex,
        getBasePath,
        'isOnModulePage': path => _moduleRegex.test(path || window.location.pathname),
        'getModuleData': () => window.location.pathname ? window.location.pathname.match(_moduleRegex) : null, // module data from url
        'getDomain': () => _domain
    };
});
