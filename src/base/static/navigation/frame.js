'use strict';

define(['navigation/transport', 'auth/storage', 'navigation/user_state', 'crossdomain/fetchify',
    'ui/dialog', 'util/util', 'iFrameResizer'], (Transport, store, userState, fetchify, dialog, util, iFrameResizer) => {
    let transport;

    const domain = util.getDomain();

    const initFrame = frame => {
        const frameContent = frame.contentWindow;

        const _messageListener = (data, callback) => {
            // never trust the received data! it comes from an "unknown" source (module iFrame),
            // i.e. never put data e.g. in the DOM without verifying/escaping the data
            if (data) {
                if (data.action === 'dialog') {
                    return dialog.show(data)
                        .then(resolvedValue => callback(null, resolvedValue))
                        .catch(error => callback(error));
                } else if (data.action === 'appguard') {
                    $('#${artifactId}-app-alert').show();
                    return $('#${artifactId}-app-alert').popover('show');
                } else if (data.action === 'open') {
                    // why this way? security!
                    // https://mathiasbynens.github.io/rel-noopener/
                    // https://www.jitbit.com/alexblog/256-targetblank---the-most-underestimated-vulnerability-ever/
                    const externalWindow = window.open();
                    externalWindow.opener = null;
                    externalWindow.location = data.url;
                    return externalWindow;
                }
                return callback(new Error(`Unsupported event "action": ${data.action}`));
            }
            return null;
        };

        iFrameResizer({
            // 'resizeFrom': 'child',
            'checkOrigin': [domain]
        }, frame);

        // reinit transport if already existing (prevent "leaking" old listeners
        if (transport) transport.destroy();
        transport = new Transport(frameContent, _messageListener, domain, domain);
    };

    return {
        initFrame
    };
});
