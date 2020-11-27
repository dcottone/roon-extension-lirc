exports.version = '1.0.0';
exports.IRSend = require('./irsend');
exports.irsend = new exports.IRSend();
exports.remotes = {};

exports.IRReceive = require('./irreceive');
var irreceive = new exports.IRReceive();
exports.addListener = irreceive.addListener.bind(irreceive);
exports.on = exports.addListener;
exports.removeListener = irreceive.removeListener.bind(irreceive);

// In some cases the default lirc socket does not work
// More info at http://wiki.openelec.tv/index.php?title=Guide_to_Lirc_IR_Blasting
exports.setSocket = function(socket) {
  irsend.setSocket(socket);
}

exports.init= function(callback) {
  return new Promise((resolve, reject) => {
    exports.irsend.list('', '', irsendCallback);

    function irsendCallback(error, stdout, stderr) {
      exports._populateRemotes(error, stdout, stderr);
      exports._populateCommands().then(() => {
        if (callback) callback();
        resolve();
      }).catch(err => reject(err));

    }
  });
}

// Private
exports._populateRemotes=function(error, stdout, stderr) {
  if (error) console.log('ERROR: Error retrieving list of remotes from lirc:\n' + error);
  var remotes = stdout.trim().split('\n');

  // exports.remotes = {};

  remotes.forEach(function(element, index, array) {
    element = element.trim();
    var remoteName = element.match(/^(.+)$/);
    if (remoteName) exports.remotes[remoteName[1]] = [];
  });

  if (Object.keys(remotes).length === 0) console.log('ERROR: No remotes found. Raw result from irsend was: ' + stdout);
}

exports._populateCommands=function () {
  const data = [];
  for (var remote in exports.remotes) {
    data.push(new Promise((resolve, reject) => {
      (function (remote) {
        exports.irsend.list(remote, '', function (error, stdout, stderr) {
          exports._populateRemoteCommands(remote, error, stdout, stderr);
          resolve();
        });
      })(remote);
    }));

  }
  return Promise.all(data);
}

exports._populateRemoteCommands=function(remote, error, stdout, stderr) {
  var commands = stdout.trim().split('\n');
  commands.forEach(function(element, index, array) {
    element = element.trim();
    var commandName = element.match(/^(.+)$/);
    if (commandName && commandName[1]) {
      // Commands come in 0000000 COMMAND_NAME format, where the number is the
      // command's ID (an incrementing hexadecimal) and COMMAND_NAME is the
      // actual command that can be given to irsend. We keep just COMMAND_NAME.
      commandName[1] = commandName[1].split(' ')[1];
      exports.remotes[remote].push(commandName[1]);
    }
  });
}
