'use strict';

(() => {
    // check if we are running in an iFrame
    const inIFrame = () => {
        try {
            return window.self !== window.top;
        } catch (err) {
            return true;
        }
    };
    if (!inIFrame()) throw new Error('This page can only be loaded within an iFrame!');

    // init module...

    // localStorage and sessionStorage support for modules (since modules are sandboxed
    // in an iFrame, accessing "window.(local|session)Storage" would result in a DOM exception)
    const storage = name => {
        let _data = {};
        return {
            'expose': transport => {
                const _updateStore = () => {
                    const state = {};
                    state[name] = _data;
                    transport.send({'action': 'updateUserData', state})
                        .then(response => console.trace(response))
                        .catch(error => console.error(`Failed to update user data of type: ${name}`, error));
                };
                return {
                    'getItem': id => Reflect.get(_data, id),
                    'setItem': (id, val) => {
                        const set = Reflect.set(_data, id, String(val));
                        if (set) _updateStore();
                    },
                    'removeItem': id => {
                        const deleted = Reflect.deleteProperty(_data, id);
                        if (deleted) _updateStore();
                        return deleted;
                    },
                    'clear': () => {
                        _data = {};
                        _updateStore();
                    }
                };
            },
            'setStorage': data => {
                _data = data;
            }
        };
    };
    const localStorage = storage('localStorage');
    const sessionStorage = storage('sessionStorage');

    const parentDomain = window.document.querySelector('html').dataset.domain;

    // must be added before loading the iFrameResizer script!
    window.iFrameResizer = {
        'targetOrigin': parentDomain
    };

    const messageListener = (data, callback) => {
        // so far nothing
        return callback(null, 'ok');
    };

    // for security reasons allow only sending and receiving messages to the ${artifactId} (parent) domain!
    const transport = new window.Transport(window.parent, messageListener, parentDomain, parentDomain);

    window.${artifactId} = window.${artifactId} || {};

    // const dataExample = {
    //     'type': 'alert', // or prompt/confirm, defaults to alert
    //     'text': 'dialog text', // text to display in dialog
    //     'defaultValue': 42, // optional; default value in the input box (only used by 'prompt' type)
    //     'okButtonText': 'custom OK', // optional; the text of the ok button; defaults to 'Ok'
    //     'cancelButtonText': 'custom Cancel' // optional; the text of the cancel button; defaults to 'Cancel' (only used by 'prompt' and 'confirm' type)
    // };
    // returns Promise: returns with 'then' if the user clicked 'Ok'; provides value in the case of 'prompt'
    //                  returns with 'catch' if the user clicked 'Cancel'; only used by 'prompt' and 'confirm' type
    window.${artifactId}.dialog = data => {
        data.action = 'dialog';
        return transport.send(data); // promise
    };

    window.${artifactId}.appguard = data => {
        data.action = 'appguard';
        return transport.send(data); // promise
    };

    window.${artifactId}.open = url => {
        const action = 'open';
        return transport.send({action, url}); // promise
    };

    // wrap/proxy window object to support 'localStorage' and 'sessionStorage'
    const localStorageExp = localStorage.expose(transport);
    const sessionStorageExp = sessionStorage.expose(transport);

    // TODO: to improve the visibility of client problems/errors, log errors (stacktrace.js?) and send to server
    /*window.addEventListener('error', event => {
        //console.error(event);
        return true;
    });*/

    // indicate modules that ${artifactId} is loaded
    const readyListener = () => {
        const readyEvent = new CustomEvent('${artifactId}:ready', window.${artifactId});
        window.document.dispatchEvent(readyEvent);
    };
    window.ready(readyListener);
})();
