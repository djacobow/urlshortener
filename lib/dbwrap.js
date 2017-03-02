/*jshint esversion:6 */
var path = require('path');
var logger  = require(path.resolve(__dirname,'../lib/logger.js'));

var DBwrap = function(dbcfg) {
    var mysql   = require('mysql');
    var rpthis = this;
    var dbconfig = dbcfg;

    var connection = mysql.createConnection(dbconfig.conn_params);

    var is_connected = false;

    DBwrap.prototype.connect = function(cb) {
        logger.d('* dbwrap.connect');
        if (is_connected) {
            logger.d('dbwrap: already connected');
            return cb(null);
        }
        connection.connect(function(err) {
            if (err) return cb(err);
            is_connected = true;
            logger.d('dbwrap: connected to mysql!');
            return cb(null);
        });
    };

    DBwrap.prototype.disconnect = function() {
        logger.d('* dbwrap.disconnect');
        if (is_connected) {
            connection.end();
            is_connected = false;
            logger.d('dbwrap: byebye');
            return;
        }
        logger.w('dbwrap: can\'t disconnect if not connected');
    };


    DBwrap.prototype.kill_table = function(cb) {
        var qs = 'DROP TABLE ' + dbconfig.name + '.' + dbconfig.table + ';';
        this.qwrap(qs,function(err,rows) {
            if (err) return logger.e(err);
            is_connected = true;
            return cb(err,rows);
        });
    };


    DBwrap.prototype.qwrap = function(q, cb, tries = 3) {
        var dbthis = this;
        if (tries) {
            try {
                connection.query(q,function(e,r) {
                    if (e) logger.d(e);
                    if (e &&
                        (e.code !== undefined) &&
                        (e.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR')) {
                        try {
                            connection.end();
                        } catch (ce) { }
                        logger.d('will try to create new connection');
                        connection = mysql.createConnection(dbconfig.conn_params);
                        logger.d('db connection attempts_remaining: ' + (tries-1));
                        dbthis.qwrap(q,cb,tries-1);
                        return; // without calling callback
                    } else {
                        // return the result or error
                        return cb(e,r);
                    }
                });
            } catch (ee) {
                logger.e('dbwrap.qwrap caught EXCEPTION');
                if (ee) logger.e(ee);
                return cb(ee.toString(),null);
            }
        } else {
            return cb('exhausted_db_access_attempts',null);
        }
    };

};

module.exports = DBwrap;

