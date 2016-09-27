'use strict';

define(['auth/storage', 'ui/base', 'ui/dialog'], (storage, ui, dialog) => {
    const sessionStore = window.store.session.namespace(window.${artifactId}.getSiteId());

    const _wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    const _validateSession = () => {
        return new Promise((resolve, reject) => {
            const token = storage.getToken();

            if (token) {
                sessionStore.set('lastValidated', Date.now());
                const config = {
                    'method': 'GET',
                    'cache': 'no-cache',
                    'headers': {
                        'X-LP-ACCOUNT': storage.getSiteId(),
                        'X-LP-TOKEN': storage.getToken(),
                        'X-LP-USER': storage.getUserId()
                    }
                };
                fetch('/api/check', config)
                    .then(response => {
                        if (response.ok === true) return response;
                        throw new Error(`Token check did not succeed (i.e. did not receive a 2xx status code); was ${response.status}`);
                    })
                    .then(response => resolve(response))
                    .catch(error => reject(error));
            } else {
                reject(new Error('No token present!'));
            }
        }).then(response => {
            ui.updateTokenData();
            return response;
        });
    };

    const _validateSessionRetry = retry => {
        if (retry < 0) return Promise.reject(new Error('Token validation failed after all retries!'));

        return _validateSession()
            // wait for 5sec if failed and try again
            .catch(() => _wait(5000).then(() => _validateSessionRetry(retry - 1)))
            // all retries failed
            .catch(err => {
                if (window.analytics) {
                    window.analytics('send', {
                        'hitType': 'event',
                        'eventCategory': 'auth', // 'Typically the object that was interacted with'
                        'eventAction': 'failure' // 'The type of interaction
                    });
                }
                sessionStore.clear();
                dialog.show({
                    'type': 'alert',
                    'text': 'Session expired: The session token isn\'t valid anymore.',
                    'okButtonText': 'Login again'
                }).then(() => { window.location = '/login'; });
                throw err;
            });
    };

    return {
        'init': () => {
            const retryTimes = 2;
            return _validateSessionRetry(retryTimes)
                .then(response => {
                    const id = setInterval(() => _validateSessionRetry(retryTimes).catch(() => clearInterval(id)), 60 * 1000); // every minute
                    return response;
                });
        },
        'validateSession': _validateSession
    };
});
