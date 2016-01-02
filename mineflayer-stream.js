'use strict';

var mc = require('./minecraft-protocol-stream')
  , hex = require('browser-hex')
  , EventEmitter = require('events').EventEmitter
  , util = require('util')
  , path = require('path')
  , plugins = {
      bed: require('mineflayer/lib/plugins/bed'),
      block_actions: require('mineflayer/lib/plugins/block_actions'),
      blocks: require('mineflayer/lib/plugins/blocks'),
      chat: require('mineflayer/lib/plugins/chat'),
      chest: require('mineflayer/lib/plugins/chest'),
      craft: require('mineflayer/lib/plugins/craft'),
      creative: require('mineflayer/lib/plugins/creative'),
      digging: require('mineflayer/lib/plugins/digging'),
      dispenser: require('mineflayer/lib/plugins/dispenser'),
      enchantment_table: require('mineflayer/lib/plugins/enchantment_table'),
      entities: require('mineflayer/lib/plugins/entities'),
      experience: require('mineflayer/lib/plugins/experience'),
      game: require('mineflayer/lib/plugins/game'),
      health: require('mineflayer/lib/plugins/health'),
      inventory: require('mineflayer/lib/plugins/inventory'),
      kick: require('mineflayer/lib/plugins/kick'),
      physics: require('mineflayer/lib/plugins/physics'),
      rain: require('mineflayer/lib/plugins/rain'),
      settings: require('mineflayer/lib/plugins/settings'),
      simple_inventory: require('mineflayer/lib/plugins/simple_inventory'),
      sound: require('mineflayer/lib/plugins/sound'),
      spawn_point: require('mineflayer/lib/plugins/spawn_point'),
      time: require('mineflayer/lib/plugins/time')
    }
  , mcData = require('minecraft-data');

var PACKET_DEBUG = false;

if (PACKET_DEBUG) global.hex = hex;
module.exports = {
  //vec3: require('vec3'), // not really needed
  createBot: createBot,
  Block: require('mineflayer').Block,
  Location: require('mineflayer').Location,
  Biome: require('mineflayer').Biome,
  Entity: require('mineflayer').Entity,
  Painting: require('mineflayer').Painting,
  Item: require('mineflayer').Item,
  Recipe: require('mineflayer').Recipe,
  windows: require('mineflayer').windows,
  Chest: require('mineflayer').Chest,
  Furnace: require('mineflayer').Furnace,
  Dispenser: require('mineflayer').Dispenser,
  EnchantmentTable: require('mineflayer').EnchantmentTable,
  blocks: mcData.blocks,
  biomes: mcData.biomes,
  items: mcData.items,
  recipes: mcData.recipes,
  instruments: mcData.instruments,
  materials: mcData.materials,
};

function createBot(options) {
  options.username = options.username || 'Player';
  if (!options.stream) throw new Error('createBot requires options.stream');

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
