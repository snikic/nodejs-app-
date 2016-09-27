'use strict';

define(['state/data', 'xssFilters'], (data, xssFilters) => {
    const init = () => {
        data.getBuildInfo()
            .then(json => {
                if (Object.keys(json).length > 0) {
                    // build information are available
                    $('#${artifactId}-version')
                        .popover()
                        .attr('data-content',
                            `Build No: ${xssFilters.inHTMLData(json.buildNumber)}<br/>
                             Build Date: ${xssFilters.inHTMLData(json.appTimestamp)}`);
                    if (window.analytics) {
                        // dimension1: appVersion
                        // dimension2: siteId
                        // dimension3: the source of the event (platform, module 1, module 2, etc.)
                        window.analytics('set', 'dimension1', json.buildNumber);
                    }
                }
            })
            .catch(err => console.error(err));
    };

    return {
        init // returns Promise
    };
});
