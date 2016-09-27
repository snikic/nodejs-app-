'use strict';

// fetch more info from salesforce connector
define(['auth/storage', 'xssFilters'], (storage, xssFilters) => {
    return () => {
        fetch('/api/info/account',
            {
                'method': 'GET',
                'headers': {
                    'Content-Type': 'application/json',
                    'cache-control': 'no-cache',
                    'pragma': 'no-cache',
                    'X-LP-ACCOUNT': storage.getSiteId(),
                    'X-LP-TOKEN': storage.getToken(),
                    'X-LP-USER': storage.getUserId()
                }
            })
            .then(response => response.json())
            .then(response => { // extended account info from SalesForce
                if (!response || response.error) {
                    console.error('Cannot extend SalesForce information. Empty response or error.');
                    return;
                }
                // append extended account information to table
                const $table = $('#accountInfoWidget-table');
                for (let i in response.company) {
                    $table.append(`<tr>
                        <td>Company</td>
                        <td>${xssFilters.inHTMLData(response.company[i])}</td>
                        </tr>`);
                }
                for (let i in response.website) {
                    // strip http:// ot https:// from string
                    const link = response.website[i].split('://');
                    $table.append(`<tr>
                        <td>Website</td>
                        <td>
                            <a href="${xssFilters.uriInDoubleQuotedAttr(link.length > 1 ? `${link[0]}://${link[1]}` : `http://${link[0]}`)}" target="_blank">
                                ${xssFilters.inHTMLData(link.length > 1 ? link[1] : link[0])}
                            </a>
                        </td>
                        </tr>`);
                }
            });
    };
});
