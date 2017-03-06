/*jshint strict: false */
/*jshint node: true */
/*jshint esversion: 6 */

"use strict";

var path = require("path");
var logger = require(path.resolve(__dirname, "./logger.js"));
var http = require('http');
var os   = require('os');
var fs   = require('fs');

var RESTConnection = function(config, handler) {

    var headers = {
        'Content-Type': 'application/json',
    };
    var writeNotFound = function(resp,result) {
        resp.writeHead(404,{'Content-Type':'text/html'});
        var s = '<html><head><title>Not Found</title></head><body>';
        s += '<h3>Sorry, I don\'t know that one.</h3>';
        s += '<pre>' + JSON.stringify(result,null,2) + '</pre>';
        s += '<a href="http://localhost:8090/">Perhaps you\'d like to create one?</a>';
        s += '</body></html>';
        resp.write(s);
        resp.end();
    };

    var server_final_callback = function(response,h,err,result) {
        var js = '';
        // logger.d('* rest server_final_callback');
        if (err) result.err = err;
        if (result.hasOwnProperty('was_url_get') && result.was_url_get) {
            if (result.found) {
                h = {
                    Location: result.url,
                };
                var s = ['Link Shortener Redirecting',
                         'From: ' + result.hash,
                         'To: ' + result.url ].join('\n');
                response.writeHead(303, h);
                response.write(s);
                response.end();
            } else {
                writeNotFound(response,result);
            }
        } else {
            response.writeHead(200, h);
            js = JSON.stringify(result);
            response.write(js);
            response.end();
        }
    };

    // We want to enable access from one port of the same machine to
    // another port of that machine, so that the server that serves
    // the kb classifier and files to host it can access this server.
    // This is better than just allowing *
    var rewriteHeaders = function(inheaders, origin) {
        var headers = JSON.parse(JSON.stringify(inheaders)); // deep copy
        var m = false;
        if (origin) m = origin.match(/(.*):(\d+)$/);
        if (m) {
            var origin_host = m[1];
            var origin_port = m[2];
            logger.d('origin_host: ' + origin_host);
            logger.d('origin_port: ' + origin_port);
            var url_hostname = 'http://' + os.hostname();
            logger.d('os hostname: ' + url_hostname);
            if ((origin_host === 'http://localhost') ||
                (origin_host === url_hostname)) {
                logger.d('origin matches localhost or our hostname');
                if (origin_port === '8080') {
                    logger.d('origin port is 8080');
                    headers['Access-Control-Allow-Origin'] = origin;
                    headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept';
                }
            }
        }
        return headers;
    };


    var splatCache = {};

    var splatFile = function(request,response,h) {
        logger.d('splatFile: ' + request.url);
        var complete_fn = path.join(__dirname, '../static', request.url);
        var is_js   = (request.url.match(/\.js$/));
        var is_html = (request.url.match(/\.html$/));
        var is_icon = (request.url.match(/\.ico$/));
        var is_png  = (request.url.match(/\.png$/));
        if (is_js)    h['Content-Type'] = 'application/javascript';
        if (is_html)  h['Content-Type'] = 'text/html';
        if (is_icon)  h['Content-Type'] = 'image/x-icon';
        if (is_png)   h['Content-Type'] = 'image/png';

        var finish_splat = function(ferr, fdata) {
            if (ferr) {
                logger.e(ferr);
                response.writeHead(403,h);
                response.end('Nah.');
            } else {
                response.writeHead(200,h);
                response.end(fdata);
            }
        };

        if (splatCache.hasOwnProperty(complete_fn)) {
            var fdata = splatCache[complete_fn];
            finish_splat(null,fdata);
        } else {
            fs.readFile(complete_fn, (is_icon || is_png) ? null : 'utf8', function(ferr,fdata) {
                if (!ferr) splatCache[complete_fn] = fdata;
                finish_splat(ferr,fdata);
            });
        }
    };

    // Set up a VERY simple server
    var handleRequest = function(request,response) {
        var reject = false;
        // logger.d('got request');
        var h;

        h = JSON.parse(JSON.stringify(headers));

        
        var dumpErr = function() {
            response.writeHead(403,{'Content-Type':'application/json'});
            response.write(JSON.stringify({'result':'Nope.'}));
            response.end();
            logger.d('sent err response');
        };

        if (request !== undefined) {
            if (request.method === 'OPTIONS') {
                if (request.url === '/handle') {
                    response.writeHead(200, h);
                    response.end();
                } else {
                    dumpErr();
                }
            } else if (request.method === 'GET') {
                var m = request.url.match(/\/([a-zA-Z0-9\-\.~_]+)/);
                if ((request.url === '/index.html') ||
                    (request.url === '/favicon.ico') ||
                    (request.url === '/icon-logo.png') ||
                    (request.url === '/') ||
                    (request.url === '/submitter.js')) {
                    if (request.url === '/') request.url = '/index.html';
                    splatFile(request,response,h);
                } else if (m) {
                    var fctx = {
                        ip: request.connection.remoteAddress,
                        encoded: m[1],
                    };
                    var bound_callback = server_final_callback.bind(null,response,h);
                    handler('lookup',fctx,bound_callback);
                } else {
                    dumpErr();
                }
            } else if  (request.method === 'POST') {
                if (request.url === '/make') {
                    var body = [];
                    request.on('data', function(chunk) {
                        var tot_size = body.reduce(function(a,x) { return a + x.length; },0) + chunk.length;
                        if (tot_size < config.max_allowed_req) {
                            body.push(chunk);
                        } else {
                            reject = true;
                        }
                    });
                    request.on('end', function() {
                        if (reject) {
                            dumpErr();
                        } else {
                            body = Buffer.concat(body).toString();
                            var fctx = JSON.parse(body);
                            fctx.ip = request.connection.remoteAddress;
                            var bound_callback = server_final_callback.bind(null,response,h);
                            handler('make',fctx,bound_callback);
                        }
                    });
                } else {
                    dumpErr();
                }
            } else {
                dumpErr();
            }
        } else {
            dumpErr();
        }
    };

    var server = http.createServer(handleRequest);

    var restart_server = function(s) {
        try {
            /*jshint loopfunc: true */
            s.listen(config.port, function() {
                logger.d('Server listening on port: ' + config.port);
            });
        } catch (e) {
            logger.e('Server caused exception.');
            logger.e(e);
            restart_server(s);
        }
    };

    RESTConnection.prototype.startup = function() {
        restart_server(server);
    };
};

module.exports = RESTConnection;

