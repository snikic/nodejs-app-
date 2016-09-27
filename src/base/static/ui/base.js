'use strict';

define(['auth/storage', 'util/util', 'ui/state', 'ui/search', 'ui/app_status', 'navigation/base', 'moment',
    'xssFilters'], (storage, util, state, search, appStatus, navigation, moment, xssFilters) => {
    const _updateTokenData = () => {
        $('#userPopover').attr('data-content',
            `Created ${xssFilters.inHTMLData(moment(storage.getLastUpdated()).fromNow())}<br/>
             Verified ${xssFilters.inHTMLData(moment(storage.getLastValidated()).fromNow())}`);
    };

    return {
        'init': () => {
            const isOnModulePage = util.isOnModulePage();
            if (isOnModulePage !== true) {
                require(['widget/infowidget'], infoWidget => infoWidget.init()); // eslint-disable-line global-require
            }

            // navigation
            $('.nav-module').click(event => {
                event.preventDefault();
                if (event.currentTarget && event.currentTarget.dataset) {
                    navigation.goToModule(event.currentTarget.dataset.moduleId);
                } else {
                    console.warn('Event cannot be handled due to missing "moduleId" data attribute.', event);
                }
            });
            $('#nav-home').click(event => {
                event.preventDefault();
                navigation.goToHome();
            });
            $('#username').text(xssFilters.inHTMLData(storage.getUsername()));
            $('#userPopover')
                .popover()
                .on('show.bs.popover', () => {
                    _updateTokenData();
                });
            $('#logout').click(() => {
                if (window.analytics) window.analytics('send', 'pageview', {'sessionControl': 'end'});
                storage.clearAll();
                window.location.href = '/login';
            });

            if (storage.isDebug()) {
                const debugSiteID = ${artifactId}.getSiteId(); // use '${artifactId}' instead of storage!
                $('#pageTitle').append(`<span class="label label-warning">
                    DEBUGGER ENABLED; USING SITEID: ${xssFilters.inHTMLData(debugSiteID)}
                    </span>`);
            }

            // init search
            $('#moduleSearch').typeahead(
                {
                    'hint': true,
                    'minLength': 2,
                    'limit': 10,
                    'highlight': true
                },
                {
                    'name': 'modules',
                    'source': (query, sync, async) => search.run(query).then(result => async(result)),
                    'display': item => xssFilters.inHTMLData(item.${artifactId} && item.${artifactId}.nameShort ? item.${artifactId}.nameShort : item.id),
                    'templates': {
                        'notFound': '<p class="tt-suggestion">No module found</p>',
                        'pending': '<p class="tt-suggestion">Searching...</p>'
                    }
                }
            ).bind('typeahead:select', (event, item) => {
                navigation.goToModule(item.id);
                $(event.target).typeahead('val', '');
            });
            $('#moduleSearchContainer').on('keyup', event => {
                if (event.which === 13) {
                    $('.tt-suggestion:first-child', this).trigger('click'); // eslint-disable-line no-invalid-this
                }
            });

            // init application/${artifactId} information
            appStatus.init();

            return Promise.resolve(); // instant resolve
        },
        'updateTokenData': _updateTokenData,
        'showModal': htmlContent => {
            if (htmlContent) {
                $('#login_modal_content').html(xssFilters.inHTMLData(htmlContent));
            }
            $('#login_modal').modal('show');
        },
        'hideModal': () => {
            $('#login_modal').modal('hide');
        }
    };
});
