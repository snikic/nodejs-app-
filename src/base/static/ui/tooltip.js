/*eslint-disable */

// more tooltip options: http://v4-alpha.getbootstrap.com/components/tooltips/#methods
/*
window.${artifactId}.ready(function() {
    // add basic tooltips (content 'title') to profile pics in app header
    $('#app-header .img-circle').tooltip({placement: 'bottom'});
    $('.${artifactId}AppBox .img-circle').tooltip({placement: 'right'});
});
*/

'use strict';

define(() => {
    window.${artifactId}.ready( () => {
        // add event handling for bootstrap tooltips
        $(() => {
            $('[data-toggle="tooltip"]').tooltip();
            $('[data-toggle="popover"]').popover();
        });
        $('#${artifactId}-app-alert').on('shown.bs.popover', () => {
            setTimeout(function() {
                $('#${artifactId}-app-alert').popover('hide');
            }, 15000);
        });
    });
});



