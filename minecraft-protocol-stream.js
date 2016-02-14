'use strict';

//process.env.NODE_DEBUG = 'mc-proto'; // for node-minecraft-protocol console packet debugging TODO: envify

var EmptyTransformStream = require('through')();
var Client = require('minecraft-protocol').Client;
var forgeHandshake = require('minecraft-protocol-forge').forgeHandshake;
var protocol = require('minecraft-protocol');
var assert = require('assert');
var states = protocol.states;

module.exports = {
  protocol: protocol,
  createClient: createClient
};

// generic stream version of index.js createClient()
function createClient(options) {
  assert.ok(options, "options is required");
  var stream = options.stream;
  assert.ok(stream, "stream is required");

  assert.ok(options.username, "username is required");
  var keepAlive = options.keepAlive == null ? true : options.keepAlive;

  var optVersion = options.version || require('./mcversion.js');
  var mcData = require('minecraft-data')(optVersion);
  var version = mcData.version;

  var client = new Client(false, version.majorVersion);

  // Options to opt-out of MC protocol packet framing (useful since WS is alreay framed)
  if (options.noPacketFramer) {
    client.framer = EmptyTransformStream;
  }
  if (options.noPacketSplitter) {
    client.splitter = EmptyTransformStream;
  }

  client.on('connect', onConnect);
  client.once('success', onLogin);
  client.once('compress', onCompressionRequest);
  client.once('set_compression', onCompressionRequest);
  if (keepAlive) client.on('keep_alive', onKeepAlive);

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

    if (packet.username.indexOf('\0') !== -1) {
      var parts = packet.username.split('\0');
      console.log('WSMC-augmented login packet detected, username field pieces: ',parts);
      client.username = parts[0];
      client.wsmcPingResponse = JSON.parse(parts[1]); // ping payload response, modinfo for Forge servers
    } else {
      client.username = packet.username;
    }
  }

  function onCompressionRequest(packet) {
    console.log('onCompressionRequest', packet);
    client.compressionThreshold = packet.threshold;
  }

  function onKeepAlive(packet) {
    client.write('keep_alive', {
      keepAliveId: packet.keepAliveId
    });
  }
}
