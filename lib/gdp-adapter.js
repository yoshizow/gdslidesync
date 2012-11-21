/*
 * Copyright(c) 2012 yoshizow
 * MIT Licensed
 */

var url = require('url'),
    httpProxy = require('http-proxy'),
    https = require('https');

var UPSTREAM_HOST = 'docs.google.com';
var UPSTREAM_PORT = 443;
var UPSTREAM_IS_HTTPS = true;

var proxy = new httpProxy.HttpProxy({
  target: {
    host: UPSTREAM_HOST,
    port: UPSTREAM_PORT,
    https: UPSTREAM_IS_HTTPS
  }
});

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

var proxyRequest = function(req, res) {
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
};

var validateURL = function(theUrl) {
    var path = url.parse(theUrl).path;
    path = path.replace(/\/edit$/, '/present');

    return { isValid: true, url: path };
};

var unescapeHTML = function(str) {
    str = str.replace(/&lt;/g, '<');
    str = str.replace(/&gt;/g, '>');
    str = str.replace(/&quot;/g, '"');
    str = str.replace(/&#39;/g, "'");
    str = str.replace(/&amp;/g, '&');
    return str;
};

var getTitle = function(path, callback) {
    var callback_once = function(error, result) {
        if (callback) {
            callback(error, result);
            callback = null;
        }
    };

    var options = {
        host: UPSTREAM_HOST,
        port: UPSTREAM_PORT,
        path: path,
        method: 'GET'
    };
    var req;
    req = https.request(options, function(res) {
        if (res.statusCode != 200) {
            callback_once(new Error('Bad response'), null);
            return;
        }
        var body = '';
        res.setEncoding('utf-8');
        res.on('data', function(data) {
            body += data;
            var match = /<meta itemprop="name" content="([^"]*)">/.exec(body);
            if (match) {
                if (req) req.abort();
                callback_once(null, unescapeHTML(match[1]));
            }
        });
        res.on('end', function() {
            callback_once(new Error('No title found'), null);
        });
    });
    req.on('error', function(e) {
        callback_once(new Error('Failed to get document: ' + e), null);
    });
    req.end();
};

exports.proxyRequest = proxyRequest;
exports.validateURL = validateURL;
exports.getTitle = getTitle;
