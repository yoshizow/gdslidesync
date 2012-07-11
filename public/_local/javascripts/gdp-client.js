(function() {

    var io = window.io;
    var $ = window.$;

    var socket;
    // sync setting
    var sync = true;
    var pointerSync;
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
            //This does not work for some contents
            //console.log("onActionEnabledStateChange");
        },
        onCurrentViewChange: function() {
            //console.log("onCurrentViewChange");
        },
        onNavigation: function() {
            if (sync) {
                var page = statusAPI.getCurrentSlideIndex();
                console.log("move " + page);
                socket.emit('move', page);
            }
        },
    };

    $(function() {
        var syncMenu = $('<div>');
        syncMenu.attr('class', 'goog-inline-block goog-flat-menu-button');
        syncMenu.attr('id', 'syncStatus');
        syncMenu.text('Sync');
        $('div.punch-viewer-nav-rounded-container').append(syncMenu);

        var unsyncMessage = "Unsync";
        var syncMessage = "Sync";
        $("#syncStatus").text(unsyncMessage);
        $("#syncStatus").click(function() {
            sync = !sync;
            pointerSync.setSync(sync);
            $(this).text(sync ? unsyncMessage : syncMessage);
            if (!sync) {
                $('#cursor').hide();
            }
        });

        // socket.io settings
        socket = io.connect();
        socket.on('move', function(data) {
            if (sync) {
                console.log("gotoSlide " + data);
                actionAPI.gotoSlide(data);
            }
        });

        // pointer sync
        pointerSync = new PointerSync({
            socket: socket,
            cursorId: '#pointersync-cursor',
            getContentRectFn: function(isSend) {
                var content = $('div.punch-viewer-content');
                return { offset: content.offset(),
                         width: content.width(),
                         height: content.height() };
            }
        });
        $(document).mousemove(function(e) { pointerSync.onMouseMove(e); });

    });
})();
