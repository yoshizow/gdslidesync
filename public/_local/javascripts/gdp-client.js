var socketIO = io;  // avoid name collision
var socket;
// sync setting
var sync = true;

var statusAPI, actionAPI;
window.punchWebViewEventListener = {  // callback must be set before loading viewer script
  onApiExported: function(s, a) {
    statusAPI = s;
    actionAPI = a;
  },
  onFinishedLoading: function() {
    //console.log("onFinishedLoading");
  },
  onActionEnabledStateChange: function() {
    console.log("move " + statusAPI.getCurrentSlideIndex() + 1);
    if (sync) {
      socket.emit('move', statusAPI.getCurrentSlideIndex() + 1);
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

  var io = socketIO;

  // socket.io settings
  socket = io.connect();
  socket.on('move', function(data) {
    if (sync) {
      console.log("gotoSlide " + data);
      actionAPI.gotoSlide(data);
    }
  });
});
