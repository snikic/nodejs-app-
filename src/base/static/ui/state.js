'use strict';

define(['state/data', 'ui/readme', 'xssFilters'], (data, readme, xssFilters) => {
    const update = moduleData => {
        // $.text() automatically prevents XSS (since it only inserts text, not html)
        if (moduleData) {
            const name = moduleData.${artifactId} && (moduleData.${artifactId}.nameLong || moduleData.${artifactId}.nameShort)
                || moduleData.name;
            $('#moduleName').text(name);
            $('#moduleVersion')
                .text(moduleData.version)
                .removeClass('hide');
            $('#homeBase').addClass('hide');
            if (moduleData.homepage) {
                $('#moduleHomepage')
                    .attr('href', xssFilters.uriInDoubleQuotedAttr(moduleData.homepage))
                    .removeClass('hide');
            } else {
                $('#moduleHomepage')
                    .attr('href', '#')
                    .addClass('hide');
            }
            $('#moduleContributors').empty();
            if (moduleData.contributors) {
                moduleData.contributors.forEach(contributor => {
                    let element;
                    if (contributor.${artifactId}_profile_pic) {
                        element = `<img src="${xssFilters.uriInDoubleQuotedAttr(contributor.${artifactId}_profile_pic)}" title="${xssFilters.inDoubleQuotedAttr(contributor.name)}" class="img-circle w-32 contributors">`;
                    } else {
                        element = `<i class="fa fa-user img-circle w-32 contributors" aria-hidden="true" title="${xssFilters.inDoubleQuotedAttr(contributor.name)}"></i>`;
                    }
                    $('#moduleContributors').append(element);
                });
                $('#moduleContributors')
                    .removeClass('hide');
            }
            $('#contentBase').removeClass('hide');
            readme.load(moduleData.id);
        } else {
            $('#moduleName').text('Mission Control');
            $('#moduleVersion')
                .text('')
                .addClass('hide');
            $('#moduleHomepage')
                .attr('href', '#')
                .addClass('hide');
            $('#moduleContributors')
                .empty()
                .addClass('hide');
            $('#contentBase').addClass('hide');
            $('#homeBase').removeClass('hide');
        }
        // hide "AppGuard" alert button in the lower
        $('#${artifactId}-app-alert').hide();
        // hide the AppGuard alert
        $('#${artifactId}-app-alert').popover('hide');
    };

    const showModule = iFrame => {
        const contentBase = document.querySelector('#contentBase');
        while (contentBase.firstChild) contentBase.removeChild(contentBase.firstChild);

        let result;
        if (iFrame === true) {
            result = document.createElement('iframe');
            result.setAttribute('class', 'seamless');
            result.setAttribute('sandbox', `${data.getSandboxProperties()} allow-forms`);
        } else {
            result = document.createElement('div');
        }
        result.setAttribute('id', 'moduleContainer');

        contentBase.appendChild(result);
        return result;
    };

    return {
        showModule,
        update
    };
});
