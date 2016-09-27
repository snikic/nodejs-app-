/*eslint-disable */

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','/analytics_ga.js','analytics');

(() => {
    const storageKey = 'clientId';
    analytics('create', '{{inSingleQuotedAttr:_gaID}}', {
        'storage': 'none',
        'clientId': localStorage.getItem(storageKey)
    });
    analytics(tracker => localStorage.setItem(storageKey, tracker.get('clientId'))); // the 'storageKey' value can change, but the 'clientId' of the tracker is fixed/predefined

    // analytics('require', 'linkid', {
    //     'cookieName': 'analyticsla'
    // });
    // analytics('require', 'pageVisibilityTracker', {
    //     'hiddenMetricIndex': 1,
    //     'visibleMetricIndex': 2
    // });

    // analytics('set', 'transport', 'beacon');
    analytics('set', 'anonymizeIp', true);
    analytics('set', 'forceSSL', true);
    analytics('set', 'dataSource', 'web');

    // dimension1: appVersion
    // dimension2: siteId
    // dimension3: the source of the event (platform, module 1, module 2, etc.)

    analytics('set', 'dimension3', '{{inSingleQuotedAttr:_source}}');

    window.${artifactId}.ready()
        .then(${artifactId} => {
            analytics('set', 'dimension2', ${artifactId}.getSiteId());
            analytics('set', 'userId', ${artifactId}.getUserId());
        });

    const _domain = window.document.querySelector('html').dataset.domain;
    if (_domain) analytics('set', 'hostname', _domain);

    const substring = "script error";
    window.onerror = (message, source, line, column, error) => {
        const string = message.toLowerCase();

        const desc = string.indexOf(substring) > -1
            ? 'Script Error - See browser console for details or use \'crossorigin="anonymous"\'.'
            : `Error: ${message}; Script: ${source}; Line: ${line};
            Column: ${column}; StackTrace: ${error}`;

        analytics('send', 'exception', {'exDescription': `Global JS Error: ${desc}`});

        return false; // propagate the event to the default exception handler (so it's visible in the browser console)
    };

    if ('{{inSingleQuotedAttr:_clickTracking}}' === 'true') {
        const getDomPath = element => {
            const stack = [];
            let el = element;
            while (el.parentNode !== null) {
                let sibCount = 0;
                let sibIndex = 0;
                for (let i = 0; i < el.parentNode.childNodes.length; i++) {
                    const sib = el.parentNode.childNodes[i];
                    if (sib.nodeName === el.nodeName) {
                        if (sib === el) sibIndex = sibCount;
                        sibCount++;
                    }
                }
                if (el.hasAttribute('id') && el.id !== '') {
                    stack.unshift(`${el.nodeName.toLowerCase()}#${el.id}`);
                } else if (sibCount > 1) {
                    stack.unshift(`${el.nodeName.toLowerCase()}:eq(${sibIndex})`);
                } else {
                    stack.unshift(el.nodeName.toLowerCase());
                }
                el = el.parentNode;
            }

            return stack.slice(1); // removes the html element
        };

        document.addEventListener('click', event => {
            const element = event.toElement || event.target;
            const path = getDomPath(element).join('.');
            const data = {
                'hitType': 'event',
                'eventCategory': 'ui-interaction', // 'Typically the object that was interacted with'
                'eventAction': 'click', // 'The type of interaction'
                'eventLabel': path // 'Useful for categorizing events'
            };

            analytics('send', data);
        });
    }
})();
