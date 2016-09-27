'use strict';

define(['alertify', 'xssFilters', 'ui/tooltip'], (alertify, xssFilters, tooltip) => {
    alertify.parent(document.body);

    const show = data => {
        // explicitly check for the allowed types, since we call this property as function below
        data.type = data.type === 'alert' || data.type === 'confirm' || data.type === 'prompt' || data.type === 'log' || data.type === 'success' || data.type === 'error'
            ? data.type
            : 'alert';
        data.text = xssFilters.inHTMLData(data.text || 'No text provided');
        const dialog = alertify.reset();
        if (data.defaultValue) dialog.defaultValue(data.defaultValue);
        if (data.okButtonText) dialog.okBtn(xssFilters.inHTMLData(data.okButtonText));
        if (data.cancelButtonText) dialog.cancelBtn(xssFilters.inHTMLData(data.cancelButtonText));
        dialog.logPosition('bottom right');
        dialog.delay(10000);
        /* return new Promise((resolve, reject) => {
            Reflect.apply(dialog[data.type], window, [xssFilters.inHTMLData(data.text)],
                val => resolve(typeof val === 'string' ? val : null), // prompt has 2 parameters (val, event); all other only one (event)
                () => reject()); // cancel clicked
        }); */
        return Reflect.apply(dialog[data.type], window, [xssFilters.inHTMLData(data.text)])
            .then(resolvedValue => {
                if (resolvedValue.buttonClicked === 'ok') return resolvedValue.inputValue;
                // else: cancel was pressed
                throw new Error('user clicked the \`cancel\' button.');
            }); // promise
    };

    const hide = () => { // hides all dialogs
        $('.alertify').remove();
    };

    return {
        show, // promise
        hide
    };
});
