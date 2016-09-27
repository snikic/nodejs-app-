'use strict';

((root, factory) => {
    if (typeof define === 'function' && define.amd) {
        // Now we're wrapping the factory and assigning the return
        // value to the root (window) and returning it as well to
        // the AMD loader.
        define(['auth/storage'], storage => {
            const tokenify = factory(storage);
            // create '${artifactId}' if not already present, else update with new properties
            root.${artifactId} = Object.assign(root.${artifactId} || {}, tokenify);
            return tokenify;
        });
    } else {
        // create '${artifactId}' if not already present, else update with new properties
        const ${artifactId} = root.${artifactId} || {};
        root.${artifactId} = Object.assign(${artifactId}, factory(${artifactId}));
    }
})(this, storage => { // eslint-disable-line no-invalid-this
    return {
        tokenify: args => {
            const headers = Object.assign(
                args.headers ? args.headers : {},
                {'Authorization': `Bearer ${storage.getToken()}`}
            );
            return Object.assign(args, {headers});
        }
    };
});
