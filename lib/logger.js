/*jshint esversion:6 */

var fs = require('fs');
var include_date = false; // when run as a service, the service will do this for us.

Object.defineProperty(global, '__stack', {
    get: function() {
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function(_, stack) {
            return stack;
        };
        var err = new Error();
        Error.captureStackTrace(err, arguments.callee);
        var stack = err.stack;
        Error.prepareStackTrace = orig;
        return stack;
    }
});

Object.defineProperty(global, '__line', {
    get: function() {
        return __stack[3].getLineNumber();
    }
});

Object.defineProperty(global, '__file', {
    get: function() {
        return __stack[3].getFileName();
    }
});

Object.defineProperty(global, '__function', {
    get: function() {
        return __stack[3].getFunctionName();
    }
});

function digits(s) {
    os = '';
    if (s < 10) os += '0';
    os += s.toString();
    return os;
}


function format(s, t) {

    var l = __line;
    var f = __function;
    var file = __file.match(/([^\/]*)\/*$/)[1];
    // f = __function + ':' + __file + ':' +  __line;
    if (typeof s == 'undefined') s = '';
    var ss = s;
    if (typeof s == 'object') {
        ss = "\n" + JSON.stringify(s, null, 2);
    } else if (typeof s == 'function') {
        ss = 'function';
    }

    var disp_s = '';
    var file_s = '';

    var now = new Date();

    var ds = now.getUTCFullYear().toString() +
        '-' +
        digits(now.getUTCMonth() + 1) +
        '-' +
        now.getUTCDate().toString() + 'T' +
        digits(now.getUTCHours()) + ':' +
        digits(now.getUTCMinutes()) + ':' +
        digits(now.getUTCSeconds());

    file_s += ds + ' | ';

    if (t.match(/\w/)) {
        // most screen log messages will not get file/line info,
        // but ones that are debug, warning, or err will
        disp_s += t + ' | ' + file + ':' + l + ' | ';
    } else {
        // here the t is just whitepace, so we just are making the
        // pipes line up
        disp_s += t + ' | ';
    }
    file_s += t + ' | ' + file + ':' + l + ' | ' + ss;
    disp_s += ss;

    return [disp_s, file_s];
}

function log(s) {
    var [disp_s, file_s] = format(s, '   ');
    console.log(disp_s);
    if (global.log_stream) global.log_stream.write(file_s + "\n");
}

function warn(s) {
    var [disp_s, file_s] = format(s, 'wrn');
    console.log(disp_s);
    if (global.log_stream) global.log_stream.write(file_s + "\n");
}

function error(s) {
    var [disp_s, file_s] = format(s, 'ERR');
    console.log(disp_s);
    if (global.log_stream) global.log_stream.write(file_s + "\n");
}

function critical(s) {
    var [disp_s, file_s] = format(s, '!E!');
    console.log(disp_s);
    if (global.log_stream) global.log_stream.write(file_s + "\n");
}

function debug(s) {
    var [disp_s, file_s] = format(s, 'dbg');
    console.log(disp_s);
    if (global.log_stream) global.log_stream.write(file_s + "\n");
}


function openFile(fn) {
    closeFile();
    global.log_stream = fs.createWriteStream(fn, {'flags':'a'});
}

function closeFile() {
    if (global.log_stream !== undefined) global.log_stream.end();
    global.log_stream = undefined;
}

function analytics_log(tp,args,scores = null) {

    var rv = {
        'type': tp,
        'date': new Date(),
    };
    if (tp === 'target_info') {
        rv.target_info = args;
    } else {
        var dumpargs = [ 'id', 'user_str', 'user_links', 'emails', 'name', ];
        for (var i=0; i<dumpargs.length; i++) {
            var da = dumpargs[i];
            if (args.hasOwnProperty(da)) {
                rv[da] = args[da];
            }
        }
        if (scores) {
            rv.scores = scores.slice(0,2);
        }
    }

    if ((tp !== 'target_info') || rv.target_info) {
        try {
            var ls = fs.createWriteStream('analytics_log.json',{'flags':'a'});
            if (ls) {
                ls.end(JSON.stringify(rv) + "\n====================\n");
            } else {
                warn('Could not write to analytics file.');
            }
        } catch (e) {
            warn(e);
            warn('Could not write to analytics file.');
        }
    }
}


// long and very short names for each of these
module.exports.log = log;
module.exports.l = log;
module.exports.warn = warn;
module.exports.w = warn;
module.exports.err = error;
module.exports.e = error;
module.exports.crit = critical;
module.exports.c = critical;
module.exports.debug = debug;
module.exports.d = debug;
module.exports.open = openFile;
module.exports.close = closeFile;
module.exports.analytics_log = analytics_log;

