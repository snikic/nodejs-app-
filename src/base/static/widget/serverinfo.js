'use strict';

// Get json response "/serverInfo" from server, which specifies the server zone
// NOTE: may be extended with other information in the future
define(['LpAuth', 'auth/storage'], (auth, storage) => {
    return () => {
        if (storage.getZone()) return Promise.resolve(storage.getZone());
        // else:
        return fetch('/api/info/server',
            {
                'method': 'GET',
                'headers': {
                    'X-LP-ACCOUNT': storage.getSiteId(),
                    'X-LP-TOKEN': storage.getToken(),
                    'X-LP-USER': storage.getUserId()
                }
            })
            .then(response => response.json())
            .then(json => {
                const store = storage.getSiteIdStore();
                store.set('zone', json.zone);
                return json.zone;
            });
    };
});
