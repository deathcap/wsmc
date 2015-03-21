'use strict';

var websocket_stream = require('websocket-stream');
var Client = require('minecraft-protocol/lib/client')
    , protocol = require('minecraft-protocol/lib/protocol')
    , assert = require('assert')
    , states = protocol.states;

module.exports = {
  protocol: require('minecraft-protocol/lib/protocol'),
  createClient: createClient
};

// websocket version of index.js createClient()
function createClient(options) {
  assert.ok(options, "options is required");
  var port = options.port || 24444;
  var host = options.host || 'localhost';
  var protocol = options.protocol || 'ws';
  var path = options.path || 'server';
  var url = options.url || (options.protocol + '://' + options.host + ':' + options.port + '/' + options.path);

  assert.ok(options.username, "username is required");
  var keepAlive = options.keepAlive == null ? true : options.keepAlive;


  var client = new Client(false);
  client.on('connect', onConnect);
  if (keepAlive) client.on([states.PLAY, 0x00], onKeepAlive);

  client.username = options.username;
  client.connectWS(url);

  return client;

  function onConnect() {
    client.socket.write(new Buffer(client.username));
    client.state = states.PLAY;
  }

  function onKeepAlive(packet) {
    client.write(0x00, {
      keepAliveId: packet.keepAliveId
    });
  }
}

Client.prototype.connectWS = function(url) {
  var ws = websocket_stream(url, {type: Uint8Array});
  this.setSocket(ws);
};

