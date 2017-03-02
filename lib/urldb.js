/*jshint esversion:6 */
var path = require('path');
var logger = require(path.resolve(__dirname,'./logger.js'));
var DBwrap = require(path.resolve(__dirname,'./dbwrap.js'));
var config = require(path.resolve(__dirname,'./config.js')).get().us_server.db;

var URLdb = function() {

    var rv_keys = ['hash','id','url','create_date','last_update'];

    DBwrap.call(this, config);

    URLdb.prototype.lookup_encoded = function(encoded, cb) {
        var qs = 'SELECT * FROM ' + config.name + '.' + config.urltable + ' WHERE hash = ?;';
        this.qwrap({sql: qs, timeout: 5000, values: [encoded] }, function(err, rows) {
            if (err) {
                logger.d(err);
                return cb(err,{found: false, hash: encoded});
            } else if (!rows.length) {
                return cb(null,{found: false, hash: encoded});
            } else {
                var row = rows[0];
                var rv = { create: false, found: true };
                for (var i=0; i<rv_keys.length; i++) { rv[rv_keys[i]] = row[rv_keys[i]]; }
                return cb(null,rv);
            }
        });
    };


    URLdb.prototype.log =function(req,res,cb) {
        var qs = ['INSERT INTO',
                  config.name + '.' + config.logtable,
                  '(created,found,hash,date,ip,err)',
                  'VALUES(?,?,?,?,?,?);',
                 ].join(' ');
        var hash = req.hasOwnProperty('encoded') ? req.encoded : res.hash;
        var now = new Date();
        var err = res.hasOwnProperty('err') ? res.err : '';
        var created = res.hasOwnProperty('created') && res.created;
        var found   = res.hasOwnProperty('found') && res.found;
        var vals = [ created, found, hash, now, req.ip, err ];
        this.qwrap({sql: qs, timeout: 5000, values: vals},function(logerr,logres) {
            return cb(logerr,logres);
        });
    };

    URLdb.prototype.rowcount = function(cb) {
        var qs = 'SELECT COUNT(*) FROM ' + config.name + '.' + config.urltable + ';';
        this.qwrap({sql: qs, timeout: 5000, }, function(err, res) {
            if (err) return cb('count_err',Math.floor(Math.random() * 1e7));
            var count = res[0]['COUNT(*)'];
            logger.d(count);
            return cb(null,count);
        });
    };

    URLdb.prototype.lookup_raw = function(url, cb) {
        var qs = 'SELECT * FROM ' + config.name + '.' + config.urltable + ' WHERE url = ?;';
        this.qwrap({sql: qs, timeout: 5000, values: [url] }, function(err, rows) {
            var rv = { found: false, created: false };
            logger.d('lookup_raw');
            if (err) {
                logger.d(' * lokup_raw error');
                return cb(err, rv);
            } else if (!rows.length) {
                logger.d(' * lokup_raw no rows');
                return cb(null, rv);
            } else {
                logger.d(' * lokup_raw record');
                var row = rows[0];
                rv.found = true;
                for (var i=0; i<rv_keys.length; i++) { rv[rv_keys[i]] = row[rv_keys[i]]; }
                logger.d(rv);
                return cb(null,rv);
            }
        });
    };


    URLdb.prototype.store_entry = function(url,enc,cb) {
        var qs = ['INSERT INTO',
                  config.name + '.' + config.urltable,
                  '(url,hash,last_update,create_date)',
                  'VALUES(?,?,?,?);',
                 ].join(' ');
        var now = new Date();
        var vals = [ url, enc, now, now ];

        this.qwrap({sql: qs, timeout: 5000, values: vals},function(err,res) {
            if (err) {
                logger.e('qwrap return err');
                logger.e(err);
            }
            var rv = {
                found: true,
                created: true,
                hash: enc,
                url: url,
                last_update : now,
                create_date: now,
                id: res.insertId,
            };
            return cb(null,rv);
        });
    };

    URLdb.prototype.make_tables = function(cb) {
        tthis = this;
        tthis.create_urltable(function(cterr) {
            if (cterr) logger.e('Problem creating url table');
            else logger.d('url db created');
            tthis.create_logtable(function(cterr) {
                if (cterr) logger.e('Problem creating log table');
                else logger.d('log db created');
                return cb();
            });
        });
    };

    URLdb.prototype.create_logtable = function(cb) {
        var qs = [
            'CREATE TABLE IF NOT EXISTS ',
            config.name + '.' + config.logtable,
            ' (',
            'id INT NOT NULL UNIQUE AUTO_INCREMENT,',
            'created BOOLEAN,',
            'found BOOLEAN,',
            'hash VARCHAR(64),',
            'date DATETIME,',
            'ip VARCHAR(40),',
            'err VARCHAR(512),',
            'PRIMARY KEY ( id ), ',
            'KEY (hash) ',
            ');',
        ].join(' ');

        logger.d(qs);
        this.qwrap(qs,function(err,rows) {
            if (err) return logger.e(err);
            is_connected = true;
            return cb(err,rows);
        });
    };

    URLdb.prototype.create_urltable = function(cb) {
        var qs = [
            'CREATE TABLE IF NOT EXISTS ',
            config.name,
            '.',
            config.urltable,
            ' (',
            'id INT NOT NULL UNIQUE AUTO_INCREMENT, ',
            'url VARCHAR(1024) NOT NULL UNIQUE, ',
            'hash VARCHAR(64) NOT NULL UNIQUE, ',
            'last_update DATETIME, ',
            'create_date DATETIME, ',
            'PRIMARY KEY ( url ), ',
            'KEY (hash) ',
            ');',
        ].join('');

        logger.d(qs);
        this.qwrap(qs,function(err,rows) {
            if (err) return logger.e(err);
            is_connected = true;
            return cb(err,rows);
        });
    };
};

URLdb.prototype = Object.create(DBwrap.prototype);
URLdb.constructor = URLdb;
module.exports = URLdb;

if (require.main == module) {
    db = new URLdb();
    db.make_tables(function() { });
}

