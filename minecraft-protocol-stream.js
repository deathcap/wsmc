'use strict';

//process.env.NODE_DEBUG = 'mc-proto'; // for node-minecraft-protocol console packet debugging TODO: envify

var Client = require('minecraft-protocol/lib/client')
    , protocol = require('minecraft-protocol/lib/protocol')
    , assert = require('assert')
    , states = protocol.states;

module.exports = {
  protocol: require('minecraft-protocol/lib/protocol'),
  createClient: createClient
};

// generic stream version of index.js createClient()
function createClient(options) {
  assert.ok(options, "options is required");
  var stream = options.stream;
  assert.ok(options, "stream is required");

  assert.ok(options.username, "username is required");
  var keepAlive = options.keepAlive == null ? true : options.keepAlive;


  var client = new Client(false);
  client.on('connect', onConnect);
  client.once([states.LOGIN, 0x02], onLogin);
  client.once('compress', onCompressionRequest);
  client.once('set_compression', onCompressionRequest);
  if (keepAlive) client.on([states.PLAY, 0x00], onKeepAlive);

  client.username = options.username;
  client.setSocket(stream);

  return client;

  function onConnect() {
    client.socket.write(new Buffer(client.username));
    // wsmc uses slightly abbreviated protocol; skip the HANDSHAKING phase, go
    // directly to LOGIN, to receive login success and set compression packets
    client.state = states.LOGIN;
  }

  function onLogin(packet) {
    console.log('onLogin',packet);
    // successful login, transition to play phase
    client.state = states.PLAY;
    client.uuid = packet.uuid;
    client.username = packet.username;
  }

  function onCompressionRequest(packet) {
    console.log('onCompressionRequest', packet);
    client.compressionThreshold = packet.threshold;
  }

  function onKeepAlive(packet) {
    client.write(0x00, {
      keepAliveId: packet.keepAliveId
    });
  }
}
