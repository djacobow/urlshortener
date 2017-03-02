var argv               = require('minimist')(process.argv.slice(2));
var path               = require('path');
var db_creds = require(path.resolve(__dirname, "../us_db_creds.json"));

var daves_laptop = false;

var raw_config = {
    us_server: {
        server: {
            max_allowed_req: 1048576,
            port: 8090,
        },
        db: {
            conn_params: {
                host: 'localhost',
                user: 'us_setter',
                // password: 'p34^&fB9',
            },
            name: 'urlshortener',
            urltable: 'urltable',
            logtable: 'logtable',
        },
        encdec: {
            alphabet: ['abcdefghijklmnopqrstuvwxyz',
                       'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                       '0123456789',
                       '-._~',
                      ].join(''),
            // alphabet: '0123456789',
            // alphabet: '0123456789abcdef',
        }
    },
};

var getConfig = function() {
    var cooked = JSON.parse(JSON.stringify(raw_config));
    cooked.us_server.db.conn_params = db_creds;
    cooked.argv = argv;
    if (argv.p !== undefined) {
        cooked.user_server.server.port = argv.p;
    }
    return cooked;
};

module.exports.get = getConfig;

