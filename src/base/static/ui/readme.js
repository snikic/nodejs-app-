'use strict';

define([], () => {
    $(document).on('click', '[ui-switcher] a', function (event) {
        event.preventDefault();
        var $this = $(event.target), $active, $li;
        $this.is('a') || ($this = $this.closest('a'));

        $li = $this.parent();
        $active = $li.siblings('.active');
        $li.toggleClass('active');
        $active.removeClass('active');
    });

    return {
        'load': appId => {
            // TODO: avoid console error output if resource not found
            fetch(`/api/readme?app=${appId}`,
                {
                    'method': 'GET',
                    'headers': {
                        'Content-Type': 'text/html',
                        'X-LP-ACCOUNT': window.${artifactId}.getSiteId(),
                        'X-LP-TOKEN': window.${artifactId}.getToken(),
                        'X-LP-USER': window.${artifactId}.getUserId()
                    }
                })
                .then(response => {
                    if (response.status !== 200) {
                        throw new Error('No readme file for app');
                    }
                    return response.text();
                })
                .then(response => {
                    if (response.length > 1) {
                        const switcher = '<div id="readme-switcher">'
                            + '<div class="switcher box-color dark-white text-color" id="sw-theme" ui-switcher>'
                            + '<a href ui-toggle-class="active" target="#sw-theme" class="box-color dark-white text-color sw-btn"><i class="fa fa-info-circle"></i></a>'
                            + '<div id="readmeContent" class="box-body" style="overflow-y: scroll; max-height: 660px;"></div>'
                            + '</div>'
                            + '</div>';
                        $('body').append(switcher);
                        $('#readmeContent').html(response);
                    }
                })
                .catch(error => console.trace(error));
        }
    };
});
