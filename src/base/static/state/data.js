'use strict';

define(['auth/storage'], storage => {
    const _get = (url, type) => {
        const config = {
            'method': 'GET', // this file loads/gathers data from the server --> GET
            'mode': 'same-origin',
            'headers': {
                'X-LP-ACCOUNT': storage.getSiteId(),
                'X-LP-TOKEN': storage.getToken(),
                'X-LP-USER': storage.getUserId()
            }
        };
        return fetch(url, config)
            .then(response => {
                if (response.ok === true) return response;
                throw new Error(`Failed to get module data. Server returned status code: ${response.status}`);
            })
            .then(response => Reflect.apply(response[type].bind(response), window, []));
    };

    const _cachedGet = (url, type) => {
        let data; // data or not present
        return () => {
            if (data) return Promise.resolve(data);
            return _get(url, type).then(resp => (data = resp));
        };
    };

    const getModules = _cachedGet('/api/modules', 'json');
    const getModule = moduleId => getModules().then(modules => modules[moduleId]);

    const getBuildInfo = _cachedGet('/api/build', 'json');

    // should be the same as the CSP sandbox settings in the module_management.js file
    const getSandboxProperties = () => 'allow-scripts allow-modals allow-same-origin';

    // all methods return a promise (except 'getSandboxProperties')
    return {
        getSandboxProperties,
        getModules,
        getModule,
        getBuildInfo
    };
});
