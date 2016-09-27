'use strict';

/**
 * A simple (important: synchronous!) startup script, responsible for the ${artifactId}.ready() function.
 *
 * User: jmollner
 * Date: 17/05/16
 */

(() => {
    const _${artifactId}ReadyName = '${artifactId}:ready';
    const _domReadyName = 'DOMContentLoaded';

    let _${artifactId}Ready = false;
    let _domReady = false;

    const _readyListener = (eventName, callback) => {
        const _listener = () => {
            // cleanup: remove listener... the event should be called anyhow only once
            window.document.removeEventListener(eventName, _listener);
            return callback();
        };

        window.document.addEventListener(eventName, _listener);
    };

    const _readyFunction = (isReady, eventName, callback) => {
        return new Promise(resolve => {
            if (isReady === true) {
                if (callback) return callback(window.${artifactId});
                return resolve(window.${artifactId});
            }

            return _readyListener(eventName, () => {
                if (callback) return callback(${artifactId});
                return resolve(window.${artifactId});
            });
        });
    };

    _readyListener(_${artifactId}ReadyName, () => { _${artifactId}Ready = true; });
    _readyListener(_domReadyName, () => { _domReady = true; });

    window.${artifactId} = window.${artifactId} || {};
    window.${artifactId}.ready = callback => _readyFunction(_${artifactId}Ready, _${artifactId}ReadyName, callback);

    window.ready = callback => _readyFunction(_domReady, _domReadyName, callback);

    const windowFetch = window.fetch;
    window.fetch = (input, init) => {
        const options = Object.assign({}, init);
        const additionalHeaders = {
            'X-REQUESTED-WITH': 'fetch',
            'X-LP-CLIENT': localStorage.getItem('clientId')
        };
        options.headers = Object.assign({}, options.headers, additionalHeaders);
        return windowFetch(input, options)
            .then(response => {
                if (response.status >= 400 && response.headers.get('x-proxy') == 'true') {
                    if (window.${artifactId}.appguard){
                        window.${artifactId}.appguard({});
                    } else {
                        console.debug('Not in iFrame');
                    }

                    if (window.analytics) window.analytics('send', 'exception', {'exDescription': response.headers.get('x-proxy-error-details')});

                    // window.parent.$('#${artifactId}-app-alert').show();
                    // window.parent.$('#${artifactId}-app-alert').popover('show');
                }
                return response;
            });
    };
})();
