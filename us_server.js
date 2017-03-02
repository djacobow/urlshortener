var path   = require('path');
var RESTConnection = require(path.resolve(__dirname,'./lib/RESTConnection.js'));
var shortener      = require(path.resolve(__dirname,'./lib/shortener.js'));
var config         = require(path.resolve(__dirname,'./lib/config.js')).get().us_server.server;

var rconn = new RESTConnection(config,shortener.handle);
rconn.startup();
