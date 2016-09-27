'use strict';

define(['LpAuth', 'auth/storage', 'ui/dialog', 'navigation/base', 'util/util'], (LpAuth, storage, dialog, navigation, util) => {
    const _showLoadingDialog = () => {
        dialog.show({
            'type': 'alert',
            'text': 'Please wait... logging in...',
            'okButtonText': 'Cancel'
        }).then(() => { window.location = '/login'; });
    };

    return {
        'init': () => {
            return new Promise((resolve, reject) => {
                const isOnModulePage = util.isOnModulePage(); // call before getOtk()!!
                const lpAuth = new LpAuth();
                // otk is only available on the start page (and not an app page)
                const otk = isOnModulePage === true ? null : lpAuth.getOtk();
                const siteId = storage.getSiteId();

                if (!siteId) {
                    window.location.href = '/login';
                    reject(); // should usually not be reached... since we redirect
                    return;
                }

                // only verify if we are on the start page; otherwise it could happen that
                // an app uses the anchor "#" which could be faulty be detected as OTK
                if (otk) {
                    // otk present: use the otk to complete login...
                    const store = storage.getSiteIdStore(siteId);

                    if ($.isReady) {
                        // dom is already ready, show modal instantly
                        _showLoadingDialog();
                    } else {
                        // show modal as soon as the dom is ready
                        $(() => _showLoadingDialog());
                    }

                    const analyticsData = {
                        'hitType': 'event',
                        'eventCategory': 'login' // 'Typically the object that was interacted with'
                    };

                    const success = response => {
                        dialog.hide();
                        store.clear();
                        Object.keys(response).forEach(key => store.set(key, response[key]));
                        store.set('lastUpdated', Date.now());
                        if (window.analytics) {
                            window.analytics('send', Object.assign({
                                'eventAction': 'success' // 'The type of interaction
                            }, analyticsData));
                        }
                        const authData = lpAuth.getAuthData();
                        if (authData && authData.config) {
                            Object.keys(authData.config).forEach(key => store.set(`config.${key}`, authData.config[key]));
                        }
                        if (authData && authData.csdsCollectionResponse && authData.csdsCollectionResponse.baseURIs) {
                            store.set('csds', authData.csdsCollectionResponse);
                        }
                        return resolve(window.${artifactId});
                    };

                    const error = response => {
                        if (window.analytics) {
                            window.analytics('send', Object.assign({
                                'eventAction': 'failure' // 'The type of interaction
                            }, analyticsData));
                            window.analytics('send', 'exception', {'exDescription': `login-failure: ${JSON.stringify(response)}`});
                        }
                        store.clear();
                        store.set('error', response);
                        dialog.hide();
                        dialog.show({
                            'type': 'alert',
                            'text': 'Failed to login: Invalid or nonLPA OTK token.',
                            'okButtonText': 'Try again?'
                        }).then(() => { window.location = '/login'; });
                        return reject(response);
                    };

                    lpAuth.setRequestHeaders(
                        [{'name': 'X-LP-CLIENT', 'value': localStorage.getItem('clientId')}]
                    );
                    lpAuth.createSession({
                        'accountId': siteId,
                        'lpaOnly': true,
                        success,
                        error
                    });
                } else {
                    // otk not present: check if previously logged in (i.e. is the csrf and bearer token present)
                    //                  if yes: validate on server and if valid let the user continue working
                    //                  otherwise: redirect user to login page
                    const token = storage.getToken();
                    if (token) {
                        resolve(window.${artifactId});
                    } else {
                        window.location.href = '/login';
                        reject(); // should usually not be reached... since we redirect
                    }
                }
            });
        }
    };
});
