"use strict";
var LircNode             = require('lirc_node'),
    RoonApi              = require("node-roon-api"),
    RoonApiSettings      = require('node-roon-api-settings'),
    RoonApiStatus        = require('node-roon-api-status'),
    RoonApiTransport     = require('node-roon-api-transport');

var roon = new RoonApi({
    extension_id:        'com.dcaudio.roon.LIRControl',
    display_name:        'LIRC Remote Control',
    display_version:     "1.0.0",
    publisher:           'Daniele Cottone',
    email:               'daniele.cottone@gmail.com',
    website:             'https://github.com/stefan747/roon-extension-IRControl',

    core_paired: function(core) {
        update_status();
        let transport = core.services.RoonApiTransport;
        transport.subscribe_zones(function(cmd, data) {
                                      console.log(core.core_id,
                                                  core.display_name,
                                                  core.display_version,
                                                  "-",
                                                  cmd,
                                                  JSON.stringify(data, null, '  '));
                                  });
    },

    core_unpaired: function(core) {
                   console.log(core.core_id,
                           core.display_name,
                           core.display_version,
                           "-",
                           "LOST");
               }

});

var mysettings = roon.load_config("settings") || {
    remoteName:    "",
    zone:          null,
};

function makelayout(settings) {
    var l = {
        values:    settings,
        layout:    [],
        has_error: false
    };

    //name of the Zone that will be managed by the Remote Controller

        l.layout.push({
            type:    "zone",
            title:   "Zone",
            setting: "zone",
            });

    //name of the remote from the LIRC setup (on linux: /etc/lirc/lircd.conf)
        l.layout.push({
            type:      "string",
            title:     "LIRC Remote Name",
            maxlength: 256,
            setting:   "remoteName",
        });
        
        return l;
}

var svc_settings = new RoonApiSettings(roon, {
    get_settings: function(cb) {
        cb(makelayout(mysettings));
    },
    save_settings: function(req, isdryrun, settings) {
    let l = makelayout(settings.values);
        req.send_complete(l.has_error ? "NotValid" : "Success", { settings: l });

        if (!isdryrun && !l.has_error) {
            var oldremotename = mysettings.remoteName;
            mysettings = l.values;
            svc_settings.update_settings(l);
            let force = false;
            if (oldremotename != mysettings.remoteName) force = true;
            if (force) setup();
            roon.save_config("settings", mysettings);
        }
    }
});

var svc_status = new RoonApiStatus(roon);

roon.init_services({
    provided_services: [ svc_settings, svc_status ], 
    required_services: [ RoonApiTransport ],
});

function setup() {
    console.log("[LIRControl Extension] Setup: ", mysettings.remoteName);
    LircNode.init();
    //initialize lirc_node
    for (var remote in LircNode.remotes)
        console.log("remote = " + remote);
    
    update_status();


    // Listening for commands
var listenerId = LircNode.addListener(function(data) {
    console.log("Received IR keypress '" + data.key + "'' from remote '" + data.remote +"'");
  });

    console.log(mysettings);
}

function update_status() {
    if (mysettings.remoteName)
	svc_status.set_status("Connected to 1 LIRC device.", false);
    else
	svc_status.set_status("Could not find LIRC device.", true)
}

//setup();

roon.start_discovery();