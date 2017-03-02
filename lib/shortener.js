
var path   = require('path');
var logger = require(path.resolve(__dirname,'./logger.js'));
var URLdb  = require(path.resolve(__dirname,'./urldb.js'));
var ed     = require(path.resolve(__dirname,'./encdec.js'));
var vu     = require('valid-url');
var async  = require('async');
var db     = new URLdb();

var DumbCache = function() {

    var cache = {};

    DumbCache.prototype.set = function(hash,record) {
        cache[hash] = {
            last_touch: new Date(),
            record: record,
            hit_count: 0,
        };
    };

    DumbCache.prototype.get = function(hash) {
        if (cache.hasOwnProperty(hash)) {
            var e = cache[hash];
            e.last_touch = new Date();
            e.hit_count += 1;
            return e.record;
        }
        return null;
    };

    DumbCache.prototype.purgeOld = function() {
        var hashes = Object.keys(cache);
        var one_day = 1000 * 60 * 60 * 24;
        var now = (new Date()).getTime();
        for (var i=0; i<hashes.length; i++) {
            var hash = hashes[i];
            var elem = cache[hash];
            var etime = elem.last_touch.getTime();
            if ((now - etime) > one_day) delete cache[hash];
        }
    };

    DumbCache.prototype.setTimers = function(period) {
        var cthis = this;
        var runAndReset = function() {
            cthis.updateDirties();
            cthis.purgeOld();
            if (cthis.still_running) {
                setTimeout(runAndReset, period);
            }
        };
        setTimeout(runAndreset, period);
    };

};


var dc = new DumbCache();

var last_id = 0;
db.rowcount(function(c) {
    last_id = c;
});

var handle = function(what, context, cb) {
    if (what === 'lookup') {
        var dcres = dc.get(context.encoded);
        if (dcres) { 
            logger.d('result from memcache!');
            return(null,dcres);
        }

        db.lookup_encoded(context.encoded, function(luerr, lures) {
            lures.was_url_get = true;
            db.log(context, lures, function(logerr,logres) { /* not important */ });
            return cb(luerr, lures);
        });
    } else if (what === 'make') {
        var url = context.longurl;
        if (!vu.isUri(url)) return cb('invalid_url',{});

        var suggested = context.hasOwnProperty('suggested_encoded') ?
                        context.suggested_encoded : null;


        var check_hash_exists = function(hash,cb) {
            db.lookup_encoded(hash,function(err,res) {
                if (res.found) {
                    logger.d('check hash return TRUE');
                    return cb(true,res);
                }
                logger.d('check hash return FALSE');
                return cb(false,res);
            });
        };

        var check_url_exists = function(url,cb) {
            db.lookup_raw(url,function(err,res) {
                if (res.found && res.hasOwnProperty('hash') && (res.hash !== null)) {
                    logger.d('check url return TRUE');
                    return cb(true,res);
                }
                logger.d('check url return FALSE');
                return cb(false,res);
            });
        };

        var create_from_url = function(url,sug,ccb) {
            logger.d('* create_from_url');
            if (sug === null) {
                db.rowcount(function(rcerr,count) {
                    try_id = last_id;
                    if (!try_id) try_id = count;
                    var exists = true;
                    var try_enc = ed.enc(try_id);
                
                    async.doUntil(function(dcb) {
                        logger.d('try_id: ' + try_id);
                        try_enc = ed.enc(try_id);
                        logger.d('try_enc: ' + try_enc);
                        try_id += 1;
                        check_hash_exists(try_enc,function(yup,chres) {
                            exists = yup;
                            dcb(null, yup);
                        });
                    },function(r) { return !r; },
                    function() {
                        db.store_entry(url,try_enc,function(err,res) {
                            if (err) logger.d(err);
                            last_id = res.id;
                            return ccb(err,res);
                        });
                    });
                    
                });
            } else {
                db.store_entry(url,sug,function(err,res) {
                    if (err) logger.d(err);
                    last_id = res.id;
                    return ccb(err, res);
                });
            }
        };


        if (suggested) {
            check_hash_exists(suggested, function(exists,chres) {
                if (exists) return cb('shortname_in_use',chres);
                check_url_exists(url, function(exists,chres) {
                    if (exists) return cb('url_already_registered',chres);
                    create_from_url(url,suggested,function(err, res) {
                        db.log(context, res, function(logerr,logres) { /* not important */ });
                        return cb(err, res);
                    });
                });
            });
        } else {
            check_url_exists(url, function(exists,chres) {
                if (exists) return cb('url_already_registered',chres);
                create_from_url(url,null,function(err, res) {
                    db.log(context, res, function(logerr,logres) { /* not important */ });
                    return cb(err, res);
                });
            });
        }

    
    } else {
        return cb('unknown_action');
    }
};


module.exports = {
    handle: handle,
};


