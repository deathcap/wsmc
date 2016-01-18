'use strict';

//process.env.NODE_DEBUG = 'mc-proto'; // for node-minecraft-protocol console packet debugging TODO: envify

var EmptyTransformStream = require('through')();
var Client = require('minecraft-protocol').Client;
var protocol = require('minecraft-protocol');
var assert = require('assert');
var states = protocol.states;
var createClientStream = require('minecraft-protocol').createClientStream;

module.exports = {
  protocol: protocol,
  createClient: createClient
};

function createClient(options) {
  var client = createClientStream(options);

  client.on('connect', onConnect);

  return client;

  function onConnect() {
    client.socket.write(new Buffer(client.username));
    // wsmc uses slightly abbreviated protocol; skip the HANDSHAKING phase, go
    // directly to LOGIN, to receive login success and set compression packets
    client.state = states.LOGIN;
  }
}
