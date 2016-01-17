'use strict';

var mineflayer = require('./mineflayer-stream');
var websocket_stream = require('websocket-stream');

function createBot(options) {
  options.username = options.username || 'Player';

  var protocol = options.protocol || 'ws';
  var host = options.host || 'localhost';
  var port = options.port || 24444;
  var path = options.path || 'server';
  var url = options.url || (protocol + '://' + host + ':' + port + '/' + path);

  options.noPacketFramer = true;
  //options.noPacketSplitter = true;
  options.stream = websocket_stream(url);

  return mineflayer.createBot(options);
}

module.exports = {
  createBot: createBot
};
