'use strict';

/**
 * Created by sseedorf on 11/05/16.
 */

// define(['widget/accountinfo', 'widget/extendinfo'], (createWidget, extendInfoWidget) => {
define(['widget/accountinfo'], createWidget => {
    return {
        'init': () => {
            window.${artifactId}.ready(() => {
                return new Promise(resolve => {
                    createWidget();
                    resolve();
                });
                // }).then(extendInfoWidget);
            });
        }
    };
});
    // Error handling in case SalesForce account info cannot be loaded
    // function (error) {
    //    console.error('Cannot load dependency in require.js');
    //    const failedModuleId = error.requireModules && error.requireModules[0];
    //    console.error(failedModuleId);
    //    if (failedModuleId === 'text!/accountInfo') {
    //        console.debug('Trying to load module accountInfoWidget now.')
    //        // if error then just load 'accountInfoWidget' widget
    //        require(['accountInfoWidget'], function (createWidget) {
    //            window.${artifactId}.ready(createWidget);
    //        });
    //    }
    // });
