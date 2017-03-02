
var make_url = '/make';

function exTrue(x,y) { return (x.hasOwnProperty(y) && x.y); }

function display_result(data) {
    if (typeof data !== 'undefined') {
        document.getElementById('debugpre').innerText = JSON.stringify(data,null,2);

        var message_text = '';
        if (data.hasOwnProperty('err')) message_text = data.err;
        if (exTrue(data,'created')) message_text += 'Created Just Now';
        if (!message_text.length) message_text = 'Found';
        document.getElementById('res_msg').innerText = message_text;
        
        var me = window.location.href.split(/\//);
        var repl_elems = [ ['res_orig_url', data.url],
                           ['res_short_url', me[0] + '//' + me[2] + '/' + data.hash, ],
                         ];
        for (var i=0; i<repl_elems.length; i++) {
            var ne = document.createElement('a');
            ne.innerText = repl_elems[i][1];
            ne.href = repl_elems[i][1];
            var e = document.getElementById(repl_elems[i][0]);
            while (e.firstChild) e.removeChild(e.firstChild);
            e.appendChild(ne);
        }

        document.getElementById('res_create_date').innerText = data.create_date;

    }
}

function make_query(ctx) {
    var xhr = new XMLHttpRequest();
    xhr.onerror = function(e) {
        var od = document.getElementById('outputdiv');
        var emsg = document.createElement('div');
        emsg.innerText = 'Error getting response.';
        od.appendChild(emsg);
    };
    xhr.onload = function() {
        if (xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);
            display_result(data);
        } else {
            console.log('whoops');
            console.log(xhr.responseText);
        }
    };
    xhr.open('POST',make_url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(ctx));

}


function setHandlers() {
    console.log('setHandlers()');

    var belem  = document.getElementById('doit');
    var doit = function() {
        var urlelem = document.getElementById('longurl');
        var url = urlelem.value;
        var ctx = {
            longurl: url,
        };
        var sugelem = document.getElementById('suggested_short');
        var sugval = sugelem.value;
        if (sugval.length) ctx.suggested_encoded = sugval;
        make_query(ctx);
    };
    belem.onclick = doit;
    var enterelems = ['longurl','suggested_short'];
    for (var i=0; i<enterelems.length; i++) {
        /* jshint loopfunc: true */
        var eelem = document.getElementById(enterelems[i]);
        eelem.addEventListener('keyup',function(ev) {
            if (ev.keyCode == 13) {
                doit();
            }
        });
    }

}

setHandlers();

