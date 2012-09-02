// -*- js-indent-level:2 -*-

/**
 * Module dependencies.
 */

var express = require('express'),
    httpProxy = require('http-proxy'),
    parseCookie = require('cookie').parse,
    MemoryStore = express.session.MemoryStore,
    sessionStore = new MemoryStore(),
    routes = require('./routes');

var UPSTREAM_HOST = 'docs.google.com';
var UPSTREAM_PORT = 443;
var UPSTREAM_IS_HTTPS = true;

var prepareInsertScript = function(req, res) {
  // disable accept-encoding because we can't handle gzip'd stream :-<
  delete req.headers['accept-encoding'];
  var write = res.write,
  end = res.end;
  var body = '';
  res.write = function(data) {
    body += data.toString();
  }
  res.end = function(data) {
    if (data)
      body += data.toString();
    body = body.replace(/<script/,
                        '<script type="text/javascript" src="/_local/javascripts/jquery-1.7.2.min.js"></script>\n' +
                        '<script type="text/javascript" src="/socket.io/socket.io.js"></script>\n' +
                        '<script type="text/javascript" src="/_local/javascripts/pointersync_client.js"></script>\n' +
                        '<script type="text/javascript" src="/_local/javascripts/gdp-client.js"></script>\n' +
                        '<script');
    body = body.replace(/<\/body>/,
                       '<img id="pointersync-cursor" src="/_local/images/cursor.svg" width="2%" style="position: absolute; z-index: 99; display: none;">\n' +
                       '</body>');
    end.call(res, body);
  }
};

var app = module.exports = express.createServer();

var proxy = new httpProxy.HttpProxy({
  target: {
    host: UPSTREAM_HOST,
    port: UPSTREAM_PORT,
    https: UPSTREAM_IS_HTTPS
  }
});

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

var RoomList = function() {
  this.initialize.apply(this, arguments);
};

RoomList.prototype = {
  initialize: function() {
    this.list = [];
  },

  getAllRooms: function() {
    return this.list.filter(function(e) { return true; });
  },

  getRoomById: function(id) {
    return this.list[id];
  },

  addRoom: function(url, passCode) {
    var room = this._getRoomByValues(url, passCode);
    if (room) {
      return room;
    } else {
      var id = this._unusedId();
      room = new Room(id, url, passCode);
      this.list[id] = room;
      return room;
    }
  },

  _getRoomByValues: function(url, passCode) {
    var found = null;
    this.list.some(function (room) {
      if (room.url == url && room.passCode == passCode) {
        found = room;
        return true;
      }
    });
    return found;
  },

  _unusedId: function() {
    for (var i = 1; ; i++) {
      if (!(i in this.list)) {
        return i;
      }
    }
    throw new Error();
  }
};

var Room = function() {
  this.initialize.apply(this, arguments);
};

Room.prototype = {
  initialize: function(id, url, passCode) {
    this.id = id;
    this.url = url;
    this.passCode = passCode;
  }
};

var roomList = new RoomList();

// Helpers

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
  var id = Number(req.params.id);
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
  var id = Number(req.params.id);
  var title = "Room" + id;
  var room = roomList.getRoomById(id);
  if (!room) {
    error(res, 'No such room.');
    return;
  }
  var isPresenter = isPresenterOfRoom(req.session, room);
  var guestUrl = '/room/' + id;   // TODO: absolute URL
  res.render('room', { id: id,
                       title: title,
                       isPresenter: isPresenter,
                       guestUrl: guestUrl });
});

app.post('/register', function(req, res) {
  console.dir(req.body);
  var url = req.body.url;
  var passCode = req.body.passCode;
  if (!url || !passCode) {
    error(res, 'URL or pass code is not specified.');
    return;
  }
  if (url.search(/^https?:\/\//) == -1) {
    error(res, 'Invalid URL.');
    return;
  }
  var room = roomList.addRoom(url, passCode);
  req.session.passCode = passCode;
  res.redirect('/rooms/' + room.id);
});

// create session
app.get('/admin', function(req, res) {
  req.session.admin = true;
  res.redirect('/');
});

// rest ; proxy to upstream
app.all('/*', function(req, res, next) {
    if (req.url.match(/^\/_local\//)) {
    // delegate handling of proxy-local files to 'static' middleware
    next();
    return;
  }
  console.log("proxying: " + req.url);
  // set correct Host header field for upstream
  req.headers.host = UPSTREAM_HOST + ':' + UPSTREAM_PORT;
  if (req.url.match(/present$/)) {  // the file we wanted to edit
    prepareInsertScript(req, res);
    res.on('header', function() {
      if (300 <= res.statusCode && res.statusCode < 400) {
        console.log("warning: redirect detected: this document may not be published to the internet.");
      }
    });
  }
  proxy.proxyRequest(req, res);
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
  socket.on('move', function(data) {
    console.log(socket.handshake.session);
    if (!socket.handshake.session) {
      return false;
    }
    if (!socket.handshake.session.admin) {
      return false;
    }
    console.log("move: " + data);
    socket.broadcast.emit('move', data);
  });
  socket.on('cursormove', function(data) {
    if (!socket.handshake.session) {
      return false;
    }
    if (!socket.handshake.session.admin) {
      return false;
    }
    //console.log("cursormove: " + data);
    socket.broadcast.emit('cursormove', data);
  });
  socket.on('disconnect', function() {
    // do nothing
  });
});

var port = process.env.PORT || 3000; 
app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
