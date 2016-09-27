/*eslint-disable */ // due to: https://github.com/eslint/eslint/issues/2614

'use strict';

var siteId = window.store.get('lastSiteId');
if (siteId) {
    window.location.href = '/a/' + siteId + '/';
} else {
    window.location.href = '/login';
}
