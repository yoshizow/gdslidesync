(function() {

    var io = window.io;
    var $ = window.$;

    var socket;
    // sync setting
    var sync = true;
    var statusAPI, actionAPI;
    var cursorTimer;

    window.punchWebViewEventListener = {  // callback must be set before loading viewer script
        onApiExported: function(s, a) {
            statusAPI = s;
            actionAPI = a;
        },
        onFinishedLoading: function() {
            //console.log("onFinishedLoading");
        },
        onActionEnabledStateChange: function() {
            var page = statusAPI.getCurrentSlideIndex();
            if (sync) {
                console.log("move " + page);
                socket.emit('move', page);
            }
        },
        onCurrentViewChange: function() {
            //console.log("onCurrentViewChange");
        },
    };

    $(function() {
        /*
          var unsyncMessage = "click to unsync slide";
          var syncMessage = "click to sync slide";
          $("#syncStatus").text(unsyncMessage);
          $("#syncStatus").click(function() {
          sync = !sync;
          $(this).text(sync ? unsyncMessage : syncMessage);
          });
        */

        // socket.io settings
        socket = io.connect();
        socket.on('move', function(data) {
            if (sync) {
                console.log("gotoSlide " + data);
                actionAPI.gotoSlide(data);
            }
        });
        socket.on('cursormove', function(data) {
            if (sync) {
                var cursor = $('#cursor');
                if (!cursor.attr('id')) {
                    cursor = $('<img>');
                    cursor.attr('class', 'cursor');
                    cursor.attr('id', 'cursor');
                    cursor.attr('src', '/_local/images/cursor.svg');
                    cursor.css('position', 'absolute');
                    cursor.css('width', '20px');
                    cursor.css('height', '31px');
                    $('body').append(cursor);
                }
                cursor.css('left', data[0] + 'px');
                cursor.css('top', data[1] + 'px');
                cursor.show();
                clearTimeout(cursorTimer);
                cursorTimer = setTimeout(function() {
                    cursor.fadeOut(500);
                }, 4500);
            }
        });

        $(document).on('mousemove', function(e) {
            if (sync) {
                socket.emit('cursormove', [e.pageX, e.pageY]);
            }
        });
    });
  
})();
