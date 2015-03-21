'use strict';

var minecraft_protocol = require('minecraft-protocol');
var hex = require('hex');
var WebSocketServer = (require('ws')).Server;
var websocket_stream = require('websocket-stream');
var argv = (require('optimist'))
  .default('wshost', '0.0.0.0')
  .default('wsport', 24444)
  .default('mchost', 'localhost')
  .default('mcport', 25565)
  .default('prefix', 'webuser-')
  .argv;

console.log('WS('+argv.wshost+':'+argv.wsport+') <--> MC('+argv.mchost+':'+argv.mcport+')');

var states = minecraft_protocol.protocol.states;
var ids = minecraft_protocol.protocol.packetIds.play.toClient;
var sids = minecraft_protocol.protocol.packetIds.play.toServer;


var userIndex = 1;

var wss = new WebSocketServer({
  host: argv.wshost,
  port: argv.wsport});

wss.on('connection', function(new_websocket_connection) {
  var ws = websocket_stream(new_websocket_connection);
  var loggingIn = true;

  ws.write('OK', {binary: true});

  var mc = minecraft_protocol.createClient({
    host: argv.mchost,
    port: argv.mcport,
    username: argv.prefix + userIndex,
    password: null});

  userIndex += 1;

  ws.on('close', function() {
    console.log('WebSocket disconnected, closing MC');
    if (mc.socket) mc.socket.end();
  });

  ws.on('error', function(err) {
    console.log('WebSocket error: ',err);
    mc.socket.end();
  });

  mc.on('raw', function(buffer) {
    console.log('mc received '+buffer.length+' bytes');
    hex(buffer);
    ws.write(buffer);
  });

  mc.on('connect', function() {
    console.log('Successfully connected to MC');
  });

  mc.on('error', function(err) {
    console.log('Received error from MC:',err);
  });

  mc.once(['login', 'success'], function(p) {
    // after login completes, stop parsing packet payloads and forward as-is to client
    //mc.shouldParsePayload = false; // removed
  });

  ws.on('data', function(raw) {
    console.log('websocket received '+raw.length+' bytes');
    hex(raw);

    if (loggingIn) {
      // first packet username
      console.log('WS requested username: '+raw); // TODO: use it
      loggingIn = false;
      return;
    }

    //console.log "websocket received '+raw.length+' bytes: '+JSON.stringify(raw));

    try {
      mc.writeRaw(raw);
    } catch (e) {
      console.log('error in mc.writeRaw:',e);
      mc.socket.end();
    }
  });
});

