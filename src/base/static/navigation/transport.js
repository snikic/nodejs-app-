'use strict';

/**
 * Cross frame communication made simple ;)
 *
 * User: jmollner
 * Date: 21/05/16
 */

((root, factory) => {
    const Transport = factory();

    if (typeof define === 'function' && define.amd) {
        // Now we're wrapping the factory and assigning the return
        // value to the root (window) and returning it as well to
        // the AMD loader.
        define(() => Transport);
    }
    root.Transport = Transport;
})(this, () => { // eslint-disable-line no-invalid-this
    class Transport {

        constructor(frame, messageListener, sendOrigin, receiveOrigin) {
            this.frame = frame;
            this.messageListener = messageListener;
            this.sendOrigin = sendOrigin;
            this.receiveOrigin = receiveOrigin || sendOrigin; // if it's the same

            this.callbacks = {};
            this.callbackId = 0;

            this._internalMsgListener = this._setupListener.bind(this);
            window.addEventListener('message', this._internalMsgListener);
        }

        _storeCallback(callback) {
            const id = this.callbackId++; // get current id/index and increase by one
            this.callbacks[id] = callback;
            return id;
        }

        send(data) { // returns promise
            if (!this.frame) throw new Error('Transport not properly created or already destroyed!');

            return new Promise((resolve, reject) => {
                const messageData = {data};
                const callback = (error, response) => {
                    if (error) return reject(error instanceof Error ? error.message : error);
                    return resolve(response);
                };
                messageData._responseId = this._storeCallback(callback);

                this.frame.postMessage(messageData, this.sendOrigin);
            });
        }

        destroy() {
            window.removeEventListener('message', this._internalMsgListener);
            // clear "external" references...
            Reflect.deleteProperty(this, 'messageListener');
            Reflect.deleteProperty(this, 'frame');
        }

        _setupListener(event) {
            const origin = event.origin || event.originalEvent.origin; // the origin property is in the event.originalEvent object for Chrome
            if (this.receiveOrigin !== '*' && origin !== this.receiveOrigin) {
                return; // security... only process "expected" messages
            }

            const eventData = event.data;

            // Respond to a "specific" request, don't call messageListener, just call the callback function
            // we must use the 'hasOwnProperty' function... else e.g. a present '_callbackId' of 0 would result
            // in false if we would just do if(eventData._callbackId)
            if (eventData.hasOwnProperty('_callbackId') && this.callbacks.hasOwnProperty(eventData._callbackId)) {
                this.callbacks[eventData._callbackId](eventData.err, eventData.success);
                Reflect.deleteProperty(this.callbacks, eventData._callbackId);
                return;
            }

            const _sendOrigin = origin && origin !== 'null'
                ? origin
                : this.sendOrigin;

            // "send" event to the messageListener... allows to process and respond to
            // the received event...
            const callback = (err, success) => {
                // Lets respond to the sender again via sending a message
                if (event.source) {
                    event.source.postMessage({
                        '_callbackId': eventData._responseId,
                        'err': err instanceof Error ? err.message : err,
                        success
                    }, _sendOrigin);
                } else {
                    console.warn('Failed post message since event source is not available', event, err, success);
                }
            };

            if (!this.messageListener) throw new Error('Transport not properly created or already destroyed!');
            // Call listener... allows to respond to event/message
            this.messageListener(eventData.data, callback, event.source, event.origin);
        }
    }

    return Transport;
});
