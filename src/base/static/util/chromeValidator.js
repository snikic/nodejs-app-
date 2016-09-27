/*eslint-disable */

/**
 * Created by sseedorf on 19/05/16.
 */

if (!!!window.chrome) {
    var modal = '<div class="modal black-overlay fade" id="UnsupportedBrowserModal" data-backdrop="false">'
        +'<div class="top warn b-b">'
        +'<div class="modal-body">'
        +'<div class="p-a"><i class="fa fa-rocket p-l p-r" style="font-size: 8.5em; vertical-align: middle;"></i><span class="h4">This browser is not supported. Please switch to a recent version of Chrome on desktop.</span></div>'
        +'</div>'
        +'<div class="modal-footer">'
        +'<a href="https://nation.slack.com/messages/${artifactId}-project/" target="_blank" class="text-muted"><i class="fa fa-fw fa-slack"></i>${artifactId} on Slack</a>'
        +'</div>'
        +'</div>'
        +'</div>';
    $('body').prepend(modal);
    $('#UnsupportedBrowserModal').modal('show');
    window.stop();
}

