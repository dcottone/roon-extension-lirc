"use strict";
var LircNode = require('lirc_node'),
    RoonApi = require("node-roon-api"),
    RoonApiSettings = require('node-roon-api-settings'),
    RoonApiStatus = require('node-roon-api-status'),
    RoonApiTransport = require('node-roon-api-transport');

var transport;
var listenerID = {};
var zone;

var roon = new RoonApi({
    extension_id: 'com.dcaudio.roon.LIRControl',
    display_name: 'LIRC Remote Control',
    display_version: "1.0.0",
    publisher: 'Daniele Cottone',
    email: 'daniele.cottone@gmail.com',
    website: 'http://192.168.1.16:380/dcottone/roon-extension-lirc',

    core_paired: function (core) {
        update_status();
        transport = core.services.RoonApiTransport;

        transport.subscribe_zones(function (cmd, data) {
            /* console.log(core.core_id,
                         core.display_name,
                         core.display_version,
                         "-",
                         cmd,
                         JSON.stringify(data, null, '  '));*/
        });
    },

    core_unpaired: function (core) {
        /* console.log(core.core_id,
                 core.display_name,
                 core.display_version,
                 "-",
                 "LOST");*/
    }

});

var mysettings = roon.load_config("settings") || {
    remoteName: null,
    zone: null,
    playpauseKey: null,
    nextKey: null,
    prevKey: null,
    volumeUpKey: null,
    volumeDownKey: null,
    volumeMuteKey: null, // da implementare
};

function makelayout(settings) {
    var l = {
        values: settings,
        layout: [],
        has_error: false
    };

    //name of the Zone that will be managed by the Remote Controller

    l.layout.push({
        type: "zone",
        title: "Zone",
        setting: "zone",
    });

    //name of the Remote Controller from the LIRC setup (on linux: /etc/lirc/lircd.conf)
    let lircRemoteController = {
        type: "dropdown",
        title: "LIRC Remote Name",
        values: [],
        setting: "remoteName",
    };

    for (var remote in LircNode.remotes) {
        lircRemoteController.values.push({
            title: remote,
            value: remote
        });
    }
    l.layout.push(lircRemoteController);

    let lircPlayPauseKeyValue = {
        type: "dropdown",
        title: "Play/Pause Key",
        values: [],
        setting: "playpauseKey",
    };

    if (settings.remoteName) {
        for (var index in LircNode.remotes[settings.remoteName]) {
            var commandName = LircNode.remotes[settings.remoteName][index];
            lircPlayPauseKeyValue.values.push({
                title: commandName,
                value: commandName
            });
        }
    }
    l.layout.push(lircPlayPauseKeyValue);

    let lircPrevKeyValue = {
        type: "dropdown",
        title: "Prev Key",
        values: [],
        setting: "prevKey",
    };

    if (settings.remoteName) {
        for (var index in LircNode.remotes[settings.remoteName]) {
            var commandName = LircNode.remotes[settings.remoteName][index];
            lircPrevKeyValue.values.push({
                title: commandName,
                value: commandName
            });
        }
    }
    l.layout.push(lircPrevKeyValue);

    let lircNextKeyValue = {
        type: "dropdown",
        title: "Next Key",
        values: [],
        setting: "nextKey",
    };

    if (settings.remoteName) {
        for (var index in LircNode.remotes[settings.remoteName]) {
            var commandName = LircNode.remotes[settings.remoteName][index];
            lircNextKeyValue.values.push({
                title: commandName,
                value: commandName
            });
        }
    }
    l.layout.push(lircNextKeyValue);

    let lircVolumeUpKeyValue = {
        type: "dropdown",
        title: "Volume Up",
        values: [],
        setting: "volumeUpKey",
    };

    if (settings.remoteName) {
        for (var index in LircNode.remotes[settings.remoteName]) {
            var commandName = LircNode.remotes[settings.remoteName][index];
            lircVolumeUpKeyValue.values.push({
                title: commandName,
                value: commandName
            });
        }
    }
    l.layout.push(lircVolumeUpKeyValue);

    let lircVolumeDownKeyValue = {
        type: "dropdown",
        title: "Volume Down",
        values: [],
        setting: "volumeDownKey",
    };

    if (settings.remoteName) {
        for (var index in LircNode.remotes[settings.remoteName]) {
            var commandName = LircNode.remotes[settings.remoteName][index];
            lircVolumeDownKeyValue.values.push({
                title: commandName,
                value: commandName
            });
        }
    }
    l.layout.push(lircVolumeDownKeyValue);

    let lircVolumeMuteKeyValue = {
        type: "dropdown",
        title: "Volume Mute",
        values: [],
        setting: "volumeMuteKey",
    };

    if (settings.remoteName) {
        for (var index in LircNode.remotes[settings.remoteName]) {
            var commandName = LircNode.remotes[settings.remoteName][index];
            lircVolumeMuteKeyValue.values.push({
                title: commandName,
                value: commandName
            });
        }
    }
    l.layout.push(lircVolumeMuteKeyValue);
    return l;
}

var svc_settings = new RoonApiSettings(roon, {
    get_settings: function (cb) {
        cb(makelayout(mysettings));
    },
    save_settings: function (req, isdryrun, settings) {
        let l = makelayout(settings.values);
        req.send_complete(l.has_error ? "NotValid" : "Success", {
            settings: l
        });

        if (!isdryrun && !l.has_error) {
            var oldsettings = mysettings;
            mysettings = l.values;
            svc_settings.update_settings(l);
            let force = false;
            if (JSON.stringify(oldsettings) != JSON.stringify(mysettings)) force = true;
            if (force) {
                stop_listener();
                start_listener();
            }
            roon.save_config("settings", mysettings);
        }
        update_status();
    }
});

var svc_status = new RoonApiStatus(roon);

roon.init_services({
    provided_services: [svc_settings, svc_status],
    required_services: [RoonApiTransport],
});

function start_listener() {
    zone = transport.zone_by_output_id(mysettings.zone.output_id);
    

    if (mysettings.playpauseKey && mysettings.remoteName)
        listenerID["playpause"] = LircNode.addListener(mysettings.playpauseKey, mysettings.remoteName, function (data) {
            transport.control(mysettings.zone, 'playpause');
        }, 400);

    if (mysettings.nextKey && mysettings.remoteName)
        listenerID["next"] = LircNode.addListener(mysettings.nextKey, mysettings.remoteName, function (data) {
            transport.control(mysettings.zone, 'next');
        }, 400);

    if (mysettings.prevKey && mysettings.remoteName)
        listenerID["previous"] = LircNode.addListener(mysettings.prevKey, mysettings.remoteName, function (data) {
            transport.control(mysettings.zone, 'previous');
        }, 400);

    if (mysettings.volumeMuteKey && mysettings.remoteName)
        listenerID["mute"] = LircNode.addListener(mysettings.volumeMuteKey, mysettings.remoteName, function (data) {
            var volume = zone.outputs[0].volume;
            var how = volume.is_muted ? 'unmute' : 'mute';
            transport.mute(mysettings.zone,how);
        }, 400);
}

function stop_listener() {
    if (listenerID)
    for (const key in listenerID) {
        if (listenerID.hasOwnProperty(key)) {
            const element = listenerID[key];
            LircNode.removeListener(listenerID[element]);
        }
    }
}

function setup() {
    LircNode.init();
}

function update_status() {
    if (mysettings.remoteName)
        svc_status.set_status("Connected to 1 LIRC device.", false);
    else
        svc_status.set_status("Could not find LIRC device.", true)
}

setup();

roon.start_discovery();