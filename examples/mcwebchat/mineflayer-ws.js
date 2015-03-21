'use strict';

var mc = require('minecraft-protocol')
  , EventEmitter = require('events').EventEmitter
  , util = require('util')
  , path = require('path')
  , websocket_stream = require('websocket-stream')
  , plugins = {
      bed: require('mineflayer/lib/plugins/bed'),
      block_actions: require('mineflayer/lib/plugins/block_actions'),
      blocks: require('mineflayer/lib/plugins/blocks'),
      chat: require('mineflayer/lib/plugins/chat'),
      digging: require('mineflayer/lib/plugins/digging'),
      entities: require('mineflayer/lib/plugins/entities'),
      experience: require('mineflayer/lib/plugins/experience'),
      game: require('mineflayer/lib/plugins/game'),
      health: require('mineflayer/lib/plugins/health'),
      inventory: require('mineflayer/lib/plugins/inventory'),
      kick: require('mineflayer/lib/plugins/kick'),
      physics: require('mineflayer/lib/plugins/physics'),
      rain: require('mineflayer/lib/plugins/rain'),
      settings: require('mineflayer/lib/plugins/settings'),
      spawn_point: require('mineflayer/lib/plugins/spawn_point'),
      time: require('mineflayer/lib/plugins/time')
    };

module.exports = {
  //vec3: require('vec3'), // not really needed
  createBot: createBot,
  Block: require('mineflayer/lib/block'),
  Location: require('mineflayer/lib/location'),
  Biome: require('mineflayer/lib/biome'),
  Entity: require('mineflayer/lib/entity'),
  Painting: require('mineflayer/lib/painting'),
  Item: require('mineflayer/lib/item'),
  Recipe: require('mineflayer/lib/recipe'),
  windows: require('mineflayer/lib/windows'),
  Chest: require('mineflayer/lib/chest'),
  Furnace: require('mineflayer/lib/furnace'),
  Dispenser: require('mineflayer/lib/dispenser'),
  EnchantmentTable: require('mineflayer/lib/enchantment_table'),
  blocks: require('mineflayer/lib/enums/blocks'),
  biomes: require('mineflayer/lib/enums/biomes'),
  items: require('mineflayer/lib/enums/items'),
  recipes: require('mineflayer/lib/enums/recipes'),
  instruments: require('mineflayer/lib/enums/instruments'),
  materials: require('mineflayer/lib/enums/materials'),
};

function createBot(options) {
  options = options || {};
  options.username = options.username || 'Player';
  options.protocol = options.protocol || 'ws';
  options.host = options.host || 'localhost';
  options.port = options.port || 24444;
  options.path = options.path || 'server';
  options.url = options.url || (options.protocol + '://' + options.host + ':' + options.port + '/' + options.path);

  var bot = new Bot();
  bot.connect(options);
  return bot;
}

function Bot() {
  EventEmitter.call(this);
  this.client = null;
}
util.inherits(Bot, EventEmitter);

// decode packet over WebSocket - always in play state
var decodePacket = function(data) {
  if (!(data instanceof Uint8Array)) {
    return undefined;
  }

  // convert typed array to NodeJS buffer for minecraft-protocol's API
  // TODO: is this conversion fast? backed by ArrayBuffer in Browserify 3, see https://npmjs.org/package/native-buffer-browserify
  //  but is this the right way to "convert" from an ArrayBuffer to a Buffer, without copying?
  data._isBuffer = true;
  //var length = String.fromCharCode(data.length); // XXX
  //var buffer = new Buffer(length + data);
  var buffer = new Buffer(data);

  var state = minecraft_protocol.protocol.states.PLAY;
  var isServer = false;
  var shouldParsePayload = {packet: 1}; // somehow this is needed to parse the fields TODO: figure out how this is supposed to work

  var result = minecraft_protocol.protocol.parsePacket(buffer, state, isServer, shouldParsePayload);
  if (!result || result.error) {
    console.log('protocol parse error',result);
    log('protocol parse error: ' + JSON.stringify(result));
    return;
  }
  var payload = result.results;
  var id = result.results.id;
  var name = minecraft_protocol.protocol.packetNames[state].toClient[id];
  //console.log('parsed',name,result);

  return {name:name, id:id, payload:payload};
};

Bot.prototype.connect = function(options) {
  var self = this;
  self.client = mc.createClient(options);
  self.username = self.client.username;
  self.client.on('session', function() {
    self.username = self.client.username;
  });
  self.client.on('connect', function() {
    self.emit('connect');
  });
  self.client.on('error', function(err) {
    self.emit('error', err);
  });
  self.client.on('end', function() {
    self.emit('end');
  });
  for (var pluginName in plugins) {
    plugins[pluginName](self, options);
  }
};

Bot.prototype.end = function() {
  this.client.end();
};
