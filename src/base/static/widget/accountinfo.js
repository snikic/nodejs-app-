'use strict';

define(['auth/storage', 'widget/serverinfo', 'xssFilters'], (storage, serverInfo, xssFilters) => {
    return () => {
        const $table = $('#accountInfoWidget-table');
        if (storage.getSiteId()) {
            $table.append(`<tr>
                <td>Site ID</td>
                <td>${xssFilters.inHTMLData(storage.getSiteId())}</td>
                </tr>`);
        }

        serverInfo()
            .then(zone => {
                $table.append(`<tr>
                <td>Zone</td>
                <td>${xssFilters.inHTMLData(zone.toUpperCase())}</td>
                </tr>`);
            });
    };
});
