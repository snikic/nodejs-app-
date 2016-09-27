'use strict';

((root, factory) => {
    if (typeof define === 'function' && define.amd) {
        // Now we're wrapping the factory and assigning the return
        // value to the root (window) and returning it as well to
        // the AMD loader.
        define(['auth/storage'], storage => {
            return factory(storage);
        });
    }
    // create '${artifactId}' if not already present, else update with new properties
    const ${artifactId} = root.${artifactId} || {};
    root.${artifactId} = Object.assign(${artifactId}, factory(${artifactId}));
})(this, storage => { // eslint-disable-line no-invalid-this
    const getContentType = options => options.headers['Content-Type'] || options.headers['content-type'];

    return {
        'fetchify': (url, args) => {
            const fetchURL = `/fetch/${encodeURIComponent(url)}`;
            const options = {
                'method': 'GET',
                'mode': 'same-origin',
                'cache': 'no-cache',
                'headers': {
                    'X-LP-ACCOUNT': storage.getSiteId(),
                    'X-LP-TOKEN': storage.getToken(),
                    'X-LP-USER': storage.getUserId()
                }
            };

            const override = args || {};
            if (override.method) options.method = override.method;
            if (override.body) options.body = override.body;
            if (override.headers) options.headers = Object.assign({}, override.headers, options.headers);

            // if not set, set content type by default to JSON
            if (!getContentType(options)) {
                options.headers['Content-Type'] = 'application/json';
            }

            //  stringify object if content type is JSON but the body isn't a string yet
            if (getContentType(options) === 'application/json'
                && options.body // body exists
                && typeof options.body !== 'string') { // body wasn't converted to a string yet
                options.body = JSON.stringify(options.body);
            }

            return fetch(fetchURL, options)
                .then(response => {
                    if (response.headers.get('x-proxy') === 'true') {
                        // this was a proxied request
                        response.serverStatus = {};
                        response.serverStatus.${artifactId}Success = response.headers.get('x-proxy-server-status') !== 'error';
                        response.serverStatus.upstreamSuccess = response.headers.get('x-proxy-upstream-status') !== 'error';
                    }
                    return response;
                });
        }
    };
});
