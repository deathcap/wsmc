'use strict';

var mc = require('minecraft-protocol')
  , EventEmitter = require('events').EventEmitter
  , util = require('util')
  , path = require('path')
  , websocket_stream = require('websocket-stream')
  , plugins = {
      bed: require('./lib/plugins/bed'),
      block_actions: require('./lib/plugins/block_actions'),
      blocks: require('./lib/plugins/blocks'),
      chat: require('./lib/plugins/chat'),
      digging: require('./lib/plugins/digging'),
      entities: require('./lib/plugins/entities'),
      experience: require('./lib/plugins/experience'),
      game: require('./lib/plugins/game'),
      health: require('./lib/plugins/health'),
      inventory: require('./lib/plugins/inventory'),
      kick: require('./lib/plugins/kick'),
      physics: require('./lib/plugins/physics'),
      rain: require('./lib/plugins/rain'),
      settings: require('./lib/plugins/settings'),
      spawn_point: require('./lib/plugins/spawn_point'),
      time: require('./lib/plugins/time')
    };

module.exports = {
  vec3: require('vec3'),
  createBot: createBot,
  Block: require('./lib/block'),
  Location: require('./lib/location'),
  Biome: require('./lib/biome'),
  Entity: require('./lib/entity'),
  Painting: require('./lib/painting'),
  Item: require('./lib/item'),
  Recipe: require('./lib/recipe'),
  windows: require('./lib/windows'),
  Chest: require('./lib/chest'),
  Furnace: require('./lib/furnace'),
  Dispenser: require('./lib/dispenser'),
  EnchantmentTable: require('./lib/enchantment_table'),
  blocks: require('./lib/enums/blocks'),
  biomes: require('./lib/enums/biomes'),
  items: require('./lib/enums/items'),
  recipes: require('./lib/enums/recipes'),
  instruments: require('./lib/enums/instruments'),
  materials: require('./lib/enums/materials'),
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
