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
            if (sync) {
                var page = statusAPI.getCurrentSlideIndex();
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
                console.dir(data);
                var content = $('div.punch-viewer-content');
                var o = content.offset();
                var x = data.x * content.width() / 1000 + o.left;
                var y = data.y * content.height() / 1000 + o.top;
                cursor.css('left', x + 'px');
                cursor.css('top', y + 'px');
                cursor.show();
                clearTimeout(cursorTimer);
                cursorTimer = setTimeout(function() {
                    cursor.fadeOut(500);
                }, 4500);
            }
        });

        $(document).on('mousemove', function(e) {
            if (sync) {
                var content = $('div.punch-viewer-content');
                var o = content.offset();
                var x = (e.pageX - o.left) * 1000 / content.width();
                var y = (e.pageY - o.top) * 1000 / content.height();
                socket.emit('cursormove', { x: x, y: y });
            }
        });
    });
  
})();
