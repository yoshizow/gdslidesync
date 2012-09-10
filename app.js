// -*- js-indent-level:2 -*-
/*
 * Copyright(c) 2012 yoshizow
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var express = require('express'),
    httpProxy = require('http-proxy'),
    parseCookie = require('cookie').parse,
    MemoryStore = express.session.MemoryStore,
    sessionStore = new MemoryStore(),
    routes = require('./routes');

var model = require('./lib/model'),
    gdpAdapter = require('./lib/gdp-adapter');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  // use session
  app.use(express.cookieParser());
  app.use(express.session({ 
    secret: 'your secret here',
    store: sessionStore
  }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Models

var RoomList = model.RoomList,
    roomList = new RoomList();

// Helpers

var trim = function(str) {
  if (str)
    return str.trim();
  else
    return null;
}

var error = function(res, message) {
  res.render('message', { title: 'Error', message: message });
};

var isPresenterOfRoom = function(session, room) {
  if (session.passCode == room.passCode) {
    return true;
  } else {
    return false;
  }
};

// Routes

// index.html
app.get('/', function(req, res) {
  var title = 'gdslidesync';
  var rooms = roomList.getAllRooms();
  var roomsForView = rooms.map(function(room) {
    return { id: room.id, title: "Room" + room.id };
  });
  res.render('index', { title: title,
                        rooms: roomsForView });
});

app.all('/rooms/:id/join', function(req, res) {
  var id = req.params.id;
  var room = roomList.getRoomById(id);
  if (!room) {
    error(res, 'No such room.');
    return;
  }
  req.session.roomId = id;
  res.redirect(room.url);
});

app.all('/rooms/:id', function(req, res) {
  if (req.body.passCode) {
    req.session.passCode = req.body.passCode;
  }
  var id = req.params.id;
  var title = "Room" + id;
  var room = roomList.getRoomById(id);
  if (!room) {
    error(res, 'No such room.');
    return;
  }
  var isPresenter = isPresenterOfRoom(req.session, room);
  var guestUrl = '/rooms/' + id;   // TODO: absolute URL
  res.render('room', { id: id,
                       title: title,
                       isPresenter: isPresenter,
                       guestUrl: guestUrl });
});

app.post('/register', function(req, res) {
  var url = trim(req.body.url);
  var passCode = trim(req.body.passCode);
  if (!url || !passCode) {
    error(res, 'URL or pass code is not specified.');
    return;
  }
  var ret = gdpAdapter.validateURL(url);
  if (!ret.isValid) {
    error(res, 'Invalid URL.');
    return;
  }
  var room = roomList.addRoom(ret.url, passCode);
  req.session.passCode = passCode;
  res.redirect('/rooms/' + room.id);
});

// rest ; proxy to upstream
app.all('/*', function(req, res, next) {
    if (req.url.match(/^\/_local\//)) {
    // delegate handling of proxy-local files to 'static' middleware
    next();
    return;
  }
  console.log("proxying: " + req.url);
  gdpAdapter.proxyRequest(req, res);
});

// Socket.IO
var io = require('socket.io').listen(app);
// set express session to socket
io.set('authorization', function(handshakeData, callback) {
  if (handshakeData.headers.cookie) {
    var cookie = handshakeData.headers.cookie;
    var sessionId = parseCookie(cookie)['connect.sid'];
    sessionStore.get(sessionId, function(err, session) {
      if (err) {
        callback(null, false);
      } else {
        handshakeData.session = session;
        callback(null, true);
      }
    });
  } else {
    return callback(null, true);
  }
});
io.on('connection', function(socket) {
  if (!socket.handshake.session)
    return;
  var roomId = socket.handshake.session.roomId;
  if (!roomId)
    return;
  var room = roomList.getRoomById(roomId);
  if (!room)
    return;
  var roomName = 'room' + roomId;
  socket.join(roomName);

  socket.on('move', function(data) {
    if (!room)
      return false;
    if (!isPresenterOfRoom(socket.handshake.session, room))
      return false;
    console.log("move: " + data);
    socket.broadcast.to(roomName).emit('move', data);
  });
  socket.on('cursormove', function(data) {
    if (!room)
      return false;
    if (!isPresenterOfRoom(socket.handshake.session, room))
      return false;
    //console.log("cursormove: " + data);
    socket.broadcast.to(roomName).emit('cursormove', data);
  });
  socket.on('disconnect', function() {
    // do nothing
  });
});

var port = process.env.PORT || 3000; 
app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
