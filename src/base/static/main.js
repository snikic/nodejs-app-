'use strict';

const date = window.document.querySelector('html').dataset.date;

require.config({
    'urlArgs': `v=${date}`,
    'paths': {
        'xssFilters': '/xss-filters.min',
        'LpAuth': '/lp-auth-require',
        'store2': '/store2',
        'iFrameResizer': '/iframeResizer',
        'alertify': '/js/alertify'
    },
    'shim': {
        'xssFilters': {
            'exports': 'xssFilters'
        },
        'iFrameResizer': {
            'exports': 'iFrameResizer'
        },
        'jq': {
            'deps': ['jquery'],
            'init': $ => $
        }
    },
    'config': {
        'moment': {
            'noGlobal': true
        }
    }
});

require(['auth/base', 'auth/storage', 'ui/base', 'navigation/base', 'auth/check',
    'crossdomain/fetchify', 'crossdomain/tokenify'], (auth, storage, ui, navigation, check) => {
    auth.init()
        .then(response => {
            // at this point the ${artifactId} object is ready for usage
            const event = new CustomEvent('${artifactId}:ready', window.${artifactId});
            window.document.dispatchEvent(event);
            return response;
        })
        .then(navigation.init)
        .then(ui.init)
        .then(check.init);
});

// (() => {
//     const domMethods = ['querySelector', 'querySelectorAll', 'getElementById' /* , 'getElementsByClassName',
//         'getElementsByName', 'getElementsByTagName', 'getElementsByTagNameNS' */];
//     const shadowDoc = new Proxy(document, {
//         'get': (target, property) => {
//             if (domMethods.indexOf(property) > -1) {
//                 const shadowRoot = document.querySelector('#moduleContainer').shadowRoot;
//                 if (typeof shadowRoot[property] === 'function') {
//                     return new Proxy(target[property], {
//                         'apply': (propertyTarget, thisArg, argumentsList) => {
//                             /*if (Array.isArray(argumentsList) && argumentsList.length > 0) {
//                                 argumentsList[0] = `#moduleContainer::shadow ${argumentsList[0]}`;
//                             }
//                             return Reflect.apply(target[property], target, argumentsList);*/
//                             return Reflect.apply(shadowRoot[property], thisArg, argumentsList);
//                         }
//                     });
//                 }
//             }
//             return Reflect.get(target, property);
//         }
//     });
//     window.shadowDoc = window.document; //shadowDoc;
//     window.shadowWin = new Proxy(window, {
//         'get': (target, property) => {
//             if (property === 'document') return shadowDoc;
//             return Reflect.get(target, property);
//         }
//     });
// })();
