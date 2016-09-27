'use strict';

define(['auth/storage', 'util/util', 'store2'], (storage, util, store2) => {
    const _cookies = 'cookies';
    const _sessionStorage = 'sessionStorage';
    const _localStorage = 'localStorage';

    const _getNamespace = () => {
        const urlModuleData = util.getModuleData();
        return `untrusted-userData.${storage.getSiteId()}.${urlModuleData ? urlModuleData[1] : 'unknown'}`;
    };
    const _getStore = () => store2.session.namespace(_getNamespace());

    return {
        'getState': () => {
            return {
                'cookies': _getStore().get(_cookies, ''),
                'sessionStorage': _getStore().get(_sessionStorage, {}),
                'localStorage': _getStore().get(_localStorage, {})
            };
        },
        'setState': state => {
            if (state) {
                if (state.cookies) {
                    _getStore().set(_cookies, state.cookies);
                }
                if (state.sessionStorage) {
                    _getStore().set(_sessionStorage, state.sessionStorage);
                }
                if (state.localStorage) {
                    _getStore().set(_localStorage, state.localStorage);
                }
            }
        }
    };
});
