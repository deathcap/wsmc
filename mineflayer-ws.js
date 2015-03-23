'use strict';

var mc = require('./examples/mcwebchat/minecraft-protocol-ws')
  , hex = require('browser-hex')
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

var PACKET_DEBUG = false;

if (PACKET_DEBUG) global.hex = hex;
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

Bot.prototype.connect = function(options) {
  var self = this;
  self.client = mc.createClient(options);
  self.username = self.client.username;
  self.client.on('raw', function(raw) {
    if (PACKET_DEBUG) {
      console.log('received ',raw.length+' raw bytes');
      console.log(hex(raw));
    }
  });
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
