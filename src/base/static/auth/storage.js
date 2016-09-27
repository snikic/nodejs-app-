'use strict';

((root, factory) => {
    const _getSiteIdStore = (storeObj, siteId) => storeObj.session.namespace(siteId);

    const _debugSiteId = 'debug';

    const _isDebug = storeObj => storeObj.get('debug', false); // default to false

    const ${artifactId}Override = (base, storeObj) => {
        return {'getSiteId': fallBackSiteId => {
            // override the getSiteId method
            const actualSiteId = base.getSiteId(fallBackSiteId);
            return _isDebug(storeObj) ? storeObj.get('lastDebugSiteId', actualSiteId) : actualSiteId;
        }};
    };

    const _getDebugSiteIdStore = (storeObj, siteId) => _getSiteIdStore(storeObj, _isDebug(storeObj) ? _debugSiteId : siteId);

    if (typeof define === 'function' && define.amd) {
        // Now we're wrapping the factory and assigning the return
        // value to the root (window) and returning it as well to
        // the AMD loader.
        define(['store2'], store => {
            // create '${artifactId}' if not already present, else update with new properties
            // --> use debug siteId information, if available; else return actual information
            const ${artifactId}Base = factory(_getDebugSiteIdStore, store);
            root.${artifactId} = Object.assign(root.${artifactId} || {}, ${artifactId}Base, ${artifactId}Override(${artifactId}Base, store));

            // expose some methods only via requireJS
            // --> always use the actual siteId information, even if debug information are available
            const base = factory(_getSiteIdStore, store);
            return Object.assign({
                'getSiteIdStore': siteId => _getSiteIdStore(store, base.getSiteId(siteId)),
                'clearAll': () => {
                    store.session.clear(); // sessionStore
                    // don't clear localStorage, could contain information which should persist after a logout (to be reused after the next login)
                    // store.clear(); // localStore
                },
                'isDebug': () => _isDebug(store),
                'enableDebug': (siteId, bearerToken) => {
                    _getSiteIdStore(store, _debugSiteId).set('oauthToken', bearerToken);
                    store.set('lastDebugSiteId', siteId);
                    store.set('debug', true);
                },
                'setDebugCsds': csds => _getSiteIdStore(store, _debugSiteId).set('csds', csds),
                'disableDebug': () => {
                    _getSiteIdStore(store, _debugSiteId).clear();
                    store.remove('lastDebugSiteId');
                    store.set('debug', false);
                },
                'getClientId': () => store.get('clientId')
            }, base);
        });
    } else {
        // create '${artifactId}' if not already present, else update with new properties
        // --> use debug siteId information, if available; else return actual information
        const ${artifactId}Base = factory(_getDebugSiteIdStore, root.store);
        root.${artifactId} = Object.assign(root.${artifactId} || {}, ${artifactId}Base, ${artifactId}Override(${artifactId}Base, root.store));
    }
})(this, (siteIdStoreFunc, store) => { // eslint-disable-line no-invalid-this
    const pathMatcher = /\/a\/([^\s\/]+)\//;
    const pathMatch = pathMatcher.exec(location.pathname);
    const siteId = pathMatch ? pathMatch[1] : null;

    if (siteId) {
        store.set('lastSiteId', siteId);
    }

    const _getSiteId = fallBackSiteId => siteId || store.get('lastSiteId', fallBackSiteId);

    const _getSessionStore = () => siteIdStoreFunc(store, _getSiteId('unknown'));

    return {
        'getSiteId': fallBackSiteId => _getSiteId(fallBackSiteId),
        'getData': () => _getSessionStore().getAll(),
        'getCsrf': () => _getSessionStore().get('csrf'),
        'getToken': () => _getSessionStore().get('oauthToken'),
        'getLastUpdated': () => _getSessionStore().get('lastUpdated'),
        'getLastValidated': () => _getSessionStore().get('lastValidated'),
        'getCsds': lpService => {
            const csds = _getSessionStore().get('csds');
            if (lpService && csds) {
                for (let csdsEntry of csds.baseURIs) {
                    if (lpService === csdsEntry.service) {
                        return csdsEntry.baseURI;
                    }
                }
                return null;
            }
            return csds;
        },
        'getZone': () => _getSessionStore().get('zone'),
        'getUsername': () => _getSessionStore().get('config.loginName'),
        'getUserId': () => _getSessionStore().get('config.userId')
    };
});
