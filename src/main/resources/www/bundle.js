(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/* adapted for browser, based on https://github.com/gagle/node-hex
 The MIT License (MIT)
 
 Copyright (c) 2015 Gabriel Llamas
 */

var zero = function (n, max) {
  n = n.toString(16).toUpperCase();
  while (n.length < max) {
    n = '0' + n;
  }
  return n;
};

module.exports = function (buffer) {
  var rows = Math.ceil(buffer.length / 16);
  var last = buffer.length % 16 || 16;
  var offsetLength = buffer.length.toString(16).length;
  if (offsetLength < 6) offsetLength = 6;

  var str = 'Offset';
  while (str.length < offsetLength) {
    str += ' ';
  }

  str = /*'\u001b[36m' +*/ str + '  ';

  var i;
  for (i = 0; i < 16; i++) {
    str += ' ' + zero(i, 2);
  }

  //str += '\u001b[0m\n';
  if (buffer.length) str += '\n';

  var b = 0;
  var lastBytes;
  var lastSpaces;
  var v;

  for (i = 0; i < rows; i++) {
    str += /*'\u001b[36m' +*/ zero(b, offsetLength) + /*'\u001b[0m  '*/ + '  ';
    lastBytes = i === rows - 1 ? last : 16;
    lastSpaces = 16 - lastBytes;

    var j;
    for (j = 0; j < lastBytes; j++) {
      str += ' ' + zero(buffer[b], 2);
      b++;
    }

    for (j = 0; j < lastSpaces; j++) {
      str += '   ';
    }

    b -= lastBytes;
    str += '   ';

    for (j = 0; j < lastBytes; j++) {
      v = buffer[b];
      str += (v > 31 && v < 127) || v > 159 ? String.fromCharCode(v) : '.';
      b++;
    }

    str += '\n';
  }

  //process.stdout.write(str);
  console.log(str);
};

},{}],2:[function(require,module,exports){
var mineflayer = require('./mineflayer-ws');
var tellraw2dom = require('tellraw2dom');

var outputNode = document.getElementById('output');
var inputNode = document.getElementById('input');

var logNode = function(node) {
  outputNode.appendChild(node);
  outputNode.appendChild(document.createElement('br'));
};

var log = function(s) {
  logNode(document.createTextNode(s));
};

// login credential
var username;
var hash = document.location.hash;
if (hash.length < 2) {
  // try anonymous auth
  username = 'mcwebchatuserX';
} else {
  username = hash.substring(1); // remove #
}

var bot = mineflayer.createBot({
  username: username
});
/* parsed chat event is available, but raw message has more information
bot.on('chat', function(username, message) {
  log('<'+username+'> '+message);
});
*/
bot.on('message', function(message) {
  logNode(tellraw2dom(message.json)); // TODO: also decode color codes
});

bot.on('error', function(exception) {
  console.log(exception);
  if (exception.currentTarget)
    log('WebSocket error connecting to ' + exception.currentTarget.url);
  else
    log('WebSocket error: ' + exception);
});

bot.on('close', function() {
  console.log('WebSocket closed');
});

document.body.addEventListener('keyup', function(event) {
  if (event.keyCode !== 13) return;

  var input = inputNode.value;
  console.log('sending input',input);

  bot.chat(input);
  
  inputNode.value = '';
});

},{"./mineflayer-ws":4,"tellraw2dom":48}],3:[function(require,module,exports){
(function (Buffer){
'use strict';

//process.env.NODE_DEBUG = 'mc-proto'; // for node-minecraft-protocol console packet debugging TODO: envify

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
  var ws = websocket_stream(url);
  this.setSocket(ws);
};


}).call(this,require("buffer").Buffer)
},{"assert":76,"buffer":90,"minecraft-protocol/lib/client":5,"minecraft-protocol/lib/protocol":6,"websocket-stream":74}],4:[function(require,module,exports){
(function (global){
'use strict';

var mc = require('./minecraft-protocol-ws')
  , hex = require('./hex-browserify')
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

var PACKET_DEBUG = true;

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
      hex(raw);
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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./hex-browserify":1,"./minecraft-protocol-ws":3,"events":94,"mineflayer/lib/biome":8,"mineflayer/lib/block":9,"mineflayer/lib/chest":11,"mineflayer/lib/dispenser":13,"mineflayer/lib/enchantment_table":14,"mineflayer/lib/entity":15,"mineflayer/lib/enums/biomes":16,"mineflayer/lib/enums/blocks":17,"mineflayer/lib/enums/instruments":18,"mineflayer/lib/enums/items":19,"mineflayer/lib/enums/materials":20,"mineflayer/lib/enums/recipes":21,"mineflayer/lib/furnace":22,"mineflayer/lib/item":23,"mineflayer/lib/location":24,"mineflayer/lib/painting":26,"mineflayer/lib/plugins/bed":27,"mineflayer/lib/plugins/block_actions":28,"mineflayer/lib/plugins/blocks":29,"mineflayer/lib/plugins/chat":30,"mineflayer/lib/plugins/digging":31,"mineflayer/lib/plugins/entities":32,"mineflayer/lib/plugins/experience":33,"mineflayer/lib/plugins/game":34,"mineflayer/lib/plugins/health":35,"mineflayer/lib/plugins/inventory":36,"mineflayer/lib/plugins/kick":37,"mineflayer/lib/plugins/physics":38,"mineflayer/lib/plugins/rain":39,"mineflayer/lib/plugins/settings":40,"mineflayer/lib/plugins/spawn_point":41,"mineflayer/lib/plugins/time":42,"mineflayer/lib/recipe":43,"mineflayer/lib/windows":44,"path":97,"util":113,"websocket-stream":74}],5:[function(require,module,exports){
(function (Buffer){
var net = require('net')
  , EventEmitter = require('events').EventEmitter
  , util = require('util')
  , protocol = require('./protocol')
  , dns = require('dns')
  , createPacketBuffer = protocol.createPacketBuffer
  , compressPacketBuffer = protocol.compressPacketBuffer
  , oldStylePacket = protocol.oldStylePacket
  , newStylePacket = protocol.newStylePacket
  , parsePacket = protocol.parsePacket
  , parsePacketData = protocol.parsePacketData
  , parseNewStylePacket = protocol.parseNewStylePacket
  , packetIds = protocol.packetIds
  , packetNames = protocol.packetNames
  , states = protocol.states
  , debug = protocol.debug
;

module.exports = Client;

function Client(isServer) {
  EventEmitter.call(this);

  this._state = states.HANDSHAKING;
  Object.defineProperty(this, "state", {
    get: function() {
      return this._state;
    },
    set: function(newProperty) {
      var oldProperty = this._state;
      this._state = newProperty;
      this.emit('state', newProperty, oldProperty);
    }
  });
  this.isServer = !!isServer;
  this.socket = null;
  this.encryptionEnabled = false;
  this.cipher = null;
  this.decipher = null;
  this.compressionThreshold = -2;
  this.packetsToParse = {};
  this.on('newListener', function(event, listener) {
    var direction = this.isServer ? 'toServer' : 'toClient';
    if (protocol.packetStates[direction].hasOwnProperty(event) || event === "packet") {
      if (typeof this.packetsToParse[event] === "undefined") this.packetsToParse[event] = 1;
      else this.packetsToParse[event] += 1;
    }
  });
  this.on('removeListener', function(event, listener) {
    var direction = this.isServer ? 'toServer' : 'toClient';
    if (protocol.packetStates[direction].hasOwnProperty(event) || event === "packet") {
      this.packetsToParse[event] -= 1;
    }
  });
}

util.inherits(Client, EventEmitter);

// Transform weird "packet" types into string representing their type. Should be mostly retro-compatible
Client.prototype.on = function(type, func) {
    var direction = this.isServer ? 'toServer' : 'toClient';
    if (Array.isArray(type)) {
        arguments[0] = protocol.packetNames[type[0]][direction][type[1]];
    } else if (typeof type === "number") {
        arguments[0] = protocol.packetNames[this.state][direction][type];
    }
    EventEmitter.prototype.on.apply(this, arguments);
};

Client.prototype.onRaw = function(type, func) {
    var arg = "raw.";
    if (Array.isArray(type)) {
        arg += protocol.packetNames[type[0]][direction][type[1]];
    } else if (typeof type === "number") {
        arg += protocol.packetNames[this.state][direction][type];
    } else {
        arg += type;
    }
    arguments[0] = arg;
    EventEmitter.prototype.on.apply(this, arguments);
};

Client.prototype.setSocket = function(socket) {
  var self = this;
  function afterParse(err, parsed) {
    if (err || (parsed && parsed.error)) {
      self.emit('error', err || parsed.error);
      self.end("ProtocolError");
      return;
    }
    if (! parsed) { return; }
    var packet = parsed.results;
    //incomingBuffer = incomingBuffer.slice(parsed.size); TODO: Already removed in prepare

    var packetName = protocol.packetNames[self.state][self.isServer ? 'toServer' : 'toClient'][packet.id];
    var packetState = self.state;
    self.emit(packetName, packet);
    self.emit('packet', packet);
    self.emit('raw.' + packetName, parsed.buffer, packetState);
    self.emit('raw', parsed.buffer, packetState);
    prepareParse();
  }

  function prepareParse() {
    var packetLengthField = protocol.types["varint"][0](incomingBuffer, 0);
    if (packetLengthField && packetLengthField.size + packetLengthField.value <= incomingBuffer.length)
    {
      var buf = incomingBuffer.slice(packetLengthField.size, packetLengthField.size + packetLengthField.value);
      // TODO : Slice as early as possible to avoid processing same data twice.
      incomingBuffer = incomingBuffer.slice(packetLengthField.size + packetLengthField.value);
      if (self.compressionThreshold == -2)
      {
        afterParse(null, parsePacketData(buf, self.state, self.isServer, self.packetsToParse));
      } else {
        parseNewStylePacket(buf, self.state, self.isServer, self.packetsToParse, afterParse);
      }
    }
  }

  self.socket = socket;
  if (self.socket.setNoDelay)
    self.socket.setNoDelay(true);
  var incomingBuffer = new Buffer(0);
  self.socket.on('data', function(data) {
    if (self.encryptionEnabled) data = new Buffer(self.decipher.update(data), 'binary');
    incomingBuffer = Buffer.concat([incomingBuffer, data]);
    prepareParse()
  });

  self.socket.on('connect', function() {
    self.emit('connect');
  });

  self.socket.on('error', onError);
  self.socket.on('close', endSocket);
  self.socket.on('end', endSocket);
  self.socket.on('timeout', endSocket);

  function onError(err) {
    self.emit('error', err);
    endSocket();
  }

  var ended = false;
  function endSocket() {
    if (ended) return;
    ended = true;
    self.socket.removeListener('close', endSocket);
    self.socket.removeListener('end', endSocket);
    self.socket.removeListener('timeout', endSocket);
    self.emit('end', self._endReason);
  }
};

Client.prototype.connect = function(port, host) {
  var self = this;
  if (port == 25565 && net.isIP(host) === 0) {
    dns.resolveSrv("_minecraft._tcp." + host, function(err, addresses) {
    if (addresses && addresses.length > 0) {
      self.setSocket(net.connect(addresses[0].port, addresses[0].name));
    } else {
      self.setSocket(net.connect(port, host));
    }
    });
  } else {
    self.setSocket(net.connect(port, host));
  }
};

Client.prototype.end = function(reason) {
  this._endReason = reason;
  this.socket.end();
};

Client.prototype.write = function(packetId, params) {
  if (Array.isArray(packetId)) {
     if (packetId[0] !== this.state)
      return false;
    packetId = packetId[1];
  }
  if (typeof packetId === "string")
    packetId = packetIds[this.state][this.isServer ? "toClient" : "toServer"][packetId];
  var that = this;

  var finishWriting = function(err, buffer) {
    if (err)
    {
      console.log(err);
      throw err; // TODO : Handle errors gracefully, if possible
    }
    var packetName = packetNames[that.state][that.isServer ? "toClient" : "toServer"][packetId];
    debug("writing packetId " + that.state + "." + packetName + " (0x" + packetId.toString(16) + ")");
    debug(params);
    var out = that.encryptionEnabled ? new Buffer(that.cipher.update(buffer), 'binary') : buffer;
    that.socket.write(out);
    return true;
  }

  var buffer = createPacketBuffer(packetId, this.state, params, this.isServer);
  if (this.compressionThreshold >= 0 && buffer.length >= this.compressionThreshold) {
    debug("Compressing packet");
    compressPacketBuffer(buffer, finishWriting);
  } else if (this.compressionThreshold >= -1) {
    debug("New-styling packet");
    newStylePacket(buffer, finishWriting);
  } else {
    debug("Old-styling packet");
    oldStylePacket(buffer, finishWriting);
  }
};

// TODO : Perhaps this should only accept buffers without length, so we can
// handle compression ourself ? Needs to ask peopl who actually use this feature
// like @deathcap
Client.prototype.writeRaw = function(buffer) {
    var self = this;

    var finishWriting = function(error, buffer) {
      if (error)
        throw error; // TODO : How do we handle this error ?
        var out = self.encryptionEnabled ? new Buffer(self.cipher.update(buffer), 'binary') : buffer;
        self.socket.write(out);
    };
    if (this.compressionThreshold >= 0 && buffer.length >= this.compressionThreshold) {
        compressPacketBuffer(buffer, finishWriting);
    } else if (this.compressionThreshold >= -1) {
        newStylePacket(buffer, finishWriting);
    } else {
        oldStylePacket(buffer, finishWriting);
    }
};

}).call(this,require("buffer").Buffer)
},{"./protocol":6,"buffer":90,"dns":75,"events":94,"net":75,"util":113}],6:[function(require,module,exports){
(function (process,Buffer){
var assert = require('assert');
var util = require('util');
var zlib = require('zlib');
var nbt = require('prismarine-nbt');

var STRING_MAX_LENGTH = 240;
var SRV_STRING_MAX_LENGTH = 32767;

// This is really just for the client.
var states = {
  "HANDSHAKING": "handshaking",
  "STATUS": "status",
  "LOGIN": "login",
  "PLAY": "play"
}

var packets = {
  handshaking: {
    toClient: {},
    toServer: {
      set_protocol:          {id: 0x00, fields: [
        { name: "protocolVersion", type: "varint" },
        { name: "serverHost", type: "string" },
        { name: "serverPort", type: "ushort" },
        { name: "nextState", type: "varint" }
      ]}
    },
  },

// TODO : protocollib names aren't the best around here
  status: {
    toClient: {
      server_info:    {id: 0x00, fields: [
        { name: "response", type: "ustring" }
      ]},
      ping:        {id: 0x01, fields: [
        { name: "time", type: "long" }
      ]}
    },
    toServer: {
      ping_start:     {id: 0x00, fields: []},
      ping:        {id: 0x01, fields: [
        { name: "time", type: "long" }
      ]}
    }
  },

  login: {
    toClient: {
      disconnect:   {id: 0x00, fields: [
        { name: "reason", type: "string" }
      ]},
      encryption_begin: {id: 0x01, fields: [
        { name: "serverId", type: "string" },
        { name: "publicKeyLength", type: "count", typeArgs: { type: "varint", countFor: "publicKey" } },
        { name: "publicKey", type: "buffer", typeArgs: { count: "publicKeyLength" } },
        { name: "verifyTokenLength", type: "count", typeArgs: { type: "varint", countFor: "verifyToken" } },
        { name: "verifyToken", type: "buffer", typeArgs: { count: "verifyTokenLength" } },
      ]},
      success:      {id: 0x02, fields: [
        { name: "uuid", type: "string" },
        { name: "username", type: "string" }
      ]},
      compress: { id: 0x03, fields: [
        { name: "threshold", type: "varint"}
      ]}
    },
    toServer: {
      login_start:        {id: 0x00, fields: [
        { name: "username", type: "string" }
      ]},
      encryption_begin: {id: 0x01, fields: [
        { name: "sharedSecretLength", type: "count", typeArgs: { type: "varint", countFor: "sharedSecret" } },
        { name: "sharedSecret", type: "buffer", typeArgs: { count: "sharedSecretLength" } },
        { name: "verifyTokenLength", type: "count", typeArgs: { type: "varint", countFor: "verifyToken" } },
        { name: "verifyToken", type: "buffer", typeArgs: { count: "verifyTokenLength" } },
      ]}
    }
  },

  play: {
    toClient: {
      keep_alive:         {id: 0x00, fields: [
      { name: "keepAliveId", type: "varint" },
      ]},
      login:          {id: 0x01, fields: [
        { name: "entityId", type: "int" },
        { name: "gameMode", type: "ubyte" },
        { name: "dimension", type: "byte" },
        { name: "difficulty", type: "ubyte" },
        { name: "maxPlayers", type: "ubyte" },
        { name: "levelType", type: "string" },
        { name: "reducedDebugInfo", type: "bool"}
      ]},
      chat:               {id: 0x02, fields: [
        { name: "message", type: "ustring" },
        { name: "position", type: "byte" }
      ]},
      update_time:        {id: 0x03, fields: [
        { name: "age", type: "long" },
        { name: "time", type: "long" },
      ]},
      entity_equipment:   {id: 0x04, fields: [
        { name: "entityId", type: "varint" },
        { name: "slot", type: "short" },
        { name: "item", type: "slot" }
      ]},
      spawn_position:     {id: 0x05, fields: [
        { name: "location", type: "position" } /* TODO: Implement position */
      ]},
      update_health:      {id: 0x06, fields: [
        { name: "health", type: "float" },
        { name: "food", type: "varint" },
        { name: "foodSaturation", type: "float" }
      ]},
      respawn:            {id: 0x07, fields: [
        { name: "dimension", type: "int" },
        { name: "difficulty", type: "ubyte" },
        { name: "gamemode", type: "ubyte" },
        { name: "levelType", type: "string" }
      ]},
      position:    {id: 0x08, fields: [
        { name: "x", type: "double" },
        { name: "y", type: "double" },
        { name: "z", type: "double" },
        { name: "yaw", type: "float" },
        { name: "pitch", type: "float" },
        { name: "flags", type: "byte" /* <Dinnerbone> It's a bitfield, X/Y/Z/Y_ROT/X_ROT. If X is set, the x value is relative and not absolute. */}
      ]},
      held_item_slot:   {id: 0x09, fields: [
        { name: "slot", type: "byte" }
      ]},
      bed:            {id: 0x0a, fields: [
        { name: "entityId", type: "int" },
        { name: "location", type: "position" }
      ]},
      animation:          {id: 0x0b, fields: [
        { name: "entityId", type: "varint" },
        { name: "animation", type: "byte" }
      ]},
      named_entity_spawn:       {id: 0x0c, fields: [
        { name: "entityId", type: "varint" },
        { name: "playerUUID", type: "UUID"},
        { name: "x", type: "int" },
        { name: "y", type: "int" },
        { name: "z", type: "int" },
        { name: "yaw", type: "byte" },
        { name: "pitch", type: "byte" },
        { name: "currentItem", type: "short" },
        { name: "metadata", type: "entityMetadata" }
      ]},
      collect:       {id: 0x0d, fields: [
        { name: "collectedEntityId", type: "varint" },
        { name: "collectorEntityId", type: "varint" }
      ]},
      spawn_entity:       {id: 0x0e, fields: [
        { name: "entityId", type: "varint" },
        { name: "type", type: "byte" },
        { name: "x", type: "int" },
        { name: "y", type: "int" },
        { name: "z", type: "int" },
        { name: "pitch", type: "byte" },
        { name: "yaw", type: "byte" },
        { name: "objectData", type: "container", typeArgs: { fields: [
          { name: "intField", type: "int" },
          { name: "velocityX", type: "short", condition: function(field_values) {
            return field_values['this']['intField'] != 0;
          }},
          { name: "velocityY", type: "short", condition: function(field_values) {
            return field_values['this']['intField'] != 0;
          }},
          { name: "velocityZ", type: "short", condition: function(field_values) {
            return field_values['this']['intField'] != 0;
          }}
        ]}}
      ]},
      spawn_entity_living:          {id: 0x0f, fields: [
        { name: "entityId", type: "varint" },
        { name: "type", type: "ubyte" },
        { name: "x", type: "int" },
        { name: "y", type: "int" },
        { name: "z", type: "int" },
        { name: "yaw", type: "byte" },
        { name: "pitch", type: "byte" },
        { name: "headPitch", type: "byte" },
        { name: "velocityX", type: "short" },
        { name: "velocityY", type: "short" },
        { name: "velocityZ", type: "short" },
        { name: "metadata", type: "entityMetadata" },
      ]},
      spawn_entity_painting:     {id: 0x10, fields: [
        { name: "entityId", type: "varint" },
        { name: "title", type: "string" },
        { name: "location", type: "position" },
        { name: "direction", type: "ubyte" }
      ]},
      spawn_entity_experience_orb: {id: 0x11, fields: [
        { name: "entityId", type: "varint" },
        { name: "x", type: "int" },
        { name: "y", type: "int" },
        { name: "z", type: "int" },
        { name: "count", type: "short" }
      ]},
      entity_velocity:    {id: 0x12, fields: [
        { name: "entityId", type: "varint" },
        { name: "velocityX", type: "short" },
        { name: "velocityY", type: "short" },
        { name: "velocityZ", type: "short" }
      ]},
      entity_destroy:   {id: 0x13, fields: [
        { name: "count", type: "count", typeArgs: { type: "varint", countFor: "entityIds" } },
        { name: "entityIds", type: "array", typeArgs: { type: "varint", count: "count" } }
      ]},
      entity:             {id: 0x14, fields: [
        { name: "entityId", type: "varint" }
      ]},
      rel_entity_move: {id: 0x15, fields: [
        { name: "entityId", type: "varint" },
        { name: "dX", type: "byte" },
        { name: "dY", type: "byte" },
        { name: "dZ", type: "byte" },
        { name: "onGround", type: "bool"}
      ]},
      entity_look:        {id: 0x16, fields: [
        { name: "entityId", type: "varint" },
        { name: "yaw", type: "byte" },
        { name: "pitch", type: "byte" },
        { name: "onGround", type: "bool"}
      ]},
      entity_move_look: {id: 0x17, fields: [
        { name: "entityId", type: "varint" },
        { name: "dX", type: "byte" },
        { name: "dY", type: "byte" },
        { name: "dZ", type: "byte" },
        { name: "yaw", type: "byte" },
        { name: "pitch", type: "byte" },
        { name: "onGround", type: "bool"}
      ]},
      entity_teleport:    {id: 0x18, fields: [
        { name: "entityId", type: "varint" },
        { name: "x", type: "int" },
        { name: "y", type: "int" },
        { name: "z", type: "int" },
        { name: "yaw", type: "byte" },
        { name: "pitch", type: "byte" },
        { name: "onGround", type: "bool"}
      ]},
      entity_head_rotation:   {id: 0x19, fields: [
        { name: "entityId", type: "varint" },
        { name: "headYaw", type: "byte" },
      ]},
      entity_status:      {id: 0x1a, fields: [
        { name: "entityId", type: "int" },
        { name: "entityStatus", type: "byte" }
      ]},
      attach_entity:      {id: 0x1b, fields: [
        { name: "entityId", type: "int" },
        { name: "vehicleId", type: "int" },
        { name: "leash", type: "bool" }
      ]},
      entity_metadata:    {id: 0x1c, fields: [
        { name: "entityId", type: "varint" },
        { name: "metadata", type: "entityMetadata" }
      ]},
      entity_effect:      {id: 0x1d, fields: [
        { name: "entityId", type: "varint" },
        { name: "effectId", type: "byte" },
        { name: "amplifier", type: "byte" },
        { name: "duration", type: "varint" },
        { name: "hideParticles", type: "bool" }
      ]},
      remove_entity_effect: {id: 0x1e, fields: [
        { name: "entityId", type: "varint" },
        { name: "effectId", type: "byte" }
      ]},
      experience:     {id: 0x1f, fields: [
        { name: "experienceBar", type: "float" },
        { name: "level", type: "varint" },
        { name: "totalExperience", type: "varint" }
      ]},
      update_attributes:  {id: 0x20, fields: [
        { name: "entityId", type: "varint" },
        { name: "count", type: "count", typeArgs: { type: "int", countFor: "properties" } },
        { name: "properties", type: "array", typeArgs: { count: "count",
          type: "container", typeArgs: { fields: [
            { name: "key", type: "string" },
            { name: "value", type: "double" },
            { name: "listLength", type: "count", typeArgs: { type: "varint", countFor: "this.modifiers" } },
            { name: "modifiers", type: "array", typeArgs: { count: "this.listLength",
              type: "container", typeArgs: { fields: [
                { name: "UUID", type: "UUID" },
                { name: "amount", type: "double" },
                { name: "operation", type: "byte" }
              ]}}}
          ]}
        }}
      ]},
      map_chunk:         {id: 0x21, fields: [
        { name: "x", type: "int" },
        { name: "z", type: "int" },
        { name: "groundUp", type: "bool" },
        { name: "bitMap", type: "ushort" },
        { name: "chunkDataLength", type: "count", typeArgs: { type: "varint", countFor: "chunkData" } },
        { name: "chunkData", type: "buffer", typeArgs: { count: "chunkDataLength" } },
      ]},
      multi_block_change: {id: 0x22, fields: [
        { name: "chunkX", type: "int" },
        { name: "chunkZ", type: "int" },
        { name: "recordCount", type: "count", typeArgs: { type: "varint", countFor: "records" } },
        { name: "records", type: "array", typeArgs: { count: "recordCount", type: "container", typeArgs: { fields: [
            { name: "horizontalPos", type: "ubyte" },
            { name: "y", type: "ubyte" },
            { name: "blockId", type: "varint" }
        ]}}}
      ]},
      block_change:       {id: 0x23, fields: [
        { name: "location", type: "position" },
        { name: "type", type: "varint" },
      ]},
      block_action:       {id: 0x24, fields: [
        { name: "location", type: "position" },
        { name: "byte1", type: "ubyte" },
        { name: "byte2", type: "ubyte" },
        { name: "blockId", type: "varint" }
      ]},
      block_break_animation:   {id: 0x25, fields: [
        { name: "entityId", type: "varint" },
        { name: "location", type: "position" },
        { name: "destroyStage", type: "byte" }
      ]},
      map_chunk_bulk: {id: 0x26, fields: [
        { name: "skyLightSent", type: "bool" },
        { name: "chunkColumnCount", type: "count", typeArgs: { type: "varint", countFor: "meta" } },
        { name: "meta", type: "array", typeArgs: { count: "chunkColumnCount", type: "container", typeArgs: { fields: [
            { name: "x", type: "int" },
            { name: "z", type: "int" },
            { name: "bitMap", type: "ushort" },
        ]}}},
        { name: "data", type: "restBuffer" }
      ]},
      explosion: {id: 0x27, fields: [
        { name: "x", type: "float" },
        { name: "y", type: "float" },
        { name: "z", type: "float" },
        { name: "radius", type: "float" },
        { name: "count", type: "count", typeArgs: { type: "int", countFor: "affectedBlockOffsets" } },
        { name: "affectedBlockOffsets", type: "array", typeArgs: { count: "count", type: "container", typeArgs: {
          fields: [
            { name: "x", type: "byte" },
            { name: "y", type: "byte" },
            { name: "z", type: "byte" }
          ]
        }}},
        { name: "playerMotionX", type: "float" },
        { name: "playerMotionY", type: "float" },
        { name: "playerMotionZ", type: "float" }
      ]},
      world_event:             {id: 0x28, fields: [ // TODO : kinda wtf naming there
        { name: "effectId", type: "int" },
        { name: "location", type: "position" },
        { name: "data", type: "int" },
        { name: "global", type: "bool" }
      ]},
      named_sound_effect:       {id: 0x29, fields: [
        { name: "soundName", type: "string" },
        { name: "x", type: "int" },
        { name: "y", type: "int" },
        { name: "z", type: "int" },
        { name: "volume", type: "float" },
        { name: "pitch", type: "ubyte" }
      ]},
      world_particles:           {id: 0x2a, fields: [
        { name: "particleId", type: "int" },
        { name: "longDistance", type: "bool"},
        { name: "x", type: "float" },
        { name: "y", type: "float" },
        { name: "z", type: "float" },
        { name: "offsetX", type: "float" },
        { name: "offsetY", type: "float" },
        { name: "offsetZ", type: "float" },
        { name: "particleData", type: "float" },
        { name: "particles", type: "count", typeArgs: { countFor: "data", type: "int" } },
        { name: "data", type: "array", typeArgs: { count: "particles", type: "varint" } }
      ]},
      game_state_change:  {id: 0x2b, fields: [
        { name: "reason", type: "ubyte" },
        { name: "gameMode", type: "float" }
      ]},
      spawn_entity_weather:{id: 0x2c, fields: [
        { name: "entityId", type: "varint" },
        { name: "type", type: "byte" },
        { name: "x", type: "int" },
        { name: "y", type: "int" },
        { name: "z", type: "int" }
      ]},
      open_window:        {id: 0x2d, fields: [
        { name: "windowId", type: "ubyte" },
        { name: "inventoryType", type: "string" },
        { name: "windowTitle", type: "string" },
        { name: "slotCount", type: "ubyte" },
        { name: "entityId", type: "int", condition: function(field_values) {
          return field_values['inventoryType'] == 11;
        } }
      ]},
      close_window:       {id: 0x2e, fields: [
        { name: "windowId", type: "ubyte" }
      ]},
      set_slot:           {id: 0x2f, fields: [
        { name: "windowId", type: "byte" },
        { name: "slot", type: "short" },
        { name: "item", type: "slot" }
      ]},
      window_items:       {id: 0x30, fields: [
        { name: "windowId", type: "ubyte" },
        { name: "count", type: "count", typeArgs: { type: "short", countFor: "items" } },
        { name: "items", type: "array", typeArgs: { type: "slot", count: "count" } }
      ]},
      craft_progress_bar:    {id: 0x31, fields: [ /* TODO: Bad name for this packet imo */
        { name: "windowId", type: "ubyte" },
        { name: "property", type: "short" },
        { name: "value", type: "short" }
      ]},
      transaction:{id: 0x32, fields: [
        { name: "windowId", type: "byte" },
        { name: "action", type: "short" },
        { name: "accepted", type: "bool" }
      ]},
      update_sign:        {id: 0x33, fields: [
        { name: "location", type: "position" },
        { name: "text1", type: "string" },
        { name: "text2", type: "string" },
        { name: "text3", type: "string" },
        { name: "text4", type: "string" }
      ]},
      map: {id: 0x34, fields: [
        { name: "itemDamage", type: "varint" },
        { name: "scale", type: "byte" },
        { name: "iconLength", type: "count", typeArgs: { type: "varint", countFor: "icons" } },
        { name: "icons", type: "array", typeArgs: { count: "iconLength", type: "container", typeArgs: { fields: [
            { name: "directionAndType", type: "byte" }, // Yeah... that will do
            { name: "x", type: "byte" },
            { name: "y", type: "byte" }
        ]}}},
        { name: "columns", type: "byte" },
        { name: "rows", type: "byte", condition: function(field_values) {
            return field_values["columns"] !== 0;
        }},
        { name: "x", type: "byte", condition: function(field_values) {
            return field_values["columns"] !== 0;
        }},
        { name: "y", type: "byte", condition: function(field_values) {
            return field_values["columns"] !== 0;
        }},
        { name: "dataLength", type: "count", typeArgs: { countFor: "data", type: "varint" }, condition: function(field_values) {
            return field_values["columns"] !== 0;
        }},
        { name: "data", type: "buffer", typeArgs: { count: "dataLength" }, condition: function(field_values) {
            return field_values["columns"] !== 0;
        }},
      ]},
      tile_entity_data:{id: 0x35, fields: [
        { name: "location", type: "position" },
        { name: "action", type: "ubyte" },
        { name: "nbtData", type: "restBuffer" }
      ]},
      open_sign_entity:   {id: 0x36, fields: [
        { name: "location", type: "position" },
      ]},
      statistics:         {id: 0x37, fields: [
        { name: "count", type: "count", typeArgs: { type: "varint", countFor: "entries" } },
        { name: "entries", type: "array", typeArgs: { count: "count",
          type: "container", typeArgs: { fields: [
            { name: "name", type: "string" },
            { name: "value", type: "varint" }
          ]}
        }}
      ]},
      player_info: {id: 0x38, fields: [
        { name: "action", type: "varint" },
        { name: "length", type: "count", typeArgs: { type: "varint", countFor: "data" }},
        { name: "data", type: "array", typeArgs: { count: "length", type: "container", typeArgs: { fields: [
            { name: "UUID", type: "UUID" },
            { name: "name", type: "string", condition: function(field_values) {
                return field_values["action"] === 0;
            }},
            { name: "propertiesLength", type: "count", condition: function(field_values) {
                return field_values["action"] === 0;
            }, typeArgs: { countFor: "this.properties", type: "varint" }},
            { name: "properties", type: "array", condition: function(field_values) {
                return field_values["action"] === 0;
            }, typeArgs: { count: "this.propertiesLength", type: "container", typeArgs: { fields: [
                { name: "name", type: "string" },
                { name: "value", type: "ustring" },
                { name: "isSigned", type: "bool" },
                { name: "signature", type: "ustring", condition: function(field_values) {
                    return field_values["this"]["isSigned"];
            }}
        ]}}},
        { name: "gamemode", type: "varint", condition: function(field_values) {
            return field_values["action"] === 0 || field_values["action"] === 1;
        }},
        { name: "ping", type: "varint", condition: function(field_values) {
            return field_values["action"] === 0 || field_values["action"] === 2;
        }},
        { name: "hasDisplayName", type: "bool", condition: function(field_values) {
            return field_values["action"] === 0 || field_values["action"] === 3;
        }},
        { name: "displayName", type: "string", condition: function(field_values) {
            return field_values["hasDisplayName"]; // Returns false if there is no value "hasDisplayName"
        }}
        ]}}}
      ]},
      abilities:   {id: 0x39, fields: [
        { name: "flags", type: "byte" },
        { name: "flyingSpeed", type: "float" },
        { name: "walkingSpeed", type: "float" }
      ]},
      tab_complete:       {id: 0x3a, fields: [
        { name: "count", type: "count", typeArgs: { type: "varint", countFor: "matches" } },
        { name: "matches", type: "array", typeArgs: { type: "string", count: "count" } }
      ]},
      scoreboard_objective: {id: 0x3b, fields: [
        { name: "name", type: "string" },
        { name: "action", type: "byte" },
        { name: "displayText", type: "string", condition: function(field_values) {
          return field_values["action"] == 0 || field_values["action"] == 2;
        }},
        { name: "type", type: "string", condition: function(field_values) {
          return field_values["action"] == 0 || field_values["action"] == 2;
        }}
      ]},
      scoreboard_score:       {id: 0x3c, fields: [ /* TODO: itemName and scoreName may need to be switched */
        { name: "itemName", type: "string" },
        { name: "action", type: "byte" },
        { name: "scoreName", type: "string" },
        { name: "value", type: "varint", condition: function(field_values) {
          return field_values['action'] != 1;
        } }
      ]},
      scoreboard_display_objective: {id: 0x3d, fields: [
        { name: "position", type: "byte" },
        { name: "name", type: "string" }
      ]},
      scoreboard_team:              {id: 0x3e, fields: [
        { name: "team", type: "string" },
        { name: "mode", type: "byte" },
        { name: "name", type: "string", condition: function(field_values) {
            return field_values['mode'] == 0 || field_values['mode'] == 2;
        } },
        { name: "prefix", type: "string", condition: function(field_values) {
          return field_values['mode'] == 0 || field_values['mode'] == 2;
        } },
        { name: "suffix", type: "string", condition: function(field_values) {
          return field_values['mode'] == 0 || field_values['mode'] == 2;
        } },
        { name: "friendlyFire", type: "byte", condition: function(field_values) {
          return field_values['mode'] == 0 || field_values['mode'] == 2;
        } },
        { name: "nameTagVisibility", type: "string", condition: function(field_values) {
          return field_values['mode'] == 0 || field_values['mode'] == 2;
        } },
        { name: "color", type: "byte", condition: function(field_values) {
          return field_values['mode'] == 0 || field_values['mode'] == 2;
        } },
        { name: "playerCount", type: "count", condition: function(field_values) {
          return field_values['mode'] == 0 || field_values['mode'] == 3 || field_values['mode'] == 4;
        }, typeArgs: { type: "short", countFor: "players" } },
        { name: "players", type: "array", condition: function(field_values) {
          return field_values['mode'] == 0 || field_values['mode'] == 3 || field_values['mode'] == 4;
        }, typeArgs: { type: "string", count: "playerCount" } }
      ]},
      custom_payload:     {id: 0x3f, fields: [
        { name: "channel", type: "string" },
        { name: "data", type: "restBuffer" }
      ]},
      kick_disconnect:         {id: 0x40, fields: [
        { name: "reason", type: "string" }
      ]},
      difficulty: { id: 0x41, fields: [
        { name: "difficulty", type: "ubyte" }
      ]},
      combat_event: { id: 0x42, fields: [
        { name: "event", type: "varint"},
        { name: "duration", type: "varint", condition: function(field_values) {
            return field_values['event'] == 1;
        } },
        { name: "playerId", type: "varint", condition: function(field_values) {
            return field_values['event'] == 2;
        } },
        { name: "entityId", type: "int", condition: function(field_values) {
            return field_values['event'] == 1 || field_values['event'] == 2;
        } },
        { name: "message", type: "string", condition: function(field_values) {
            return field_values['event'] == 2;
        } }
      ]},
      camera: { id: 0x43, fields: [
        { name: "cameraId", type: "varint" }
      ]},
      world_border: { id: 0x44, fields: [
        { name: "action", type: "varint"},
        { name: "radius", type: "double", condition: function(field_values) {
            return field_values['action'] == 0;
        } },
        { name: "x", type: "double", condition: function(field_values) {
            return field_values['action'] == 2 || field_values['action'] == 3;
        } },
        { name: "z", type: "double", condition: function(field_values) {
            return field_values['action'] == 2 || field_values['action'] == 3;
        } },
        { name: "old_radius", type: "double", condition: function(field_values) {
            return field_values['action'] == 1 || field_values['action'] == 3;
        } },
        { name: "new_radius", type: "double", condition: function(field_values) {
            return field_values['action'] == 1 || field_values['action'] == 3;
        } },
        { name: "speed", type: "varint", condition: function(field_values) {
            return field_values['action'] == 1 || field_values['action'] == 3;
        } },
        { name: "portalBoundary", type: "varint", condition: function(field_values) {
            return field_values['action'] == 3;
        } },
        { name: "warning_time", type: "varint", condition: function(field_values) {
            return field_values['action'] == 4 || field_values['action'] == 3;
        } },
        { name: "warning_blocks", type: "varint", condition: function(field_values) {
            return field_values['action'] == 5 || field_values['action'] == 3;
        } }
      ]},
      title: { id: 0x45, fields: [
        { name: "action", type: "varint"},
        { name: "text", type: "string", condition: function(field_values) {
            return field_values['action'] == 0 || field_values['action'] == 1;
        } },
        { name: "fadeIn", type: "int", condition: function(field_values) {
            return field_values['action'] == 2;
        } },
        { name: "stay", type: "int", condition: function(field_values) {
            return field_values['action'] == 2;
        } },
        { name: "fadeOut", type: "int", condition: function(field_values) {
            return field_values['action'] == 2;
        } }
      ]},
      set_compression: { id: 0x46, fields: [
        { name: "threshold", type: "varint"}
      ]},
      playerlist_header: { id: 0x47, fields: [
        { name: "header", type: "string" },
        { name: "footer", type: "string" }
      ]},
      resource_pack_send: { id: 0x48, fields: [
        { name: "url", type: "string" },
        { name: "hash", type: "string" }
      ]},
      update_entity_nbt: { id: 0x49, fields: [
        { name: "entityId", type: "varint" },
        { name: "tag", type: "restBuffer"}
      ]}
    },
    toServer: {
      keep_alive:         {id: 0x00, fields: [
        { name: "keepAliveId", type: "varint" }
      ]},
      chat:       {id: 0x01, fields: [
        { name: "message", type: "string" }
      ]},
      use_entity:         {id: 0x02, fields: [
        { name: "target", type: "varint" },
        { name: "mouse", type: "varint" },
        { name: "x", type: "float", condition: function(field_values) {
          return field_values["mouse"] == 2;
        }},
        { name: "y", type: "float", condition: function(field_values) {
          return field_values["mouse"] == 2;
        }},
        { name: "z", type: "float", condition: function(field_values) {
          return field_values["mouse"] == 2;
        }},
      ]},
      flying:             {id: 0x03, fields: [
        { name: "onGround", type: "bool" }
      ]},
      position:    {id: 0x04, fields: [
        { name: "x", type: "double" },
        { name: "y", type: "double" },
        { name: "z", type: "double" },
        { name: "onGround", type: "bool" }
      ]},
      look:        {id: 0x05, fields: [
        { name: "yaw", type: "float" },
        { name: "pitch", type: "float" },
        { name: "onGround", type: "bool" }
      ]},
      position_look: {id: 0x06, fields: [
        { name: "x", type: "double" },
        { name: "y", type: "double" },
        { name: "z", type: "double" },
        { name: "yaw", type: "float" },
        { name: "pitch", type: "float" },
        { name: "onGround", type: "bool" }
      ]},
      block_dig:     {id: 0x07, fields: [
        { name: "status", type: "byte" },
        { name: "location", type: "position"},
        { name: "face", type: "byte" }
      ]},
      block_place: {id: 0x08, fields: [
        { name: "location", type: "position" },
        { name: "direction", type: "byte" },
        { name: "heldItem", type: "slot" },
        { name: "cursorX", type: "byte" },
        { name: "cursorY", type: "byte" },
        { name: "cursorZ", type: "byte" }
      ]},
      held_item_slot:   {id: 0x09, fields: [
        { name: "slotId", type: "short" }
      ]},
      arm_animation:          {id: 0x0a, fields: []},
      entity_action:      {id: 0x0b, fields: [
        { name: "entityId", type: "varint" },
        { name: "actionId", type: "varint" },
        { name: "jumpBoost", type: "varint" }
      ]},
      steer_vehicle:      {id: 0x0c, fields: [
        { name: "sideways", type: "float" },
        { name: "forward", type: "float" },
        { name: "jump", type: "ubyte" }
      ]},
      close_window:       {id: 0x0d, fields: [
        { name: "windowId", type: "byte" }
      ]},
      window_click:       {id: 0x0e, fields: [
        { name: "windowId", type: "byte" },
        { name: "slot", type: "short" },
        { name: "mouseButton", type: "byte" },
        { name: "action", type: "short" },
        { name: "mode", type: "byte" },
        { name: "item", type: "slot" }
      ]},
      transaction: {id: 0x0f, fields: [
        { name: "windowId", type: "byte" },
        { name: "action", type: "short" },
        { name: "accepted", type: "bool" }
      ]},
      set_creative_slot: {id: 0x10, fields: [
        { name: "slot", type: "short" },
        { name: "item", type: "slot" }
      ]},
      enchant_item:       {id: 0x11, fields: [
        { name: "windowId", type: "byte" },
        { name: "enchantment", type: "byte" }
      ]},
      update_sign:        {id: 0x12, fields: [
        { name: "location", type: "position" },
        { name: "text1", type: "string" },
        { name: "text2", type: "string" },
        { name: "text3", type: "string" },
        { name: "text4", type: "string" }
      ]},
      abilities:   {id: 0x13, fields: [
        { name: "flags", type: "byte" },
        { name: "flyingSpeed", type: "float" },
        { name: "walkingSpeed", type: "float" }
      ]},
      tab_complete:       {id: 0x14, fields: [
        { name: "text", type: "string" },
        { name: "hasPosition", type: "bool" },
        { name: "block", type: "position", condition: function(field_values) {
            return field_values['hasPosition'];
        } }
      ]},
      settings:    {id: 0x15, fields: [
        { name: "locale", type: "string" },
        { name: "viewDistance", type: "byte" },
        { name: "chatFlags", type: "byte" },
        { name: "chatColors", type: "bool" },
        { name: "skinParts", type: "ubyte" }
      ]},
      client_command:      {id: 0x16, fields: [
        { name: "payload", type: "varint" }
      ]},
      custom_payload:     {id: 0x17, fields: [
        { name: "channel", type: "string" }, /* TODO: wiki.vg sats no dataLength is needed? */
        { name: "data", type: "restBuffer"}
      ]},
      spectate: { id: 0x18, fields: [
        { name: "target", type: "UUID"}
      ]},
      resource_pack_receive: { id: 0x19, fields: [
        { name: "hash", type: "string" },
        { name: "result", type: "varint" }
      ]}
    }
  }
};

var packetFields = {};
var packetNames = {};
var packetIds = {};
var packetStates = {toClient: {}, toServer: {}};
(function() {
  for (var stateName in states) {
    var state = states[stateName];

    packetFields[state] = {toClient: [], toServer: []};
    packetNames[state] = {toClient: [], toServer: []};
    packetIds[state] = {toClient: [], toServer: []};

    ['toClient', 'toServer'].forEach(function(direction) {
      for (var name in packets[state][direction]) {
        var info = packets[state][direction][name];
        var id = info.id;
        var fields = info.fields;

        assert(id !== undefined, 'missing id for packet '+name);
        assert(fields !== undefined, 'missing fields for packet '+name);
        assert(!packetNames[state][direction].hasOwnProperty(id), 'duplicate packet id '+id+' for '+name);
        assert(!packetIds[state][direction].hasOwnProperty(name), 'duplicate packet name '+name+' for '+id);
        assert(!packetFields[state][direction].hasOwnProperty(id), 'duplicate packet id '+id+' for '+name);
        assert(!packetStates[direction].hasOwnProperty(name), 'duplicate packet name '+name+' for '+id+', must be unique across all states');

        packetNames[state][direction][id] = name;
        packetIds[state][direction][name] = id;
        packetFields[state][direction][id] = fields;
        packetStates[direction][name] = state;
      }
    });
  }
})();



var types = {
  'byte': [readByte, writeByte, 1],
  'ubyte': [readUByte, writeUByte, 1],
  'short': [readShort, writeShort, 2],
  'ushort': [readUShort, writeUShort, 2],
  'int': [readInt, writeInt, 4],
  'long': [readLong, writeLong, 8],
  'varint': [readVarInt, writeVarInt, sizeOfVarInt],
  'float': [readFloat, writeFloat, 4],
  'double': [readDouble, writeDouble, 8],
  'bool': [readBool, writeBool, 1],
  'string': [readString, writeString, sizeOfString],
  'ustring': [readString, writeString, sizeOfUString], // TODO : remove ustring
  'UUID': [readUUID, writeUUID, 16],
  'container': [readContainer, writeContainer, sizeOfContainer],
  'array': [readArray, writeArray, sizeOfArray],
  'buffer': [readBuffer, writeBuffer, sizeOfBuffer],
  'restBuffer': [readRestBuffer, writeBuffer, sizeOfBuffer],
  'count': [readCount, writeCount, sizeOfCount],
  // TODO : remove type-specific, replace with generic containers and arrays.
  'position': [readPosition, writePosition, 8],
  'slot': [readSlot, writeSlot, sizeOfSlot],
  'nbt': [readNbt, writeBuffer, sizeOfBuffer],
  'entityMetadata': [readEntityMetadata, writeEntityMetadata, sizeOfEntityMetadata],
};

var debug;
if (process.env.NODE_DEBUG && /(minecraft-protocol|mc-proto)/.test(process.env.NODE_DEBUG)) {
  var pid = process.pid;
  debug = function(x) {
    // if console is not set up yet, then skip this.
    if (!console.error)
      return;
    console.error('MC-PROTO: %d', pid,
                  util.format.apply(util, arguments).slice(0, 500));
  };
} else {
  debug = function() { };
}

var entityMetadataTypes = {
  0: { type: 'byte' },
  1: { type: 'short' },
  2: { type: 'int' },
  3: { type: 'float' },
  4: { type: 'string' },
  5: { type: 'slot' },
  6: { type: 'container', typeArgs: { fields: [
       { name: 'x', type: 'int' },
       { name: 'y', type: 'int' },
       { name: 'z', type: 'int' }
  ]}},
  7: { type: 'container', typeArgs: { fields: [
      { name: 'pitch', type: 'float' },
      { name: 'yaw', type: 'float' },
      { name: 'roll', type: 'float' }
  ]}}
};

// maps string type name to number
var entityMetadataTypeBytes = {};
for (var n in entityMetadataTypes) {
  if (!entityMetadataTypes.hasOwnProperty(n)) continue;

  entityMetadataTypeBytes[entityMetadataTypes[n].type] = n;
}

function sizeOfEntityMetadata(value) {
  var size = 1 + value.length;
  var item;
  for (var i = 0; i < value.length; ++i) {
    item = value[i];
    size += sizeOf(item.value, entityMetadataTypes[entityMetadataTypeBytes[item.type]], {});
  }
  return size;
}

function writeEntityMetadata(value, buffer, offset) {
  value.forEach(function(item) {
    var type = entityMetadataTypeBytes[item.type];
    var headerByte = (type << 5) | item.key;
    buffer.writeUInt8(headerByte, offset);
    offset += 1;
    offset = write(item.value, buffer, offset, entityMetadataTypes[type], {});
  });
  buffer.writeUInt8(0x7f, offset);
  return offset + 1;
}

function writeUUID(value, buffer, offset) {
  buffer.writeUInt32BE(value[0], offset);
  buffer.writeUInt32BE(value[1], offset + 4);
  buffer.writeUInt32BE(value[2], offset + 8);
  buffer.writeUInt32BE(value[3], offset + 12);
  return offset + 16;
}

function readEntityMetadata(buffer, offset) {
  var cursor = offset;
  var metadata = [];
  var item, key, type, results, reader, typeName, dataType;
  while (true) {
    if (cursor + 1 > buffer.length) return null;
    item = buffer.readUInt8(cursor);
    cursor += 1;
    if (item === 0x7f) {
      return {
        value: metadata,
        size: cursor - offset,
      };
    }
    key = item & 0x1f;
    type = item >> 5;
    dataType = entityMetadataTypes[type];
    typeName = dataType.type;
    //debug("Reading entity metadata type " + dataType + " (" + ( typeName || "unknown" ) + ")");
    if (!dataType) {
      return {
        error: new Error("unrecognized entity metadata type " + type)
      }
    }
    results = read(buffer, cursor, dataType, {});
    if (! results) return null;
    metadata.push({
      key: key,
      value: results.value,
      type: typeName,
    });
    cursor += results.size;
  }
}

function readNbt(buffer, offset) {
  buffer = buffer.slice(offset);
  return nbt.parseUncompressed(buffer);
}

function writeNbt(value, buffer, offset) {
  var newbuf = nbt.writeUncompressed(value);
  newbuf.copy(buffer, offset);
  return offset + newbuf.length;
}

function sizeOfNbt(value) {
  return nbt.writeUncompressed(value).length;
}

function readString (buffer, offset) {
  var length = readVarInt(buffer, offset);
  if (!!!length) return null;
  var cursor = offset + length.size;
  var stringLength = length.value;
  var strEnd = cursor + stringLength;
  if (strEnd > buffer.length) return null;

  var value = buffer.toString('utf8', cursor, strEnd);
  cursor = strEnd;

  return {
    value: value,
    size: cursor - offset,
  };
}

function readUUID(buffer, offset) {
  return {
    value: [
      buffer.readUInt32BE(offset),
      buffer.readUInt32BE(offset + 4),
      buffer.readUInt32BE(offset + 8),
      buffer.readUInt32BE(offset + 12),
    ],
    size: 16,
  };
}

function readShort(buffer, offset) {
  if (offset + 2 > buffer.length) return null;
  var value = buffer.readInt16BE(offset);
  return {
    value: value,
    size: 2,
  };
}

function readUShort(buffer, offset) {
  if (offset + 2 > buffer.length) return null;
  var value = buffer.readUInt16BE(offset);
  return {
    value: value,
    size: 2,
  };
}

function readInt(buffer, offset) {
  if (offset + 4 > buffer.length) return null;
  var value = buffer.readInt32BE(offset);
  return {
    value: value,
    size: 4,
  };
}

function readFloat(buffer, offset) {
  if (offset + 4 > buffer.length) return null;
  var value = buffer.readFloatBE(offset);
  return {
    value: value,
    size: 4,
  };
}

function readDouble(buffer, offset) {
  if (offset + 8 > buffer.length) return null;
  var value = buffer.readDoubleBE(offset);
  return {
    value: value,
    size: 8,
  };
}

function readLong(buffer, offset) {
  if (offset + 8 > buffer.length) return null;
  return {
    value: [buffer.readInt32BE(offset), buffer.readInt32BE(offset + 4)],
    size: 8,
  };
}

function readByte(buffer, offset) {
  if (offset + 1 > buffer.length) return null;
  var value = buffer.readInt8(offset);
  return {
    value: value,
    size: 1,
  };
}

function readUByte(buffer, offset) {
  if (offset + 1 > buffer.length) return null;
  var value = buffer.readUInt8(offset);
  return {
    value: value,
    size: 1,
  };
}

function readBool(buffer, offset) {
  if (offset + 1 > buffer.length) return null;
  var value = buffer.readInt8(offset);
  return {
    value: !!value,
    size: 1,
  };
}

function readPosition(buffer, offset) {
  var longVal = readLong(buffer, offset).value; // I wish I could do destructuring...
  var x = longVal[0] >> 6;
  var y = ((longVal[0] & 0x3F) << 6) | ((longVal[1] >> 26) & 0x3f);
  var z = longVal[1] & 0x3FFFFFF;
  return {
    value: { x: x, y: y, z: z },
    size: 8
  };
}

function readSlot(buffer, offset) {
  var value = {};
  var results = readShort(buffer, offset);
  if (! results) return null;
  value.blockId = results.value;

  if (value.blockId === -1) {
    return {
      value: value,
      size: 2,
    };
  }

  var cursorEnd = offset + 6;
  if (cursorEnd > buffer.length) return null;
  value.itemCount = buffer.readInt8(offset + 2);
  value.itemDamage = buffer.readInt16BE(offset + 3);
  var nbtData = buffer.readInt8(offset + 5);
  if (nbtData == 0) {
    return {
      value: value,
      size: 6
    }
  }
  var nbtData = readNbt(buffer, offset + 5);
  value.nbtData = nbtData.value;
  return {
    value: value,
    size: nbtData.size + 5
  };
}

function sizeOfSlot(value) {
  if (value.blockId === -1)
    return (2);
  else if (!value.nbtData) {
    return (6);
  } else {
    return (5 + sizeOfNbt(value.nbtData));
  }
}

function writePosition(value, buffer, offset) {
  var longVal = [];
  longVal[0] = ((value.x & 0x3FFFFFF) <<  6) | ((value.y & 0xFFF) >> 6);
  longVal[1] = ((value.y & 0x3F) << 26) | (value.z & 0x3FFFFFF);
  return writeLong(longVal, buffer, offset);
}

function writeSlot(value, buffer, offset) {
  buffer.writeInt16BE(value.blockId, offset);
  if (value.blockId === -1) return offset + 2;
  buffer.writeInt8(value.itemCount, offset + 2);
  buffer.writeInt16BE(value.itemDamage, offset + 3);
  var nbtDataLen;
  if (value.nbtData)
  {
    var newbuf = nbt.writeUncompressed(value.nbtData);
    newbuf.copy(buffer, offset + 5);
    nbtDataLen = newbuf.length;
  }
  else
  {
    buffer.writeInt8(0, offset + 5);
    nbtDataLen = 1;
  }
  return offset + 5 + nbtDataLen;
}

function sizeOfString(value) {
  var length = Buffer.byteLength(value, 'utf8');
  assert.ok(length < STRING_MAX_LENGTH, "string greater than max length");
  return sizeOfVarInt(length) + length;
}

function sizeOfUString(value) {
  var length = Buffer.byteLength(value, 'utf8');
  assert.ok(length < SRV_STRING_MAX_LENGTH, "string greater than max length");
  return sizeOfVarInt(length) + length;
}

function writeString(value, buffer, offset) {
  var length = Buffer.byteLength(value, 'utf8');
  offset = writeVarInt(length, buffer, offset);
  buffer.write(value, offset, length, 'utf8');
  return offset + length;
}

function writeByte(value, buffer, offset) {
  buffer.writeInt8(value, offset);
  return offset + 1;
}

function writeBool(value, buffer, offset) {
  buffer.writeInt8(+value, offset);
  return offset + 1;
}

function writeUByte(value, buffer, offset) {
  buffer.writeUInt8(value, offset);
  return offset + 1;
}

function writeFloat(value, buffer, offset) {
  buffer.writeFloatBE(value, offset);
  return offset + 4;
}

function writeDouble(value, buffer, offset) {
  buffer.writeDoubleBE(value, offset);
  return offset + 8;
}

function writeShort(value, buffer, offset) {
  buffer.writeInt16BE(value, offset);
  return offset + 2;
}

function writeUShort(value, buffer, offset) {
  buffer.writeUInt16BE(value, offset);
  return offset + 2;
}

function writeInt(value, buffer, offset) {
  buffer.writeInt32BE(value, offset);
  return offset + 4;
}

function writeLong(value, buffer, offset) {
  buffer.writeInt32BE(value[0], offset);
  buffer.writeInt32BE(value[1], offset + 4);
  return offset + 8;
}

function readVarInt(buffer, offset) {
  var result = 0;
  var shift = 0;
  var cursor = offset;

  while (true) {
    if (cursor + 1 > buffer.length) return null;
    var b = buffer.readUInt8(cursor);
    result |= ((b & 0x7f) << shift); // Add the bits to our number, except MSB
    cursor++;
    if (!(b & 0x80)) { // If the MSB is not set, we return the number
      return {
        value: result,
        size: cursor - offset
      };
    }
    shift += 7; // we only have 7 bits, MSB being the return-trigger
    assert.ok(shift < 64, "varint is too big"); // Make sure our shift don't overflow.
  }
}

function sizeOfVarInt(value) {
  var cursor = 0;
  while (value & ~0x7F) {
    value >>>= 7;
    cursor++;
  }
  return cursor + 1;
}

function writeVarInt(value, buffer, offset) {
  var cursor = 0;
  while (value & ~0x7F) {
    buffer.writeUInt8((value & 0xFF) | 0x80, offset + cursor);
    cursor++;
    value >>>= 7;
  }
  buffer.writeUInt8(value, offset + cursor);
  return offset + cursor + 1;
}

function readContainer(buffer, offset, typeArgs, rootNode) {
    var results = {
        value: {},
        size: 0
    };
    // BLEIGH. Huge hack because I have no way of knowing my current name.
    // TODO : either pass fieldInfo instead of typeArgs as argument (bleigh), or send name as argument (verybleigh).
    // TODO : what I do inside of roblabla/Protocols is have each "frame" create a new empty slate with just a "super" object pointing to the parent.
    rootNode.this = results.value;
    for (var index in typeArgs.fields) {
        var readResults = read(buffer, offset, typeArgs.fields[index], rootNode);
        if (readResults == null) { continue; }
        results.size += readResults.size;
        offset += readResults.size;
        results.value[typeArgs.fields[index].name] = readResults.value;
    }
    delete rootNode.this;
    return results;
}

function writeContainer(value, buffer, offset, typeArgs, rootNode) {
    var context = value.this ? value.this : value;
    rootNode.this = value;
    for (var index in typeArgs.fields) {
        if (!context.hasOwnProperty(typeArgs.fields[index].name) && typeArgs.fields[index].type != "count" && !typeArgs.fields[index].condition)
        {
          debug(new Error("Missing Property " + typeArgs.fields[index].name).stack);
          console.log(context);
        }
        offset = write(context[typeArgs.fields[index].name], buffer, offset, typeArgs.fields[index], rootNode);
    }
    delete rootNode.this;
    return offset;
}

function sizeOfContainer(value, typeArgs, rootNode) {
    var size = 0;
    var context = value.this ? value.this : value;
    rootNode.this = value;
    for (var index in typeArgs.fields) {
        size += sizeOf(context[typeArgs.fields[index].name], typeArgs.fields[index], rootNode);
    }
    delete rootNode.this;
    return size;
}

function readBuffer(buffer, offset, typeArgs, rootNode) {
    var count = getField(typeArgs.count, rootNode);
    return {
        value: buffer.slice(offset, offset + count),
        size: count
    };
}

function writeBuffer(value, buffer, offset) {
    value.copy(buffer, offset);
    return offset + value.length;
}

function sizeOfBuffer(value) {
    return value.length;
}

function readRestBuffer(buffer, offset, typeArgs, rootNode) {
    return {
        value: buffer.slice(offset),
        size: buffer.length - offset
    };
}

function readArray(buffer, offset, typeArgs, rootNode) {
    var results = {
        value: [],
        size: 0
    }
    var count = getField(typeArgs.count, rootNode);
    for (var i = 0; i < count; i++) {
        var readResults = read(buffer, offset, { type: typeArgs.type, typeArgs: typeArgs.typeArgs }, rootNode);
        results.size += readResults.size;
        offset += readResults.size;
        results.value.push(readResults.value);
    }
    return results;
}

function writeArray(value, buffer, offset, typeArgs, rootNode) {
    for (var index in value) {
        offset = write(value[index], buffer, offset, { type: typeArgs.type, typeArgs: typeArgs.typeArgs }, rootNode);
    }
    return offset;
}

function sizeOfArray(value, typeArgs, rootNode) {
    var size = 0;
    for (var index in value) {
        size += sizeOf(value[index], { type: typeArgs.type, typeArgs: typeArgs.typeArgs }, rootNode);
    }
    return size;
}

function getField(countField, rootNode) {
    var countFieldArr = countField.split(".");
    var count = rootNode;
    for (var index = 0; index < countFieldArr.length; index++) {
        count = count[countFieldArr[index]];
    }
    return count;
}

function readCount(buffer, offset, typeArgs, rootNode) {
    return read(buffer, offset, { type: typeArgs.type }, rootNode);
}

function writeCount(value, buffer, offset, typeArgs, rootNode) {
    // Actually gets the required field, and writes its length. Value is unused.
    // TODO : a bit hackityhack.
    return write(getField(typeArgs.countFor, rootNode).length, buffer, offset, { type: typeArgs.type }, rootNode);
}

function sizeOfCount(value, typeArgs, rootNode) {
    // TODO : should I use value or getField().length ?
    /*console.log(rootNode);
    console.log(typeArgs);*/
    return sizeOf(getField(typeArgs.countFor, rootNode).length, { type: typeArgs.type }, rootNode);
}

function read(buffer, cursor, fieldInfo, rootNodes) {
  if (fieldInfo.condition && !fieldInfo.condition(rootNodes)) {
    return null;
  }
  var type = types[fieldInfo.type];
  if (!type) {
    return {
      error: new Error("missing data type: " + fieldInfo.type)
    };
  }
  var readResults = type[0](buffer, cursor, fieldInfo.typeArgs, rootNodes);
  if (readResults == null) {
    throw new Error("Reader returned null : " + JSON.stringify(fieldInfo));
  }
  if (readResults && readResults.error) return { error: readResults.error };
  return readResults;
}

function write(value, buffer, offset, fieldInfo, rootNode) {
  if (fieldInfo.condition && !fieldInfo.condition(rootNode)) {
    return offset;
  }
  var type = types[fieldInfo.type];
  if (!type) {
    return {
      error: new Error("missing data type: " + fieldInfo.type)
    };
  }
  return type[1](value, buffer, offset, fieldInfo.typeArgs, rootNode);
}

function sizeOf(value, fieldInfo, rootNode) {
  if (fieldInfo.condition && !fieldInfo.condition(rootNode)) {
    return 0;
  }
  var type = types[fieldInfo.type];
  if (!type) {
    throw new Error("missing data type: " + fieldInfo.type);
  }
  if (typeof type[2] === 'function') {
    return type[2](value, fieldInfo.typeArgs, rootNode);
  } else {
    return type[2];
  }
}

function get(packetId, state, toServer) {
  var direction = toServer ? "toServer" : "toClient";
  var packetInfo = packetFields[state][direction][packetId];
  if (!packetInfo) {
    return null;
  }
  return packetInfo;
}

// TODO : This does NOT contain the length prefix anymore.
function createPacketBuffer(packetId, state, params, isServer) {
  var length = 0;
  if (typeof packetId === 'string' && typeof state !== 'string' && !params) {
    // simplified two-argument usage, createPacketBuffer(name, params)
    params = state;
    state = packetStates[!isServer ? 'toServer' : 'toClient'][packetId];
  }
  if (typeof packetId === 'string') packetId = packetIds[state][!isServer ? 'toServer' : 'toClient'][packetId];
  assert.notEqual(packetId, undefined);

  var packet = get(packetId, state, !isServer);
  assert.notEqual(packet, null);
  packet.forEach(function(fieldInfo) {
    try {
    length += sizeOf(params[fieldInfo.name], fieldInfo, params);
    } catch (e) {
      console.log("fieldInfo : " + JSON.stringify(fieldInfo));
      console.log("params : " + JSON.stringify(params));
      throw e;
    }
  });
  length += sizeOfVarInt(packetId);
  var size = length;// + sizeOfVarInt(length);
  var buffer = new Buffer(size);
  var offset = 0;//writeVarInt(length, buffer, 0);
  offset = writeVarInt(packetId, buffer, offset);
  packet.forEach(function(fieldInfo) {
    var value = params[fieldInfo.name];
    // TODO : A better check is probably needed
    if(typeof value === "undefined" && fieldInfo.type != "count" && !fieldInfo.condition)
      debug(new Error("Missing Property " + fieldInfo.name).stack);
    offset = write(value, buffer, offset, fieldInfo, params);
  });
  return buffer;
}

function compressPacketBuffer(buffer, callback) {
  var dataLength = buffer.size;
  zlib.deflate(buffer, function(err, buf) {
    if (err)
      callback(err);
    else
      newStylePacket(buffer, callback);
  });
}

function oldStylePacket(buffer, callback) {
  var packet = new Buffer(sizeOfVarInt(buffer.length) + buffer.length);
  var cursor = writeVarInt(buffer.length, packet, 0);
  writeBuffer(buffer, packet, cursor);
  callback(null, packet);
}

function newStylePacket(buffer, callback) {
  var sizeOfDataLength = sizeOfVarInt(0);
  var sizeOfLength = sizeOfVarInt(buffer.length + sizeOfDataLength);
  var size = sizeOfLength + sizeOfDataLength + buffer.length;
  var packet = new Buffer(size);
  var cursor = writeVarInt(size - sizeOfLength, packet, 0);
  cursor = writeVarInt(0, packet, cursor);
  writeBuffer(buffer, packet, cursor);
  callback(null, packet);
}

function parsePacketData(buffer, state, isServer, packetsToParse) {
  var cursor = 0;
  var packetIdField = readVarInt(buffer, cursor);
  var packetId = packetIdField.value;
  cursor += packetIdField.size;

  var results = { id: packetId, state: state };
  // Only parse the packet if there is a need for it, AKA if there is a listener attached to it
  var name = packetNames[state][isServer ? "toServer" : "toClient"][packetId];
  var shouldParse = (!packetsToParse.hasOwnProperty(name) || packetsToParse[name] <= 0)
                    && (!packetsToParse.hasOwnProperty("packet") || packetsToParse["packet"] <= 0);
  if (shouldParse) {
    return {
      buffer: buffer,
      results: results
    };
  }

  var packetInfo = get(packetId, state, isServer);
  if (packetInfo === null) {
    return {
      error: new Error("Unrecognized packetId: " + packetId + " (0x" + packetId.toString(16) + ")"),
      buffer: buffer,
      results: results
    };
  } else {
    var packetName = packetNames[state][isServer ? "toServer" : "toClient"][packetId];
    debug("read packetId " + state + "." + packetName + " (0x" + packetId.toString(16) + ")");
  }

  var i, fieldInfo, readResults;
  for (i = 0; i < packetInfo.length; ++i) {
    fieldInfo = packetInfo[i];
    readResults = read(buffer, cursor, fieldInfo, results);
    /* A deserializer cannot return null anymore. Besides, read() returns
     * null when the condition is not fulfilled.
     if (!!!readResults) {
        var error = new Error("A deserializer returned null");
        error.packetId = packetId;
        error.fieldInfo = fieldInfo.name;
        return {
            size: length + lengthField.size,
            error: error,
            results: results
        };
    }*/
    if (readResults === null) continue;
    if (readResults.error) {
      return readResults;
    }
    results[fieldInfo.name] = readResults.value;
    cursor += readResults.size;
  }
  if (buffer.length > cursor)
    console.log("DID NOT PARSE THE WHOLE THING!");
  debug(results);
  return {
    results: results,
    buffer: buffer
  };
}

function parsePacket(buffer, state, isServer, packetsToParse) {
  if (state == null) state = states.PLAY;
  var cursor = 0;
  var lengthField = readVarInt(buffer, 0);
  if (!!!lengthField) return null;
  var length = lengthField.value;
  cursor += lengthField.size;
  if (length + lengthField.size > buffer.length) return null; // fail early
  var result = parsePacketData(buffer.slice(cursor, length + cursor), state, isServer, packetsToParse);
  result.size = lengthField.size + length;
  return result;
}

function parseNewStylePacket(buffer, state, isServer, packetsToParse, cb) {
  var dataLengthField = readVarInt(buffer, 0);
  var buf = buffer.slice(dataLengthField.size);
  if(dataLengthField.value != 0) {
    zlib.inflate(buf, function(err, newbuf) {
      if (err) {
        console.log(err);
        cb(err);
      } else {
        cb(null, parsePacketData(newbuf, state, isServer, packetsToParse));
      }
    });
  } else {
    cb(null, parsePacketData(buf, state, isServer, packetsToParse));
  }
}

module.exports = {
  version: 47,
  minecraftVersion: '1.8.1',
  sessionVersion: 13,
  parsePacket: parsePacket,
  parsePacketData: parsePacketData,
  parseNewStylePacket: parseNewStylePacket,
  createPacketBuffer: createPacketBuffer,
  compressPacketBuffer: compressPacketBuffer,
  oldStylePacket: oldStylePacket,
  newStylePacket: newStylePacket,
  STRING_MAX_LENGTH: STRING_MAX_LENGTH,
  packetIds: packetIds,
  packetNames: packetNames,
  packetFields: packetFields,
  packetStates: packetStates,
  types: types,
  states: states,
  get: get,
  debug: debug,
};

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":98,"assert":76,"buffer":90,"prismarine-nbt":7,"util":113,"zlib":89}],7:[function(require,module,exports){
(function (Buffer){
/*
	NBT.js - a JavaScript parser for NBT archives
	by Sijmen Mulder

	I, the copyright holder of this work, hereby release it into the public
	domain. This applies worldwide.

	In case this is not legally possible: I grant anyone the right to use this
	work for any purpose, without any conditions, unless such conditions are
	required by law.
*/

(function() {
	'use strict';

	var nbt = this;
	var zlib = require('zlib');

	nbt.tagTypes = {
		'end': 0,
		'byte': 1,
		'short': 2,
		'int': 3,
		'long': 4,
		'float': 5,
		'double': 6,
		'byteArray': 7,
		'string': 8,
		'list': 9,
		'compound': 10,
		'intArray': 11
	};

	nbt.tagTypeNames = {};
	(function() {
		for (var typeName in nbt.tagTypes) {
			if (nbt.tagTypes.hasOwnProperty(typeName)) {
				nbt.tagTypeNames[nbt.tagTypes[typeName]] = typeName;
			}
		}
	})();

	var hasGzipHeader = function(data){
		var result=true;
		if(data[0]!=0x1f) result=false;
		if(data[1]!=0x8b) result=false;
		return result;
	}

    nbt.Writer = function() {
		this.buffer = new Buffer(0);
		var _offset = 0;
		Object.defineProperty(this, "offset", {
			get: function() { return _offset; },
			set: function(newval) {
				_offset = newval;
				var newBuf = new Buffer(_offset);
				this.buffer.copy(newBuf);
				this.buffer = newBuf;
			}
		});
		function write(dataType, size, value) {
			var oldoffset = this.offset;
			this.offset += size;
			this.buffer['write' + dataType](value, oldoffset);
			return this;
		}

		this[nbt.tagTypes.byte]   = write.bind(this, 'Int8', 1);
		this[nbt.tagTypes.short]  = write.bind(this, 'Int16BE', 2);
		this[nbt.tagTypes.int]    = write.bind(this, 'Int32BE', 4);
		this[nbt.tagTypes.float]  = write.bind(this, 'FloatBE', 4);
		this[nbt.tagTypes.double] = write.bind(this, 'DoubleBE', 8);

		this[nbt.tagTypes.long] = function(value) {
			this.int(value[0]);
			this.int(value[1]);
			return this;
		};

		this[nbt.tagTypes.byteArray] = function(value) {
			this.int(value.length);
			var oldoffset = this.offset;
			this.offset += value.length;
			value.copy(this.buffer, oldoffset);
			return this;
		};

		this[nbt.tagTypes.intArray] = function(value) {
			this.int(value.length);
			var i;
			for (i = 0; i < value.length; i++) {
				this.int(value[i]);
			}
			return this;
		};

		this[nbt.tagTypes.string] = function(value) {
			function byteLength(str) {
				// returns the byte length of an utf8 string
				var s = str.length;
				for (var i=str.length-1; i>=0; i--) {
					var code = str.charCodeAt(i);
					if (code > 0x7f && code <= 0x7ff) s++;
					else if (code > 0x7ff && code <= 0xffff) s+=2;
					if (code >= 0xDC00 && code <= 0xDFFF) i--; //trail surrogate
				}
				return s;
			}
			var len = byteLength(value);
			this.short(len);
			var oldoffset = this.offset;
			this.offset += len
			this.buffer.write(value, oldoffset);
			return this;
		};

		this[nbt.tagTypes.list] = function(value) {
			this.byte(nbt.tagTypes[value.type]);
			this.int(value.value.length);
			var i;
			for (i = 0; i < value.value.length; i++) {
				this[value.type](value.value[i]);
			}
			return this;
		};

		this[nbt.tagTypes.compound] = function(value) {
			var self = this;
			Object.keys(value).map(function (key) {
				self.byte(nbt.tagTypes[value[key].type]);
				self.string(key);
				self[value[key].type](value[key].value);
			});
			this.byte(nbt.tagTypes.end);
			return this;
		};

		var typeName;
		for (typeName in nbt.tagTypes) {
			if (nbt.tagTypes.hasOwnProperty(typeName)) {
				this[typeName] = this[nbt.tagTypes[typeName]];
			}
		}

    }
	nbt.Reader = function(buffer) {
		this.offset = 0;

		function read(dataType, size) {
			var val = buffer['read' + dataType](this.offset);
			this.offset += size;
			return val;
		}

		this[nbt.tagTypes.byte]   = read.bind(this, 'Int8', 1);
		this[nbt.tagTypes.short]  = read.bind(this, 'Int16BE', 2);
		this[nbt.tagTypes.int]    = read.bind(this, 'Int32BE', 4);
		this[nbt.tagTypes.float]  = read.bind(this, 'FloatBE', 4);
		this[nbt.tagTypes.double] = read.bind(this, 'DoubleBE', 8);

		this[nbt.tagTypes.long] = function() {
			return [this.int(), this.int()];
		};

		this[nbt.tagTypes.byteArray] = function() {
			var length = this.int();
			var bytes = [];
			var i;
			for (i = 0; i < length; i++) {
				bytes.push(this.byte());
			}
			return bytes;
		};

		this[nbt.tagTypes.intArray] = function() {
			var length = this.int();
			var ints = [];
			var i;
			for (i = 0; i < length; i++) {
				ints.push(this.int());
			}
			return ints;
		};

		this[nbt.tagTypes.string] = function() {
			var length = this.short();
			var val = buffer.toString('utf8', this.offset, this.offset + length);
			this.offset += length;
			return val;
		};

		this[nbt.tagTypes.list] = function() {
			var type = this.byte();
			var length = this.int();
			var values = [];
			var i;
			for (i = 0; i < length; i++) {
				values.push(this[type]());
			}
			return { type: nbt.tagTypeNames[type], value: values };
		};

		this[nbt.tagTypes.compound] = function() {
			var values = {};
			while (true) {
				var type = this.byte();
				if (type === nbt.tagTypes.end) {
					break;
				}
				var name = this.string();
				var value = this[type]();
				values[name] = { type: nbt.tagTypeNames[type], value: value };
			}
			return values;
		};

		var typeName;
		for (typeName in nbt.tagTypes) {
			if (nbt.tagTypes.hasOwnProperty(typeName)) {
				this[typeName] = this[nbt.tagTypes[typeName]];
			}
		}
	};

	var writeUncompressed = this.writeUncompressed = function(value) {
		var writer = new nbt.Writer();

		writer.byte(nbt.tagTypes.compound);
		writer.string(value.root);
		writer.compound(value.value);
		return writer.buffer;
	}

	var parseUncompressed = this.parseUncompressed = function(data) {
		var buffer = new Buffer(data);
		var reader = new nbt.Reader(buffer);

		var type = reader.byte();
		if (type !== nbt.tagTypes.compound) {
			throw new Error('Top tag should be a compound');
		}

		var name = reader.string();
		var value = reader.compound();

		var result = { size: reader.offset, value: { root: name, value: value } };
		return result;
	}

	this.parse = function(data, callback) {
		if (hasGzipHeader(data)) {
			zlib.gunzip(data, function(error, uncompressed) {
				if (error) {
					callback(error, data);
				} else {
					callback(null, parseUncompressed(uncompressed));
				}
			});
		} else {
			callback(null, parseUncompressed(data));
		}
	};
}).apply(exports || (nbt = {}));

}).call(this,require("buffer").Buffer)
},{"buffer":90,"zlib":89}],8:[function(require,module,exports){
var biomes = require('./enums/biomes')

module.exports = Biome;

function Biome(id) {
  this.id = id;
  var biomeEnum = biomes[id];
  if (biomeEnum) {
    this.color = biomeEnum.color;
    this.name = biomeEnum.name;
    this.height = biomeEnum.height;
    this.rainfall = biomeEnum.rainfall;
    this.temperature = biomeEnum.temperature;
  } else {
    this.color = 0;
    this.height = null;
    this.name = "";
    this.rainfall = 0;
    this.temperature = 0;
  }
}


},{"./enums/biomes":16}],9:[function(require,module,exports){
var Biome = require('./biome')
  , blocks = require('./enums/blocks')

module.exports = Block;

function Block(type, biomeId) {
  this.type = type;
  this.metadata = 0;
  this.light = 0;
  this.skyLight = 0;
  this.add = 0;
  this.biome = new Biome(biomeId);
  this.position = null;

  var blockEnum = blocks[type];
  if (blockEnum) {
    this.name = blockEnum.name;
    this.hardness = blockEnum.hardness;
    this.displayName = blockEnum.displayName;
    this.boundingBox = blockEnum.boundingBox;
    this.diggable = blockEnum.diggable;
    this.material = blockEnum.material;
    this.harvestTools = blockEnum.harvestTools;
  } else {
    this.name = "";
    this.displayName = "";
    this.hardness = 0;
    this.boundingBox = "empty"
    this.diggable = false;
  }
}


},{"./biome":8,"./enums/blocks":17}],10:[function(require,module,exports){
var util = require('util');

/**
 * ChatMessage Constructor
 * @param {String|Object} message content of ChatMessage
 */
function ChatMessage(message) {
	if(typeof message === 'string') {
		this.json = { text: message };
	}else if(typeof message === 'object' && !Array.isArray(message)) {
		this.json = message;
	}else{
		throw new Error('Expected String or Object for Message argument');
	}
	this.parse();
}

/**
 * Parses the this.json property to decorate the properties of the ChatMessage.
 * Called by the Constructor
 * @return {void}
 */
ChatMessage.prototype.parse = function() {
	var json = this.json;
	// Message scope for callback functions
	var that = this;

	// There is EITHER, a text property or a translate property
	// If there is no translate property, there is no with property	
	// HOWEVER! If there is a translate property, there may not be a with property
	if(typeof json.text == 'string') {
		this.text = json.text;
	}else if(typeof json.translate === 'string') {
		this.translate = json.translate;
		if(typeof json.with === 'object' || Array.isArray(json.with)) {
			this.with = [];
			json.with.forEach(function(entry) {
				if(typeof entry === 'string') {
					that.with.push(entry);
				}else if(typeof entry === 'object') {
					// Parse ChatMessage
					var subChatMessage = new ChatMessage(entry);
					that.with.push(subChatMessage);
				}
			});
		}
	}
	// Parse extra property
	// Extras are appended to the initial text
	if(typeof json.extra === 'object') {
		if(!Array.isArray(json.extra)) {
			throw new Error('Expected extra property to be an Array in ChatMessage');
		}
		this.extra = [];
		json.extra.forEach(function(entry) {
			if(typeof entry === 'string') {
				that.extra.push(entry);
			}else if(typeof entry === 'object') {
				var subChatMessage = new ChatMessage(entry);
				that.extra.push(subChatMessage);
			}
		});
	}
	// Text modifiers
	this.bold = json.bold;
	this.italic = json.italic;
	this.underlined = json.underlined;
	this.strikethrough = json.strikethrough;
	this.obfuscated = json.obfuscated;

	// Supported constants @ 2014-04-21
	var supportedColors = [ 'black', 'dark_blue', 'dark_green', 'dark_aqua', 'dark_red', 'dark_purple',
							'gold', 'gray', 'dark_gray', 'blue', 'green', 'aqua', 'red', 'light_purple',
							'yellow', 'white', 'obfuscated', 'bold', 'strikethrough', 'underlined', 'italic',
							'reset'];
	var supportedClick = ['open_url', 'open_file', 'run_command', 'suggest_command'];
	var supportedHover = ['show_text', 'show_achievement', 'show_item', 'show_entity'];

	// Parse color
	this.color = json.color;
	switch(this.color) {
		case 'obfuscated': this.obfuscated = true; this.color = null; break;
		case 'bold': this.bold = true; this.color = null; break;
		case 'strikethrough': this.strikethrough = true; this.color = null; break;
		case 'underlined': this.underlined = true; this.color = null; break;
		case 'italic': this.italic = true; this.color = null; break;
		case 'reset': this.reset = true; this.color = null; break;
	}
	if(Array.prototype.indexOf && this.color && 
		supportedColors.indexOf(this.color) === -1) {
		console.warn('ChatMessage parsed with unsupported color', this.color);
	}

	// Parse click event
	if(typeof json.clickEvent === 'object') {
		this.clickEvent = json.clickEvent;
		if(typeof this.clickEvent.action !== 'string') {
			throw new Error('ClickEvent action missing in ChatMessage');
		}else if(Array.prototype.indexOf && supportedClick.indexOf(this.clickEvent.action) === -1) {
			console.warn('ChatMessage parsed with unsupported clickEvent', this.clickEvent.action);
		}
	}

	// Parse hover event
	if(typeof json.hoverEvent === 'object') {
		this.hoverEvent = json.hoverEvent;
		if(typeof this.hoverEvent.action !== 'string') {
			throw new Error('HoverEvent action missing in ChatMessage');
		}else if(Array.prototype.indexOf && supportedHover.indexOf(this.hoverEvent.action) === -1) {
			console.warn('ChatMessage parsed with unsupported hoverEvent', this.hoverEvent.action);
		}
		// Special case
		if(this.hoverEvent.action === 'show_item') {
			// Unfortunately, Mojang do not use compliant JSON as per the specifications
			// So some adjustments must be made
			// Note: Probably could have put this in a single regex, but felt it better
			// to leave it seperate for the sake of maintainability 
			this.hoverEvent.value = this.hoverEvent.value
			.replace(/[\w],/g, ',')			// Remove number suffix
			.replace(/(\w+):/g, '"$1":')	// Convert keys to JSON standard (quoted)
			.replace(',}', '}');			// Replace any hanging commas
			try {
				this.hoverEvent.value = JSON.parse(this.hoverEvent.value);
				if(typeof this.hoverEvent.value !== 'object') {
					throw new Error('Parsed Item Object is not an Object');
				}
			}catch(err) {
				console.info('Error parsing JSON Item Object', err);
				throw new Error('Expected JSON item object in hoverEvent.value');
			}
		}
	}
}

/**
 * Returns the count of text extras and child ChatMessages
 * Does not count recursively in to the children
 * @return {Number}
 */
ChatMessage.prototype.length = function() {
	var count = 0;
	if(this.text) count++;
	else if(this.translate) count += this.with.length;

	if(this.extra) count += this.extra.length;
}

/**
 * Returns a text part from the message
 * @param  {Number} idx Index of the part	
 * @return {String}
 */
ChatMessage.prototype.getText = function(idx) {
	// If the index is not defined is is invalid, return toString
	if(typeof idx !== 'number') return this.toString();
	// If we are not a translating message, return the text
	if(this.text && idx == 0) return this.text;
	// Else return the with child if it's in range
	else if(this.with.length > idx) return this.with[idx].toString();
	// Else return the extra if it's in range
	if(this.extra && this.extra.length + (this.text ? 1 : this.with.length) > idx)
		return this.extra[idx - (this.text ? 1 : this.with.length)].toString();
	// Not sure how you want to default this
	// Undefined, an error ? 
	return "";
}

/**
 * Flattens the message in to plain-text
 * @return {String}
 */
ChatMessage.prototype.toString = function() {
	var message = "";
	if(typeof this.text === 'string') message += this.text + " ";
	else {
		this.with.forEach(function(entry) {
			message += entry.toString() + " ";
		})
	}
	if(this.extra) {
		this.extra.forEach(function(entry) {
			message += entry.toString() + " ";
		})
	}
	return message.trim();
}




module.exports = ChatMessage;

},{"util":113}],11:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , assert = require('assert')

module.exports = Chest;

function Chest() {
  EventEmitter.call(this);

  this.window = null;
}
util.inherits(Chest, EventEmitter);

Chest.windowType = 0;

// this function is replaced by the inventory plugin
Chest.prototype.close = function() {
  assert.ok(false, "override");
};

Chest.prototype.deposit = function(itemType, metadata, count) {
  assert.ok(false, "override");
};

Chest.prototype.withdraw = function(itemType, metadata, count) {
  assert.ok(false, "override");
};

Chest.prototype.count = function(itemType, metadata) {
  assert.ok(this.window);
  return this.window.chestCount(itemType, metadata);
};

Chest.prototype.items = function() {
  assert.ok(this.window);
  return this.window.chestItems();
};

},{"assert":76,"events":94,"util":113}],12:[function(require,module,exports){
var math = require('./math')
  , euclideanMod = math.euclideanMod
  , PI = Math.PI
  , PI_2 = Math.PI * 2
  , TO_RAD = PI / 180
  , TO_DEG = 1 / TO_RAD
  , FROM_NOTCH_BYTE = 360 / 256
  , FROM_NOTCH_VEL = 5 / 32000

exports.toRadians = toRadians;
exports.toDegrees = toDegrees;
exports.fromNotchianYaw = fromNotchianYaw;
exports.fromNotchianPitch = fromNotchianPitch;

exports.toNotchianYaw = function(yaw) {
  return toDegrees(PI - yaw);
}

exports.toNotchianPitch = function(pitch) {
  return toDegrees(-pitch);
}

exports.fromNotchianYawByte = function(yaw) {
  return fromNotchianYaw(yaw * FROM_NOTCH_BYTE);
}

exports.fromNotchianPitchByte = function(pitch) {
  return fromNotchianPitch(pitch * FROM_NOTCH_BYTE);
}

exports.fromNotchVelocity = function(vel) {
  return vel.scaled(FROM_NOTCH_VEL);
};

function toRadians(degrees) {
  return TO_RAD * degrees;
}

function toDegrees(radians) {
  return TO_DEG * radians;
}

function fromNotchianYaw(yaw) {
  return euclideanMod(PI - toRadians(yaw), PI_2);
}

function fromNotchianPitch(pitch) {
  return euclideanMod(toRadians(-pitch) + PI, PI_2) - PI;
}

},{"./math":25}],13:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , assert = require('assert')

module.exports = Dispenser;

function Dispenser() {
  EventEmitter.call(this);

  this.window = null;
}
util.inherits(Dispenser, EventEmitter);

Dispenser.windowType = 3;

// this function is replaced by the inventory plugin
Dispenser.prototype.close = function() {
  assert.ok(false, "override");
};

Dispenser.prototype.deposit = function(itemType, metadata, count) {
  assert.ok(false, "override");
};

Dispenser.prototype.withdraw = function(itemType, metadata, count) {
  assert.ok(false, "override");
};

Dispenser.prototype.count = function(itemType, metadata) {
  assert.ok(this.window);
  return this.window.dispenserCount(itemType, metadata);
};

Dispenser.prototype.items = function() {
  assert.ok(this.window);
  return this.window.dispenserItems();
};

},{"assert":76,"events":94,"util":113}],14:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , assert = require('assert')

module.exports = EnchantmentTable;

function EnchantmentTable() {
  EventEmitter.call(this);

  this.window = null;
}
util.inherits(EnchantmentTable, EventEmitter);

EnchantmentTable.windowType = 4;

// this function is replaced by the inventory plugin
EnchantmentTable.prototype.close = function() {
  assert.ok(false, "override");
};

EnchantmentTable.prototype.targetItem = function() {
  return this.window.slots[0];
};

EnchantmentTable.prototype.enchant = function() {
  assert.ok(false, "override");
};

EnchantmentTable.prototype.takeTargetItem = function() {
  assert.ok(false, "override");
};

EnchantmentTable.prototype.putTargetItem = function() {
  assert.ok(false, "override");
};

},{"assert":76,"events":94,"util":113}],15:[function(require,module,exports){
var Vec3 = require('vec3').Vec3;

module.exports = Entity;

function Entity(id) {
  this.id = id;
  this.type = null;
  this.position = new Vec3(0, 0, 0);
  this.velocity = new Vec3(0, 0, 0);
  this.yaw = 0;
  this.pitch = 0;
  this.onGround = true;
  this.height = 0;
  this.effects = {};
  // 0 = held item, 1-4 = armor slot
  this.equipment = new Array(5);
  this.heldItem = this.equipment[0]; // shortcut to equipment[0]
  this.isValid = true;
}

Entity.prototype.setEquipment = function(index, item) {
  this.equipment[index] = item;
  this.heldItem = this.equipment[0];
};


},{"vec3":47}],16:[function(require,module,exports){
module.exports={
  "0": {
    "id": 0,
    "color": 112,
    "name": "Ocean",
    "rainfall": 0.5,
    "temperature": 0.5
  },
  "1": {
    "id": 1,
    "color": 9286496,
    "name": "Plains",
    "rainfall": 0.4,
    "temperature": 0.8
  },
  "2": {
    "id": 2,
    "color": 16421912,
    "name": "Desert",
    "rainfall": 0,
    "temperature": 2
  },
  "3": {
    "id": 3,
    "color": 6316128,
    "name": "Extreme Hills",
    "rainfall": 0.3,
    "temperature": 0.2
  },
  "4": {
    "id": 4,
    "color": 353825,
    "name": "Forest",
    "rainfall": 0.8,
    "temperature": 0.7
  },
  "5": {
    "id": 5,
    "color": 747097,
    "name": "Taiga",
    "rainfall": 0.8,
    "temperature": 0.05
  },
  "6": {
    "id": 6,
    "color": 522674,
    "name": "Swampland",
    "rainfall": 0.9,
    "temperature": 0.8
  },
  "7": {
    "id": 7,
    "name": "River",
    "rainfall": 0.5,
    "temperature": 0.5
  },
  "8": {
    "id": 8,
    "color": 16711680,
    "name": "Hell",
    "rainfall": 0,
    "temperature": 2
  },
  "9": {
    "id": 9,
    "color": 8421631,
    "name": "The End",
    "rainfall": 0.5,
    "temperature": 0.5
  },
  "10": {
    "id": 10,
    "color": 9474208,
    "name": "FrozenOcean",
    "rainfall": 0.5,
    "temperature": 0
  },
  "11": {
    "id": 11,
    "color": 10526975,
    "name": "FrozenRiver",
    "rainfall": 0.5,
    "temperature": 0
  },
  "12": {
    "id": 12,
    "color": 16777215,
    "name": "Ice Plains",
    "rainfall": 0.5,
    "temperature": 0
  },
  "13": {
    "id": 13,
    "color": 10526880,
    "name": "Ice Mountains",
    "rainfall": 0.5,
    "temperature": 0
  },
  "14": {
    "id": 14,
    "color": 16711935,
    "name": "MushroomIsland",
    "rainfall": 1,
    "temperature": 0.9
  },
  "15": {
    "id": 15,
    "color": 10486015,
    "name": "MushroomIslandShore",
    "rainfall": 1,
    "temperature": 0.9
  },
  "16": {
    "id": 16,
    "color": 16440917,
    "name": "Beach",
    "rainfall": 0.4,
    "temperature": 0.8
  },
  "17": {
    "id": 17,
    "color": 13786898,
    "name": "DesertHills",
    "rainfall": 0,
    "temperature": 2
  },
  "18": {
    "id": 18,
    "color": 2250012,
    "name": "ForestHills",
    "rainfall": 0.8,
    "temperature": 0.7
  },
  "19": {
    "id": 19,
    "color": 1456435,
    "name": "TaigaHills",
    "rainfall": 0.7,
    "temperature": 0.2
  },
  "20": {
    "id": 20,
    "color": 7501978,
    "name": "Extreme Hills Edge",
    "rainfall": 0.3,
    "temperature": 0.2
  },
  "21": {
    "id": 21,
    "color": 5470985,
    "name": "Jungle",
    "rainfall": 0.9,
    "temperature": 1.2
  },
  "22": {
    "id": 22,
    "color": 2900485,
    "name": "JungleHills",
    "rainfall": 0.9,
    "temperature": 1.2
  },
  "23": {
    "id": 23,
    "color": 6458135,
    "name": "JungleEdge",
    "rainfall": 0.8,
    "temperature": 0.95
  },
  "24": {
    "id": 24,
    "color": 48,
    "name": "Deep Ocean",
    "rainfall": 0.5,
    "temperature": 0.5
  },
  "25": {
    "id": 25,
    "color": 10658436,
    "name": "Stone Beach",
    "rainfall": 0.3,
    "temperature": 0.2
  },
  "26": {
    "id": 26,
    "color": 16445632,
    "name": "Cold Beach",
    "rainfall": 0.3,
    "temperature": 0.05
  },
  "27": {
    "id": 27,
    "color": 3175492,
    "name": "Birch Forest",
    "rainfall": 0.6,
    "temperature": 0.6
  },
  "28": {
    "id": 28,
    "color": 2055986,
    "name": "Birch Forest Hills",
    "rainfall": 0.6,
    "temperature": 0.6
  },
  "29": {
    "id": 29,
    "color": 4215066,
    "name": "Roofed Forest",
    "rainfall": 0.8,
    "temperature": 0.7
  },
  "30": {
    "id": 30,
    "color": 3233098,
    "name": "Cold Taiga",
    "rainfall": 0.4,
    "temperature": -0.5
  },
  "31": {
    "id": 31,
    "color": 2375478,
    "name": "Cold Taiga Hills",
    "rainfall": 0.4,
    "temperature": -0.5
  },
  "32": {
    "id": 32,
    "color": 5858897,
    "name": "Mega Taiga",
    "rainfall": 0.8,
    "temperature": 0.3
  },
  "33": {
    "id": 33,
    "color": 4542270,
    "name": "Mega Taiga Hills",
    "rainfall": 0.8,
    "temperature": 0.3
  },
  "34": {
    "id": 34,
    "color": 5271632,
    "name": "Extreme Hills+",
    "rainfall": 0.3,
    "temperature": 0.2
  },
  "35": {
    "id": 35,
    "color": 12431967,
    "name": "Savanna",
    "rainfall": 0,
    "temperature": 1.2
  },
  "36": {
    "id": 36,
    "color": 10984804,
    "name": "Savanna Plateau",
    "rainfall": 0,
    "temperature": 1
  },
  "37": {
    "id": 37,
    "color": 14238997,
    "name": "Mesa",
    "rainfall": 0.5,
    "temperature": 2.0
  },
  "38": {
    "id": 38,
    "color": 11573093,
    "name": "Mesa Plateau F",
    "rainfall": 0.5,
    "temperature": 2.0
  },
  "39": {
    "id": 39,
    "color": 13274213,
    "name": "Redwood Taiga Hills M",
    "rainfall": 0.5,
    "temperature": 2.0
  }
}
},{}],17:[function(require,module,exports){
module.exports={
  "0": {
    "id": 0,
    "name": "air",
    "displayName": "Air",
    "hardness": 0,
    "stackSize": null,
    "diggable": false,
    "boundingBox": "empty"
  },
  "1": {
    "id": 1,
    "displayName": "Stone",
    "name": "stone",
    "hardness": 1.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "2": {
    "id": 2,
    "displayName": "Grass Block",
    "name": "grass",
    "hardness": 0.6,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "dirt"
  },
  "3": {
    "id": 3,
    "displayName": "Dirt",
    "name": "dirt",
    "hardness": 0.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "dirt"
  },
  "4": {
    "id": 4,
    "displayName": "Cobblestone",
    "name": "stonebrick",
    "hardness": 2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "5": {
    "id": 5,
    "displayName": "Wooden Planks",
    "name": "wood",
    "hardness": 2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "6": {
    "id": 6,
    "displayName": "Sapling",
    "name": "sapling",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "7": {
    "id": 7,
    "displayName": "Bedrock",
    "name": "bedrock",
    "hardness": null,
    "stackSize": 64,
    "diggable": false,
    "boundingBox": "block"
  },
  "8": {
    "id": 8,
    "displayName": "Water",
    "name": "water",
    "hardness": 100,
    "stackSize": 64,
    "diggable": false,
    "boundingBox": "empty"
  },
  "9": {
    "id": 9,
    "displayName": "Stationary Water",
    "name": "waterStationary",
    "hardness": 100,
    "stackSize": 64,
    "diggable": false,
    "boundingBox": "empty"
  },
  "10": {
    "id": 10,
    "displayName": "Lava",
    "name": "lava",
    "hardness": 0,
    "stackSize": 64,
    "diggable": false,
    "boundingBox": "empty"
  },
  "11": {
    "id": 11,
    "displayName": "Stationary Lava",
    "name": "lavaStationary",
    "hardness": 100,
    "stackSize": 64,
    "diggable": false,
    "boundingBox": "empty"
  },
  "12": {
    "id": 12,
    "displayName": "Sand",
    "name": "sand",
    "hardness": 0.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "dirt"
  },
  "13": {
    "id": 13,
    "displayName": "Gravel",
    "name": "gravel",
    "hardness": 0.6,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "dirt"
  },
  "14": {
    "id": 14,
    "displayName": "Gold Ore",
    "name": "oreGold",
    "hardness": 3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "257": true,
      "278": true
    }
  },
  "15": {
    "id": 15,
    "displayName": "Iron Ore",
    "name": "oreIron",
    "hardness": 3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "274": true,
      "257": true,
      "278": true
    }
  },
  "16": {
    "id": 16,
    "displayName": "Coal Ore",
    "name": "oreCoal",
    "hardness": 3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "17": {
    "id": 17,
    "displayName": "Wood",
    "name": "log",
    "hardness": 2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "18": {
    "id": 18,
    "displayName": "Leaves",
    "name": "leaves",
    "hardness": 0.2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "leaves"
  },
  "19": {
    "id": 19,
    "displayName": "Sponge",
    "name": "sponge",
    "hardness": 0.6,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "20": {
    "id": 20,
    "displayName": "Glass",
    "name": "glass",
    "hardness": 0.3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "21": {
    "id": 21,
    "displayName": "Lapis Lazuli Ore",
    "name": "oreLapis",
    "hardness": 3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "274": true,
      "257": true,
      "278": true
    }
  },
  "22": {
    "id": 22,
    "displayName": "Lapis Lazuli Block",
    "name": "blockLapis",
    "hardness": 3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "274": true,
      "257": true,
      "278": true
    }
  },
  "23": {
    "id": 23,
    "displayName": "Dispenser",
    "name": "dispenser",
    "hardness": 3.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "24": {
    "id": 24,
    "displayName": "Sandstone",
    "name": "sandStone",
    "hardness": 0.8,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "25": {
    "id": 25,
    "displayName": "Note Block",
    "name": "musicBlock",
    "hardness": 0.8,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "26": {
    "id": 26,
    "displayName": "Bed",
    "name": "bed",
    "hardness": 0.2,
    "stackSize": 1,
    "diggable": true,
    "boundingBox": "block"
  },
  "27": {
    "id": 27,
    "displayName": "Powered Rail",
    "name": "goldenRail",
    "hardness": 0.7,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty",
    "material": "rock"
  },
  "28": {
    "id": 28,
    "displayName": "Detector Rail",
    "name": "detectorRail",
    "hardness": 0.7,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty",
    "material": "rock"
  },
  "29": {
    "id": 29,
    "displayName": "Sticky Piston",
    "name": "pistonStickyBase",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "30": {
    "id": 30,
    "displayName": "Cobweb",
    "name": "web",
    "hardness": 4,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty",
    "material": "web",
    "harvestTools": {
      "359": true,
      "267": true,
      "268": true,
      "272": true,
      "276": true,
      "283": true
    }
  },
  "31": {
    "id": 31,
    "displayName": "Grass",
    "name": "tallgrass",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "32": {
    "id": 32,
    "displayName": "Dead Bush",
    "name": "deadbush",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "33": {
    "id": 33,
    "displayName": "Piston",
    "name": "pistonBase",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "34": {
    "id": 34,
    "name": "pistonExtension",
    "displayName": "Piston Extension",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "35": {
    "id": 35,
    "displayName": "Wool",
    "name": "cloth",
    "hardness": 0.8,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wool"
  },
  "36": {
    "id": 36,
    "name": "blockMovedByPiston",
    "displayName": "Block Moved by Piston",
    "hardness": 0,
    "stackSize": 64,
    "diggable": false,
    "boundingBox": "block"
  },
  "37": {
    "id": 37,
    "displayName": "Flower",
    "name": "flower",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "38": {
    "id": 38,
    "displayName": "Rose",
    "name": "rose",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "39": {
    "id": 39,
    "displayName": "Brown Mushroom",
    "name": "mushroomBrown",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "40": {
    "id": 40,
    "displayName": "Red Mushroom",
    "name": "mushroomRed",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "41": {
    "id": 41,
    "displayName": "Block of Gold",
    "name": "blockGold",
    "hardness": 3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "257": true,
      "278": true
    }
  },
  "42": {
    "id": 42,
    "displayName": "Block of Iron",
    "name": "blockIron",
    "hardness": 5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "274": true,
      "257": true,
      "278": true
    }
  },
  "43": {
    "id": 43,
    "displayName": "Double Stone Slab",
    "name": "stoneSlabDouble",
    "hardness": 2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "44": {
    "id": 44,
    "displayName": "Stone Slab",
    "name": "stoneSlab",
    "hardness": 2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "45": {
    "id": 45,
    "displayName": "Bricks",
    "name": "brick",
    "hardness": 2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "46": {
    "id": 46,
    "displayName": "TNT",
    "name": "tnt",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "47": {
    "id": 47,
    "displayName": "Bookshelf",
    "name": "bookshelf",
    "hardness": 1.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "48": {
    "id": 48,
    "displayName": "Moss Stone",
    "name": "stoneMoss",
    "hardness": 2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "49": {
    "id": 49,
    "displayName": "Obsidian",
    "name": "obsidian",
    "hardness": 50,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "278": true
    }
  },
  "50": {
    "id": 50,
    "displayName": "Torch",
    "name": "torch",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "51": {
    "id": 51,
    "displayName": "Fire",
    "name": "fire",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "52": {
    "id": 52,
    "displayName": "Monster Spawner",
    "name": "mobSpawner",
    "hardness": 5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "53": {
    "id": 53,
    "displayName": "Wooden Stairs",
    "name": "stairsWood",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "54": {
    "id": 54,
    "displayName": "Chest",
    "name": "chest",
    "hardness": 2.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "55": {
    "id": 55,
    "displayName": "Redstone Dust",
    "name": "redstoneDust",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "56": {
    "id": 56,
    "displayName": "Diamond Ore",
    "name": "oreDiamond",
    "hardness": 3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "257": true,
      "278": true
    }
  },
  "57": {
    "id": 57,
    "displayName": "Block of Diamond",
    "name": "blockDiamond",
    "hardness": 5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "257": true,
      "278": true
    }
  },
  "58": {
    "id": 58,
    "displayName": "Crafting Table",
    "name": "workbench",
    "hardness": 2.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "59": {
    "id": 59,
    "displayName": "Crops",
    "name": "crops",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "60": {
    "id": 60,
    "displayName": "Farmland",
    "name": "farmland",
    "hardness": 0.6,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "dirt"
  },
  "61": {
    "id": 61,
    "displayName": "Furnace",
    "name": "furnace",
    "hardness": 3.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "62": {
    "id": 62,
    "displayName": "Burning Furnace",
    "name": "furnaceBurning",
    "hardness": 3.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "63": {
    "id": 63,
    "displayName": "Sign Post",
    "name": "signPost",
    "hardness": 1,
    "stackSize": 1,
    "diggable": true,
    "boundingBox": "empty",
    "material": "wood"
  },
  "64": {
    "id": 64,
    "displayName": "Wooden Door",
    "name": "doorWood",
    "hardness": 3,
    "stackSize": 1,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "65": {
    "id": 65,
    "displayName": "Ladder",
    "name": "ladder",
    "hardness": 0.4,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "66": {
    "id": 66,
    "displayName": "Rail",
    "name": "rail",
    "hardness": 0.7,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty",
    "material": "rock"
  },
  "67": {
    "id": 67,
    "displayName": "Cobblestone Stairs",
    "name": "stairsStone",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "68": {
    "id": 68,
    "displayName": "Wall Sign",
    "name": "signWall",
    "hardness": 1,
    "stackSize": 1,
    "diggable": true,
    "boundingBox": "empty"
  },
  "69": {
    "id": 69,
    "displayName": "Lever",
    "name": "lever",
    "hardness": 0.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "70": {
    "id": 70,
    "displayName": "Stone Pressure Plate",
    "name": "stonePressurePlate",
    "hardness": 0.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "71": {
    "id": 71,
    "displayName": "Iron Door",
    "name": "doorIron",
    "hardness": 5,
    "stackSize": 1,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "72": {
    "id": 72,
    "displayName": "Wooden Pressure Plate",
    "name": "woodPressurePlate",
    "hardness": 0.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty",
    "material": "wood"
  },
  "73": {
    "id": 73,
    "displayName": "Redstone Ore",
    "name": "oreRedstone",
    "hardness": 3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "257": true,
      "278": true
    }
  },
  "74": {
    "id": 74,
    "displayName": "Glowing Redstone Ore",
    "name": "oreRedstoneGlowing",
    "hardness": 3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "257": true,
      "278": true
    }
  },
  "75": {
    "id": 75,
    "displayName": "Redstone Torch (Inactive)",
    "name": "notGateInactive",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "76": {
    "id": 76,
    "displayName": "Redstone Torch (Active)",
    "name": "notGateActive",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "77": {
    "id": 77,
    "displayName": "Stone Button",
    "name": "buttonStone",
    "hardness": 0.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "78": {
    "id": 78,
    "displayName": "Snow",
    "name": "snow",
    "hardness": 0.1,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty",
    "material": "dirt",
    "harvestTools": {
      "269": true,
      "273": true,
      "256": true,
      "277": true,
      "284": true
    }
  },
  "79": {
    "id": 79,
    "displayName": "Ice",
    "name": "ice",
    "hardness": 0.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock"
  },
  "80": {
    "id": 80,
    "displayName": "Snow Block",
    "name": "snowBlock",
    "hardness": 0.2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "dirt",
    "harvestTools": {
      "269": true,
      "273": true,
      "256": true,
      "277": true,
      "284": true
    }
  },
  "81": {
    "id": 81,
    "displayName": "Cactus",
    "name": "cactus",
    "hardness": 0.4,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "82": {
    "id": 82,
    "displayName": "Clay",
    "name": "clay",
    "hardness": 0.6,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "dirt"
  },
  "83": {
    "id": 83,
    "displayName": "Sugar cane",
    "name": "reeds",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "84": {
    "id": 84,
    "displayName": "Jukebox",
    "name": "jukebox",
    "hardness": 2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "85": {
    "id": 85,
    "displayName": "Fence",
    "name": "fence",
    "hardness": 2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "86": {
    "id": 86,
    "displayName": "Pumpkin",
    "name": "pumpkin",
    "hardness": 1,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "plant"
  },
  "87": {
    "id": 87,
    "displayName": "Netherrack",
    "name": "hellrock",
    "hardness": 0.4,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "88": {
    "id": 88,
    "displayName": "Soul Sand",
    "name": "hellsand",
    "hardness": 0.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "dirt"
  },
  "89": {
    "id": 89,
    "displayName": "Glowstone",
    "name": "lightgem",
    "hardness": 0.3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "90": {
    "id": 90,
    "displayName": "Portal",
    "name": "portal",
    "hardness": null,
    "stackSize": 64,
    "diggable": false,
    "boundingBox": "empty"
  },
  "91": {
    "id": 91,
    "displayName": "Jack 'o' Lantern",
    "name": "litpumpkin",
    "hardness": 1,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "plant"
  },
  "92": {
    "id": 92,
    "displayName": "Cake",
    "name": "cake",
    "hardness": 0.5,
    "stackSize": 1,
    "diggable": true,
    "boundingBox": "block"
  },
  "93": {
    "id": 93,
    "displayName": "Redstone Repeater (Inactive)",
    "name": "redstoneRepeaterInactive",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "94": {
    "id": 94,
    "displayName": "Redstone Repeater (Active)",
    "name": "redstoneRepeaterActive",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "95": {
    "id": 95,
    "displayName": "Locked chest",
    "name": "lockedchest",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "96": {
    "id": 96,
    "displayName": "Trapdoor",
    "name": "trapdoor",
    "hardness": 3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "97": {
    "id": 97,
    "displayName": "Monster Egg",
    "name": "monsterStoneEgg",
    "hardness": 0.75,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "98": {
    "id": 98,
    "displayName": "Stone Brick",
    "name": "stonebricksmooth",
    "hardness": 1.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "99": {
    "id": 99,
    "displayName": "Huge Brown Mushroom",
    "name": "mushroomHugeBrown",
    "hardness": 0.2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "100": {
    "id": 100,
    "displayName": "Huge Red Mushroom",
    "name": "mushroomHugeRed",
    "hardness": 0.2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "101": {
    "id": 101,
    "displayName": "Iron Bars",
    "name": "fenceIron",
    "hardness": 5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "102": {
    "id": 102,
    "displayName": "Glass Pane",
    "name": "thinGlass",
    "hardness": 0.3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "103": {
    "id": 103,
    "displayName": "Melon",
    "name": "melon",
    "hardness": 1,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "melon"
  },
  "104": {
    "id": 104,
    "displayName": "Pumpkin Stem",
    "name": "pumpkinStem",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "105": {
    "id": 105,
    "displayName": "Melon Stem",
    "name": "melonStem",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "106": {
    "id": 106,
    "displayName": "Vines",
    "name": "vine",
    "hardness": 0.2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty",
    "material": "plant"
  },
  "107": {
    "id": 107,
    "displayName": "Fence Gate",
    "name": "fenceGate",
    "hardness": 2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "108": {
    "id": 108,
    "displayName": "Brick Stairs",
    "name": "stairsBrick",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "109": {
    "id": 109,
    "displayName": "Stone Brick Stairs",
    "name": "stairsStoneBrickSmooth",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "110": {
    "id": 110,
    "displayName": "Mycelium",
    "name": "mycel",
    "hardness": 0.6,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "dirt"
  },
  "111": {
    "id": 111,
    "displayName": "Lily Pad",
    "name": "waterlily",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "112": {
    "id": 112,
    "displayName": "Nether Brick",
    "name": "netherBrick",
    "hardness": 2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "113": {
    "id": 113,
    "displayName": "Nether Brick Fence",
    "name": "netherFence",
    "hardness": 2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "114": {
    "id": 114,
    "displayName": "Nether Brick Stairs",
    "name": "stairsNetherBrick",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "115": {
    "id": 115,
    "displayName": "Nether Wart",
    "name": "netherStalk",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "116": {
    "id": 116,
    "displayName": "Enchantment Table",
    "name": "enchantmentTable",
    "hardness": 5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "117": {
    "id": 117,
    "displayName": "Brewing Stand",
    "name": "brewingStand",
    "hardness": 0.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "118": {
    "id": 118,
    "displayName": "Cauldron",
    "name": "cauldron",
    "hardness": 2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "119": {
    "id": 119,
    "name": "endPortal",
    "displayName": "End Portal",
    "hardness": null,
    "stackSize": 64,
    "diggable": false,
    "boundingBox": "empty"
  },
  "120": {
    "id": 120,
    "displayName": "End Portal Frame",
    "name": "endPortalFrame",
    "hardness": null,
    "stackSize": 64,
    "diggable": false,
    "boundingBox": "block"
  },
  "121": {
    "id": 121,
    "displayName": "End Stone",
    "name": "whiteStone",
    "hardness": 3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "122": {
    "id": 122,
    "displayName": "Dragon Egg",
    "name": "dragonEgg",
    "hardness": 3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "123": {
    "id": 123,
    "displayName": "Redstone Lamp (Inactive)",
    "name": "redstoneLightInactive",
    "hardness": 0.3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "124": {
    "id": 124,
    "displayName": "Redstone Lamp (Active)",
    "name": "redstoneLightActive",
    "hardness": 0.3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "125": {
    "id": 125,
    "displayName": "Wooden Double Slab",
    "name": "woodSlabDouble",
    "hardness": 2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "126": {
    "id": 126,
    "displayName": "Wooden Slab",
    "name": "woodSlab",
    "hardness": 2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "127": {
    "id": 127,
    "displayName": "Cocoa Pod",
    "name": "cocoa",
    "hardness": 0.2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "plant"
  },
  "128": {
    "id": 128,
    "displayName": "Sandstone Stairs",
    "name": "stairsSandStone",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "129": {
    "id": 129,
    "displayName": "Emerald Ore",
    "name": "oreEmerald",
    "hardness": 3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "257": true,
      "278": true
    }
  },
  "130": {
    "id": 130,
    "displayName": "Ender Chest",
    "name": "enderChest",
    "hardness": 22.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "131": {
    "id": 131,
    "displayName": "Tripwire Hook",
    "name": "tripWireSource",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "132": {
    "id": 132,
    "displayName": "Tripwire",
    "name": "tripWire",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "133": {
    "id": 133,
    "displayName": "Block of Emerald",
    "name": "blockEmerald",
    "hardness": 5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "257": true,
      "278": true
    }
  },
  "134": {
    "id": 134,
    "displayName": "Spruce Wood Stairs",
    "name": "stairsWoodSpruce",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "135": {
    "id": 135,
    "displayName": "Birch Wood Stairs",
    "name": "stairsWoodBirch",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "136": {
    "id": 136,
    "displayName": "Jungle Wood Stairs",
    "name": "stairsWoodJungle",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "137": {
    "id": 137,
    "displayName": "Command Block",
    "name": "commandBlock",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "138": {
    "id": 138,
    "displayName": "Beacon",
    "name": "beacon",
    "hardness": 3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "139": {
    "id": 139,
    "displayName": "Cobblestone Wall",
    "name": "cobbleWall",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "140": {
    "id": 140,
    "displayName": "Flower Pot",
    "name": "flowerPot",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "141": {
    "id": 141,
    "displayName": "Carrots",
    "name": "carrots",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "142": {
    "id": 142,
    "displayName": "Potatoes",
    "name": "potatoes",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "143": {
    "id": 143,
    "displayName": "Wooden Button",
    "name": "buttonWood",
    "hardness": 0.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty"
  },
  "144": {
    "id": 144,
    "displayName": "Mob Head",
    "name": "skull",
    "hardness": 1,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "145": {
    "id": 145,
    "displayName": "Anvil",
    "name": "anvil",
    "hardness": 5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "146": {
    "id": 146,
    "displayName": "Trapped Chest",
    "name": "trappedChest",
    "hardness": 2.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "147": {
    "id": 147,
    "displayName": "Weighted Pressure plate (Light)",
    "name": "pressurePlateWeightedLight",
    "hardness": 0.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "148": {
    "id": 148,
    "displayName": "Weighted Pressure plate (Heavy)",
    "name": "pressurePlateWeightedHeavy",
    "hardness": 0.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "149": {
    "id": 149,
    "displayName": "Redstone Comparator (Inactive)",
    "name": "redstoneComparatorInactive",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "150": {
    "id": 150,
    "displayName": "Redstone Comparator (Active)",
    "name": "redstoneComparatorActive",
    "hardness": 0,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block"
  },
  "151": {
    "id": 151,
    "displayName": "Daylight Sensor",
    "name": "daylightSensor",
    "hardness": 0.2,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "wood"
  },
  "152": {
    "id": 152,
    "displayName": "Block of Redstone",
    "name": "redstoneBlock",
    "hardness": 5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "153": {
    "id": 153,
    "displayName": "Nether Quartz Ore",
    "name": "netherQuartzOre",
    "hardness": 3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "154": {
    "id": 154,
    "displayName": "Hopper",
    "name": "hopper",
    "hardness": 3,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "155": {
    "id": 155,
    "displayName": "Block of Quartz",
    "name": "quartzBlock",
    "hardness": 0.8,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "156": {
    "id": 156,
    "displayName": "Quartz Stairs",
    "name": "quartzStairs",
    "hardness": 0.8,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  },
  "157": {
    "id": 157,
    "displayName": "Activator Rail",
    "name": "activatorRail",
    "hardness": 0.7,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "empty",
    "material": "rock"
  },
  "158": {
    "id": 158,
    "displayName": "Dropper",
    "name": "dropper",
    "hardness": 3.5,
    "stackSize": 64,
    "diggable": true,
    "boundingBox": "block",
    "material": "rock",
    "harvestTools": {
      "270": true,
      "274": true,
      "257": true,
      "278": true,
      "285": true
    }
  }
}

},{}],18:[function(require,module,exports){
module.exports={
  "0": {
    "id": 0,
    "name": "harp"
  },
  "1": {
    "id": 1,
    "name": "doubleBass"
  },
  "2": {
    "id": 2,
    "name": "snareDrum"
  },
  "3": {
    "id": 3,
    "name": "sticks"
  },
  "4": {
    "id": 4,
    "name": "bassDrum"
  }
}

},{}],19:[function(require,module,exports){
module.exports={
  "256": {
    "id": 256,
    "displayName": "Iron Shovel",
    "stackSize": 1,
    "name": "shovelIron"
  },
  "257": {
    "id": 257,
    "displayName": "Iron Pickaxe",
    "stackSize": 1,
    "name": "pickaxeIron"
  },
  "258": {
    "id": 258,
    "displayName": "Iron Axe",
    "stackSize": 1,
    "name": "hatchetIron"
  },
  "259": {
    "id": 259,
    "displayName": "Flint and Steel",
    "stackSize": 1,
    "name": "flintAndSteel"
  },
  "260": {
    "id": 260,
    "displayName": "Apple",
    "stackSize": 64,
    "name": "apple"
  },
  "261": {
    "id": 261,
    "displayName": "Bow",
    "stackSize": 1,
    "name": "bow"
  },
  "262": {
    "id": 262,
    "displayName": "Arrow",
    "stackSize": 64,
    "name": "arrow"
  },
  "263": {
    "id": 263,
    "displayName": "Coal",
    "stackSize": 64,
    "name": "coal"
  },
  "264": {
    "id": 264,
    "displayName": "Diamond",
    "stackSize": 64,
    "name": "diamond"
  },
  "265": {
    "id": 265,
    "displayName": "Iron Ingot",
    "stackSize": 64,
    "name": "ingotIron"
  },
  "266": {
    "id": 266,
    "displayName": "Gold Ingot",
    "stackSize": 64,
    "name": "ingotGold"
  },
  "267": {
    "id": 267,
    "displayName": "Iron Sword",
    "stackSize": 1,
    "name": "swordIron"
  },
  "268": {
    "id": 268,
    "displayName": "Wooden Sword",
    "stackSize": 1,
    "name": "swordWood"
  },
  "269": {
    "id": 269,
    "displayName": "Wooden Shovel",
    "stackSize": 1,
    "name": "shovelWood"
  },
  "270": {
    "id": 270,
    "displayName": "Wooden Pickaxe",
    "stackSize": 1,
    "name": "pickaxeWood"
  },
  "271": {
    "id": 271,
    "displayName": "Wooden Axe",
    "stackSize": 1,
    "name": "hatchetWood"
  },
  "272": {
    "id": 272,
    "displayName": "Stone Sword",
    "stackSize": 1,
    "name": "swordStone"
  },
  "273": {
    "id": 273,
    "displayName": "Stone Shovel",
    "stackSize": 1,
    "name": "shovelStone"
  },
  "274": {
    "id": 274,
    "displayName": "Stone Pickaxe",
    "stackSize": 1,
    "name": "pickaxeStone"
  },
  "275": {
    "id": 275,
    "displayName": "Stone Axe",
    "stackSize": 1,
    "name": "hatchetStone"
  },
  "276": {
    "id": 276,
    "displayName": "Diamond Sword",
    "stackSize": 1,
    "name": "swordDiamond"
  },
  "277": {
    "id": 277,
    "displayName": "Diamond Shovel",
    "stackSize": 1,
    "name": "shovelDiamond"
  },
  "278": {
    "id": 278,
    "displayName": "Diamond Pickaxe",
    "stackSize": 1,
    "name": "pickaxeDiamond"
  },
  "279": {
    "id": 279,
    "displayName": "Diamond Axe",
    "stackSize": 1,
    "name": "hatchetDiamond"
  },
  "280": {
    "id": 280,
    "displayName": "Stick",
    "stackSize": 64,
    "name": "stick"
  },
  "281": {
    "id": 281,
    "displayName": "Bowl",
    "stackSize": 64,
    "name": "bowl"
  },
  "282": {
    "id": 282,
    "displayName": "Mushroom Stew",
    "stackSize": 64,
    "name": "mushroomStew"
  },
  "283": {
    "id": 283,
    "displayName": "Golden Sword",
    "stackSize": 1,
    "name": "swordGold"
  },
  "284": {
    "id": 284,
    "displayName": "Golden Shovel",
    "stackSize": 1,
    "name": "shovelGold"
  },
  "285": {
    "id": 285,
    "displayName": "Golden Pickaxe",
    "stackSize": 1,
    "name": "pickaxeGold"
  },
  "286": {
    "id": 286,
    "displayName": "Golden Axe",
    "stackSize": 1,
    "name": "hatchetGold"
  },
  "287": {
    "id": 287,
    "displayName": "String",
    "stackSize": 64,
    "name": "string"
  },
  "288": {
    "id": 288,
    "displayName": "Feather",
    "stackSize": 64,
    "name": "feather"
  },
  "289": {
    "id": 289,
    "displayName": "Gunpowder",
    "stackSize": 64,
    "name": "sulphur"
  },
  "290": {
    "id": 290,
    "displayName": "Wooden Hoe",
    "stackSize": 1,
    "name": "hoeWood"
  },
  "291": {
    "id": 291,
    "displayName": "Stone Hoe",
    "stackSize": 1,
    "name": "hoeStone"
  },
  "292": {
    "id": 292,
    "displayName": "Iron Hoe",
    "stackSize": 1,
    "name": "hoeIron"
  },
  "293": {
    "id": 293,
    "displayName": "Diamond Hoe",
    "stackSize": 1,
    "name": "hoeDiamond"
  },
  "294": {
    "id": 294,
    "displayName": "Golden Hoe",
    "stackSize": 1,
    "name": "hoeGold"
  },
  "295": {
    "id": 295,
    "displayName": "Seeds",
    "stackSize": 64,
    "name": "seeds"
  },
  "296": {
    "id": 296,
    "displayName": "Wheat",
    "stackSize": 64,
    "name": "wheat"
  },
  "297": {
    "id": 297,
    "displayName": "Bread",
    "stackSize": 64,
    "name": "bread"
  },
  "298": {
    "id": 298,
    "displayName": "Leather Cap",
    "stackSize": 1,
    "name": "helmetCloth"
  },
  "299": {
    "id": 299,
    "displayName": "Leather Tunic",
    "stackSize": 1,
    "name": "chestplateCloth"
  },
  "300": {
    "id": 300,
    "displayName": "Leather Pants",
    "stackSize": 1,
    "name": "leggingsCloth"
  },
  "301": {
    "id": 301,
    "displayName": "Leather Boots",
    "stackSize": 1,
    "name": "bootsCloth"
  },
  "302": {
    "id": 302,
    "displayName": "Chain Helmet",
    "stackSize": 1,
    "name": "helmetChain"
  },
  "303": {
    "id": 303,
    "displayName": "Chain Chestplate",
    "stackSize": 1,
    "name": "chestplateChain"
  },
  "304": {
    "id": 304,
    "displayName": "Chain Leggings",
    "stackSize": 1,
    "name": "leggingsChain"
  },
  "305": {
    "id": 305,
    "displayName": "Chain Boots",
    "stackSize": 1,
    "name": "bootsChain"
  },
  "306": {
    "id": 306,
    "displayName": "Iron Helmet",
    "stackSize": 1,
    "name": "helmetIron"
  },
  "307": {
    "id": 307,
    "displayName": "Iron Chestplate",
    "stackSize": 1,
    "name": "chestplateIron"
  },
  "308": {
    "id": 308,
    "displayName": "Iron Leggings",
    "stackSize": 1,
    "name": "leggingsIron"
  },
  "309": {
    "id": 309,
    "displayName": "Iron Boots",
    "stackSize": 1,
    "name": "bootsIron"
  },
  "310": {
    "id": 310,
    "displayName": "Diamond Helmet",
    "stackSize": 1,
    "name": "helmetDiamond"
  },
  "311": {
    "id": 311,
    "displayName": "Diamond Chestplate",
    "stackSize": 1,
    "name": "chestplateDiamond"
  },
  "312": {
    "id": 312,
    "displayName": "Diamond Leggings",
    "stackSize": 1,
    "name": "leggingsDiamond"
  },
  "313": {
    "id": 313,
    "displayName": "Diamond Boots",
    "stackSize": 1,
    "name": "bootsDiamond"
  },
  "314": {
    "id": 314,
    "displayName": "Golden Helmet",
    "stackSize": 1,
    "name": "helmetGold"
  },
  "315": {
    "id": 315,
    "displayName": "Golden Chestplate",
    "stackSize": 1,
    "name": "chestplateGold"
  },
  "316": {
    "id": 316,
    "displayName": "Golden Leggings",
    "stackSize": 1,
    "name": "leggingsGold"
  },
  "317": {
    "id": 317,
    "displayName": "Golden Boots",
    "stackSize": 1,
    "name": "bootsGold"
  },
  "318": {
    "id": 318,
    "displayName": "Flint",
    "stackSize": 64,
    "name": "flint"
  },
  "319": {
    "id": 319,
    "displayName": "Raw Porkchop",
    "stackSize": 64,
    "name": "porkchopRaw"
  },
  "320": {
    "id": 320,
    "displayName": "Cooked Porkchop",
    "stackSize": 64,
    "name": "porkchopCooked"
  },
  "321": {
    "id": 321,
    "displayName": "Painting",
    "stackSize": 64,
    "name": "painting"
  },
  "322": {
    "id": 322,
    "displayName": "Golden Apple",
    "stackSize": 64,
    "name": "appleGold"
  },
  "323": {
    "id": 323,
    "displayName": "Sign",
    "stackSize": 1,
    "name": "sign"
  },
  "324": {
    "id": 324,
    "displayName": "Wooden Door",
    "stackSize": 1,
    "name": "doorWood"
  },
  "325": {
    "id": 325,
    "displayName": "Bucket",
    "name": "bucket",
    "stackSize": 16
  },
  "326": {
    "id": 326,
    "displayName": "Water Bucket",
    "stackSize": 1,
    "name": "bucketWater"
  },
  "327": {
    "id": 327,
    "displayName": "Lava Bucket",
    "stackSize": 1,
    "name": "bucketLava"
  },
  "328": {
    "id": 328,
    "displayName": "Minecart",
    "stackSize": 1,
    "name": "minecart"
  },
  "329": {
    "id": 329,
    "displayName": "Saddle",
    "stackSize": 1,
    "name": "saddle"
  },
  "330": {
    "id": 330,
    "displayName": "Iron Door",
    "stackSize": 1,
    "name": "doorIron"
  },
  "331": {
    "id": 331,
    "displayName": "Redstone",
    "stackSize": 64,
    "name": "redstone"
  },
  "332": {
    "id": 332,
    "displayName": "Snowball",
    "stackSize": 16,
    "name": "snowball"
  },
  "333": {
    "id": 333,
    "displayName": "Boat",
    "stackSize": 1,
    "name": "boat"
  },
  "334": {
    "id": 334,
    "displayName": "Leather",
    "stackSize": 64,
    "name": "leather"
  },
  "335": {
    "id": 335,
    "displayName": "Milk",
    "stackSize": 1,
    "name": "milk"
  },
  "336": {
    "id": 336,
    "displayName": "Brick",
    "stackSize": 64,
    "name": "brick"
  },
  "337": {
    "id": 337,
    "displayName": "Clay",
    "stackSize": 64,
    "name": "clay"
  },
  "338": {
    "id": 338,
    "displayName": "Sugar Canes",
    "stackSize": 64,
    "name": "reeds"
  },
  "339": {
    "id": 339,
    "displayName": "Paper",
    "stackSize": 64,
    "name": "paper"
  },
  "340": {
    "id": 340,
    "displayName": "Book",
    "stackSize": 64,
    "name": "book"
  },
  "341": {
    "id": 341,
    "displayName": "Slimeball",
    "stackSize": 64,
    "name": "slimeball"
  },
  "342": {
    "id": 342,
    "displayName": "Minecart with Chest",
    "stackSize": 1,
    "name": "minecartChest"
  },
  "343": {
    "id": 343,
    "displayName": "Minecart with Furnace",
    "stackSize": 1,
    "name": "minecartFurnace"
  },
  "344": {
    "id": 344,
    "displayName": "Egg",
    "stackSize": 16,
    "name": "egg"
  },
  "345": {
    "id": 345,
    "displayName": "Compass",
    "stackSize": 64,
    "name": "compass"
  },
  "346": {
    "id": 346,
    "displayName": "Fishing Rod",
    "stackSize": 1,
    "name": "fishingRod"
  },
  "347": {
    "id": 347,
    "displayName": "Clock",
    "stackSize": 64,
    "name": "clock"
  },
  "348": {
    "id": 348,
    "displayName": "Glowstone Dust",
    "stackSize": 64,
    "name": "yellowDust"
  },
  "349": {
    "id": 349,
    "displayName": "Raw Fish",
    "stackSize": 64,
    "name": "fishRaw"
  },
  "350": {
    "id": 350,
    "displayName": "Cooked Fish",
    "stackSize": 64,
    "name": "fishCooked"
  },
  "351": {
    "id": 351,
    "stackSize": 64,
    "displayName": "Dye",
    "name": "dyePowder"
  },
  "352": {
    "id": 352,
    "displayName": "Bone",
    "stackSize": 64,
    "name": "bone"
  },
  "353": {
    "id": 353,
    "displayName": "Sugar",
    "stackSize": 64,
    "name": "sugar"
  },
  "354": {
    "id": 354,
    "displayName": "Cake",
    "name": "cake",
    "stackSize": 1
  },
  "355": {
    "id": 355,
    "displayName": "Bed",
    "name": "bed",
    "stackSize": 1
  },
  "356": {
    "id": 356,
    "displayName": "Redstone Repeater",
    "stackSize": 64,
    "name": "diode"
  },
  "357": {
    "id": 357,
    "displayName": "Cookie",
    "stackSize": 8,
    "name": "cookie"
  },
  "358": {
    "id": 358,
    "displayName": "Map",
    "stackSize": 1,
    "name": "map"
  },
  "359": {
    "id": 359,
    "displayName": "Shears",
    "stackSize": 1,
    "name": "shears"
  },
  "360": {
    "id": 360,
    "displayName": "Melon",
    "stackSize": 64,
    "name": "melon"
  },
  "361": {
    "id": 361,
    "displayName": "Pumpkin Seeds",
    "stackSize": 64,
    "name": "seeds_pumpkin"
  },
  "362": {
    "id": 362,
    "displayName": "Melon Seeds",
    "stackSize": 64,
    "name": "seeds_melon"
  },
  "363": {
    "id": 363,
    "displayName": "Raw Beef",
    "stackSize": 64,
    "name": "beefRaw"
  },
  "364": {
    "id": 364,
    "displayName": "Steak",
    "stackSize": 64,
    "name": "beefCooked"
  },
  "365": {
    "id": 365,
    "displayName": "Raw Chicken",
    "stackSize": 64,
    "name": "chickenRaw"
  },
  "366": {
    "id": 366,
    "displayName": "Cooked Chicken",
    "stackSize": 64,
    "name": "chickenCooked"
  },
  "367": {
    "id": 367,
    "displayName": "Rotten Flesh",
    "stackSize": 64,
    "name": "rottenFlesh"
  },
  "368": {
    "id": 368,
    "displayName": "Ender Pearl",
    "stackSize": 64,
    "name": "enderPearl"
  },
  "369": {
    "id": 369,
    "displayName": "Blaze Rod",
    "stackSize": 64,
    "name": "blazeRod"
  },
  "370": {
    "id": 370,
    "displayName": "Ghast Tear",
    "stackSize": 64,
    "name": "ghastTear"
  },
  "371": {
    "id": 371,
    "displayName": "Gold Nugget",
    "stackSize": 64,
    "name": "goldNugget"
  },
  "372": {
    "id": 372,
    "displayName": "Nether Wart",
    "stackSize": 64,
    "name": "netherStalkSeeds"
  },
  "373": {
    "id": 373,
    "displayName": "Potion",
    "stackSize": 1,
    "name": "potion"
  },
  "374": {
    "id": 374,
    "displayName": "Glass Bottle",
    "stackSize": 64,
    "name": "glassBottle"
  },
  "375": {
    "id": 375,
    "displayName": "Spider Eye",
    "stackSize": 64,
    "name": "spiderEye"
  },
  "376": {
    "id": 376,
    "displayName": "Fermented Spider Eye",
    "stackSize": 64,
    "name": "fermentedSpiderEye"
  },
  "377": {
    "id": 377,
    "displayName": "Blaze Powder",
    "stackSize": 64,
    "name": "blazePowder"
  },
  "378": {
    "id": 378,
    "displayName": "Magma Cream",
    "stackSize": 64,
    "name": "magmaCream"
  },
  "379": {
    "id": 379,
    "displayName": "Brewing Stand",
    "stackSize": 64,
    "name": "brewingStand"
  },
  "380": {
    "id": 380,
    "displayName": "Cauldron",
    "stackSize": 1,
    "name": "cauldron"
  },
  "381": {
    "id": 381,
    "displayName": "Eye of Ender",
    "stackSize": 1,
    "name": "eyeOfEnder"
  },
  "382": {
    "id": 382,
    "displayName": "Glistering Melon",
    "stackSize": 64,
    "name": "speckledMelon"
  },
  "383": {
    "id": 383,
    "displayName": "Spawn",
    "stackSize": 64,
    "name": "monsterPlacer"
  },
  "384": {
    "id": 384,
    "displayName": "Bottle o' Enchanting",
    "stackSize": 64,
    "name": "expBottle"
  },
  "385": {
    "id": 385,
    "displayName": "Fire Charge",
    "stackSize": 64,
    "name": "fireball"
  },
  "386": {
    "id": 386,
    "displayName": "Book and Quill",
    "stackSize": 1,
    "name": "writingBook"
  },
  "387": {
    "id": 387,
    "displayName": "Written Book",
    "stackSize": 1,
    "name": "writtenBook"
  },
  "388": {
    "id": 388,
    "displayName": "Emerald",
    "stackSize": 64,
    "name": "emerald"
  },
  "389": {
    "id": 389,
    "displayName": "Item Frame",
    "stackSize": 64,
    "name": "frame"
  },
  "390": {
    "id": 390,
    "displayName": "Flower Pot",
    "stackSize": 64,
    "name": "flowerPot"
  },
  "391": {
    "id": 391,
    "displayName": "Carrot",
    "stackSize": 64,
    "name": "carrots"
  },
  "392": {
    "id": 392,
    "displayName": "Potato",
    "stackSize": 64,
    "name": "potato"
  },
  "393": {
    "id": 393,
    "displayName": "Baked Potato",
    "stackSize": 64,
    "name": "potatoBaked"
  },
  "394": {
    "id": 394,
    "displayName": "Poisonous Potato",
    "stackSize": 64,
    "name": "potatoPoisonous"
  },
  "395": {
    "id": 395,
    "displayName": "Empty Map",
    "stackSize": 64,
    "name": "emptyMap"
  },
  "396": {
    "id": 396,
    "displayName": "Golden Carrot",
    "stackSize": 64,
    "name": "carrotGolden"
  },
  "397": {
    "id": 397,
    "stackSize": 64,
    "displayName": "Mob Head",
    "name": "skull"
  },
  "398": {
    "id": 398,
    "displayName": "Carrot on a Stick",
    "stackSize": 64,
    "name": "carrotOnAStick"
  },
  "399": {
    "id": 399,
    "displayName": "Nether Star",
    "stackSize": 64,
    "name": "netherStar"
  },
  "400": {
    "id": 400,
    "displayName": "Pumpkin Pie",
    "stackSize": 64,
    "name": "pumpkinPie"
  },
  "401": {
    "id": 401,
    "displayName": "Firework Rocket",
    "stackSize": 64,
    "name": "fireworks"
  },
  "402": {
    "id": 402,
    "displayName": "Firework Star",
    "stackSize": 64,
    "name": "fireworksCharge"
  },
  "403": {
    "id": 403,
    "displayName": "Enchanted Book",
    "name": "enchantedBook",
    "stackSize": 1
  },
  "2256": {
    "id": 2256,
    "displayName": "13 Disc",
    "stackSize": 1,
    "name": "record13"
  },
  "2257": {
    "id": 2257,
    "displayName": "Cat Disc",
    "stackSize": 1,
    "name": "recordCat"
  },
  "2258": {
    "id": 2258,
    "displayName": "Blocks Disc",
    "stackSize": 1,
    "name": "recordBlocks"
  },
  "2259": {
    "id": 2259,
    "displayName": "Chirp Disc",
    "stackSize": 1,
    "name": "recordChirp"
  },
  "2260": {
    "id": 2260,
    "displayName": "Far Disc",
    "stackSize": 1,
    "name": "recordFar"
  },
  "2261": {
    "id": 2261,
    "displayName": "Mall Disc",
    "stackSize": 1,
    "name": "recordMall"
  },
  "2262": {
    "id": 2262,
    "displayName": "Mellohi Disc",
    "stackSize": 1,
    "name": "recordMellohi"
  },
  "2263": {
    "id": 2263,
    "displayName": "Stal Disc",
    "stackSize": 1,
    "name": "recordStal"
  },
  "2264": {
    "id": 2264,
    "displayName": "Strad Disc",
    "stackSize": 1,
    "name": "recordStrad"
  },
  "2265": {
    "id": 2265,
    "displayName": "Ward Disc",
    "stackSize": 1,
    "name": "recordWard"
  },
  "2266": {
    "id": 2266,
    "displayName": "11 Disc",
    "stackSize": 1,
    "name": "record11"
  },
  "2267": {
    "id": 2267,
    "displayName": "Wait Disc",
    "stackSize": 1,
    "name": "recordWait"
  }
}

},{}],20:[function(require,module,exports){
module.exports={
  "rock": {
    "257": 6,
    "270": 2,
    "274": 4,
    "278": 8,
    "285": 12
  },
  "wood": {
    "258": 6,
    "271": 2,
    "275": 4,
    "279": 8,
    "286": 12
  },
  "plant": {
    "258": 6,
    "267": 1.5,
    "268": 1.5,
    "271": 2,
    "272": 1.5,
    "275": 4,
    "276": 1.5,
    "279": 8,
    "283": 1.5,
    "286": 12
  },
  "melon": {
    "267": 1.5,
    "268": 1.5,
    "272": 1.5,
    "276": 1.5,
    "283": 1.5
  },
  "leaves": {
    "267": 1.5,
    "268": 1.5,
    "272": 1.5,
    "276": 1.5,
    "283": 1.5,
    "359": 6
  },
  "dirt": {
    "256": 6,
    "269": 2,
    "273": 4,
    "277": 8,
    "284": 12
  },
  "web": {
    "267": 15,
    "268": 15,
    "272": 15,
    "276": 15,
    "283": 15,
    "359": 15
  },
  "wool": {
    "359": 4.8
  }
}
},{}],21:[function(require,module,exports){
module.exports={
  "5": [
    {
      "type": 5,
      "count": 4,
      "metadata": 0,
      "ingredients": [
        {
          "id": 17,
          "metadata": 0
        }
      ]
    },
    {
      "type": 5,
      "count": 4,
      "metadata": 1,
      "ingredients": [
        {
          "id": 17,
          "metadata": 1
        }
      ]
    },
    {
      "type": 5,
      "count": 4,
      "metadata": 2,
      "ingredients": [
        {
          "id": 17,
          "metadata": 2
        }
      ]
    },
    {
      "type": 5,
      "count": 4,
      "metadata": 3,
      "ingredients": [
        {
          "id": 17,
          "metadata": 3
        }
      ]
    }
  ],
  "23": [
    {
      "type": 23,
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          4,
          4,
          4
        ],
        [
          4,
          261,
          4
        ],
        [
          4,
          331,
          4
        ]
      ]
    }
  ],
  "24": [
    {
      "count": 4,
      "metadata": 2,
      "inShape": [
        [
          24,
          24
        ],
        [
          24,
          24
        ]
      ],
      "type": 24
    },
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          12,
          12
        ],
        [
          12,
          12
        ]
      ],
      "type": 24
    }
  ],
  "25": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          5,
          5,
          5
        ],
        [
          5,
          331,
          5
        ],
        [
          5,
          5,
          5
        ]
      ],
      "type": 25
    }
  ],
  "27": [
    {
      "count": 6,
      "metadata": 0,
      "inShape": [
        [
          266,
          null,
          266
        ],
        [
          266,
          280,
          266
        ],
        [
          266,
          331,
          266
        ]
      ],
      "type": 27
    }
  ],
  "28": [
    {
      "count": 6,
      "metadata": 0,
      "inShape": [
        [
          265,
          null,
          265
        ],
        [
          265,
          70,
          265
        ],
        [
          265,
          331,
          265
        ]
      ],
      "type": 28
    }
  ],
  "29": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          341
        ],
        [
          33
        ]
      ],
      "type": 29
    }
  ],
  "33": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          5,
          5,
          5
        ],
        [
          4,
          265,
          4
        ],
        [
          4,
          331,
          4
        ]
      ],
      "type": 33
    }
  ],
  "35": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          287,
          287
        ],
        [
          287,
          287
        ]
      ],
      "type": 35
    }
  ],
  "41": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          266,
          266,
          266
        ],
        [
          266,
          266,
          266
        ],
        [
          266,
          266,
          266
        ]
      ],
      "type": 41
    }
  ],
  "42": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          265,
          265,
          265
        ],
        [
          265,
          265,
          265
        ],
        [
          265,
          265,
          265
        ]
      ],
      "type": 42
    }
  ],
  "44": [
    {
      "count": 6,
      "metadata": 5,
      "inShape": [
        [
          98,
          98,
          98
        ]
      ],
      "type": 44
    },
    {
      "count": 6,
      "metadata": 4,
      "inShape": [
        [
          45,
          45,
          45
        ]
      ],
      "type": 44
    },
    {
      "count": 6,
      "metadata": 1,
      "inShape": [
        [
          24,
          24,
          24
        ]
      ],
      "type": 44
    },
    {
      "count": 6,
      "metadata": 0,
      "inShape": [
        [
          1,
          1,
          1
        ]
      ],
      "type": 44
    },
    {
      "count": 6,
      "metadata": 3,
      "inShape": [
        [
          4,
          4,
          4
        ]
      ],
      "type": 44
    }
  ],
  "45": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          336,
          336
        ],
        [
          336,
          336
        ]
      ],
      "type": 45
    }
  ],
  "46": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          289,
          12,
          289
        ],
        [
          12,
          289,
          12
        ],
        [
          289,
          12,
          289
        ]
      ],
      "type": 46
    }
  ],
  "47": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          5,
          5,
          5
        ],
        [
          340,
          340,
          340
        ],
        [
          5,
          5,
          5
        ]
      ],
      "type": 47
    }
  ],
  "50": [
    {
      "count": 4,
      "metadata": 0,
      "inShape": [
        [
          263
        ],
        [
          280
        ]
      ],
      "type": 50
    }
  ],
  "54": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          5,
          5,
          5
        ],
        [
          5,
          null,
          5
        ],
        [
          5,
          5,
          5
        ]
      ],
      "type": 54
    }
  ],
  "57": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          264,
          264,
          264
        ],
        [
          264,
          264,
          264
        ],
        [
          264,
          264,
          264
        ]
      ],
      "type": 57
    }
  ],
  "58": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          5,
          5
        ],
        [
          5,
          5
        ]
      ],
      "type": 58
    }
  ],
  "61": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          4,
          4,
          4
        ],
        [
          4,
          null,
          4
        ],
        [
          4,
          4,
          4
        ]
      ],
      "type": 61
    }
  ],
  "65": [
    {
      "count": 3,
      "metadata": 0,
      "inShape": [
        [
          280,
          null,
          280
        ],
        [
          280,
          280,
          280
        ],
        [
          280,
          null,
          280
        ]
      ],
      "type": 65
    }
  ],
  "66": [
    {
      "count": 16,
      "metadata": 0,
      "inShape": [
        [
          265,
          null,
          265
        ],
        [
          265,
          280,
          265
        ],
        [
          265,
          null,
          265
        ]
      ],
      "type": 66
    }
  ],
  "67": [
    {
      "count": 4,
      "metadata": 0,
      "inShape": [
        [
          4,
          null,
          null
        ],
        [
          4,
          4,
          null
        ],
        [
          4,
          4,
          4
        ]
      ],
      "type": 67
    }
  ],
  "69": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          280
        ],
        [
          4
        ]
      ],
      "type": 69
    }
  ],
  "70": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          1,
          1
        ]
      ],
      "type": 70
    }
  ],
  "72": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          5,
          5
        ]
      ],
      "type": 72
    }
  ],
  "76": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          331
        ],
        [
          280
        ]
      ],
      "type": 76
    }
  ],
  "77": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          1
        ]
      ],
      "type": 77
    }
  ],
  "80": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          332,
          332
        ],
        [
          332,
          332
        ]
      ],
      "type": 80
    }
  ],
  "82": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          337,
          337
        ],
        [
          337,
          337
        ]
      ],
      "type": 82
    }
  ],
  "84": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          5,
          5,
          5
        ],
        [
          5,
          264,
          5
        ],
        [
          5,
          5,
          5
        ]
      ],
      "type": 84
    }
  ],
  "85": [
    {
      "count": 2,
      "metadata": 0,
      "inShape": [
        [
          280,
          280,
          280
        ],
        [
          280,
          280,
          280
        ]
      ],
      "type": 85
    }
  ],
  "89": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          348,
          348
        ],
        [
          348,
          348
        ]
      ],
      "type": 89
    }
  ],
  "91": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          86
        ],
        [
          50
        ]
      ],
      "type": 91
    }
  ],
  "96": [
    {
      "count": 2,
      "metadata": 0,
      "inShape": [
        [
          5,
          5,
          5
        ],
        [
          5,
          5,
          5
        ]
      ],
      "type": 96
    }
  ],
  "98": [
    {
      "count": 4,
      "metadata": 0,
      "inShape": [
        [
          1,
          1
        ],
        [
          1,
          1
        ]
      ],
      "type": 98
    }
  ],
  "101": [
    {
      "count": 16,
      "metadata": 0,
      "inShape": [
        [
          265,
          265,
          265
        ],
        [
          265,
          265,
          265
        ]
      ],
      "type": 101
    }
  ],
  "102": [
    {
      "count": 16,
      "metadata": 0,
      "inShape": [
        [
          20,
          20,
          20
        ],
        [
          20,
          20,
          20
        ]
      ],
      "type": 102
    }
  ],
  "103": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          360,
          360,
          360
        ],
        [
          360,
          360,
          360
        ],
        [
          360,
          360,
          360
        ]
      ],
      "type": 103
    }
  ],
  "107": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          280,
          5,
          280
        ],
        [
          280,
          5,
          280
        ]
      ],
      "type": 107
    }
  ],
  "108": [
    {
      "count": 4,
      "metadata": 0,
      "inShape": [
        [
          45,
          null,
          null
        ],
        [
          45,
          45,
          null
        ],
        [
          45,
          45,
          45
        ]
      ],
      "type": 108
    }
  ],
  "109": [
    {
      "count": 4,
      "metadata": 0,
      "inShape": [
        [
          98,
          null,
          null
        ],
        [
          98,
          98,
          null
        ],
        [
          98,
          98,
          98
        ]
      ],
      "type": 109
    }
  ],
  "113": [
    {
      "count": 6,
      "metadata": 0,
      "inShape": [
        [
          112,
          112,
          112
        ],
        [
          112,
          112,
          112
        ]
      ],
      "type": 113
    }
  ],
  "114": [
    {
      "count": 4,
      "metadata": 0,
      "inShape": [
        [
          112,
          null,
          null
        ],
        [
          112,
          112,
          null
        ],
        [
          112,
          112,
          112
        ]
      ],
      "type": 114
    }
  ],
  "116": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          null,
          340,
          null
        ],
        [
          264,
          49,
          264
        ],
        [
          49,
          49,
          49
        ]
      ],
      "type": 116
    }
  ],
  "123": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          null,
          331,
          null
        ],
        [
          331,
          89,
          331
        ],
        [
          null,
          331,
          null
        ]
      ],
      "type": 123
    }
  ],
  "128": [
    {
      "count": 4,
      "metadata": 0,
      "inShape": [
        [
          24,
          null,
          null
        ],
        [
          24,
          24,
          null
        ],
        [
          24,
          24,
          24
        ]
      ],
      "type": 128
    }
  ],
  "130": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          49,
          49,
          49
        ],
        [
          49,
          381,
          49
        ],
        [
          49,
          49,
          49
        ]
      ],
      "type": 130
    }
  ],
  "131": [
    {
      "count": 2,
      "metadata": 0,
      "inShape": [
        [
          265
        ],
        [
          280
        ],
        [
          5
        ]
      ],
      "type": 131
    }
  ],
  "133": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          388,
          388,
          388
        ],
        [
          388,
          388,
          388
        ],
        [
          388,
          388,
          388
        ]
      ],
      "type": 133
    }
  ],
  "138": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          20,
          20,
          20
        ],
        [
          20,
          399,
          20
        ],
        [
          49,
          49,
          49
        ]
      ],
      "type": 138
    }
  ],
  "139": [
    {
      "count": 6,
      "metadata": 1,
      "inShape": [
        [
          48,
          48,
          48
        ],
        [
          48,
          48,
          48
        ]
      ],
      "type": 139
    },
    {
      "count": 6,
      "metadata": 0,
      "inShape": [
        [
          4,
          4,
          4
        ],
        [
          4,
          4,
          4
        ]
      ],
      "type": 139
    }
  ],
  "143": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          5
        ]
      ],
      "type": 143
    }
  ],
  "145": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          42,
          42,
          42
        ],
        [
          null,
          265,
          null
        ],
        [
          265,
          265,
          265
        ]
      ],
      "type": 145
    }
  ],
  "146": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          131,
          54
        ]
      ],
      "type": 146
    }
  ],
  "152": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          55,
          55,
          55
        ],
        [
          55,
          55,
          55
        ],
        [
          55,
          55,
          55
        ]
      ],
      "type": 152
    }
  ],
  "154": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          265,
          null,
          265
        ],
        [
          265,
          54,
          265
        ],
        [
          null,
          265,
          null
        ]
      ],
      "type": 154
    }
  ],
  "256": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          265
        ],
        [
          280
        ],
        [
          280
        ]
      ],
      "type": 256
    }
  ],
  "257": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          265,
          265,
          265
        ],
        [
          null,
          280,
          null
        ],
        [
          null,
          280,
          null
        ]
      ],
      "type": 257
    }
  ],
  "258": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          265,
          265
        ],
        [
          265,
          280
        ],
        [
          null,
          280
        ]
      ],
      "type": 258
    }
  ],
  "259": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          265,
          null
        ],
        [
          null,
          318
        ]
      ],
      "type": 259
    }
  ],
  "261": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          null,
          280,
          287
        ],
        [
          280,
          null,
          287
        ],
        [
          null,
          280,
          287
        ]
      ],
      "type": 261
    }
  ],
  "262": [
    {
      "count": 4,
      "metadata": 0,
      "inShape": [
        [
          318
        ],
        [
          280
        ],
        [
          288
        ]
      ],
      "type": 262
    }
  ],
  "266": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          371,
          371,
          371
        ],
        [
          371,
          371,
          371
        ],
        [
          371,
          371,
          371
        ]
      ],
      "type": 266
    }
  ],
  "267": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          265
        ],
        [
          265
        ],
        [
          280
        ]
      ],
      "type": 267
    }
  ],
  "268": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          5
        ],
        [
          5
        ],
        [
          280
        ]
      ],
      "type": 268
    }
  ],
  "269": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          5
        ],
        [
          280
        ],
        [
          280
        ]
      ],
      "type": 269
    }
  ],
  "270": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          5,
          5,
          5
        ],
        [
          null,
          280,
          null
        ],
        [
          null,
          280,
          null
        ]
      ],
      "type": 270
    }
  ],
  "271": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          5,
          5
        ],
        [
          5,
          280
        ],
        [
          null,
          280
        ]
      ],
      "type": 271
    }
  ],
  "272": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          4
        ],
        [
          4
        ],
        [
          280
        ]
      ],
      "type": 272
    }
  ],
  "273": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          4
        ],
        [
          280
        ],
        [
          280
        ]
      ],
      "type": 273
    }
  ],
  "274": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          4,
          4,
          4
        ],
        [
          null,
          280,
          null
        ],
        [
          null,
          280,
          null
        ]
      ],
      "type": 274
    }
  ],
  "275": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          4,
          4
        ],
        [
          4,
          280
        ],
        [
          null,
          280
        ]
      ],
      "type": 275
    }
  ],
  "276": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          264
        ],
        [
          264
        ],
        [
          280
        ]
      ],
      "type": 276
    }
  ],
  "277": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          264
        ],
        [
          280
        ],
        [
          280
        ]
      ],
      "type": 277
    }
  ],
  "278": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          264,
          264,
          264
        ],
        [
          null,
          280,
          null
        ],
        [
          null,
          280,
          null
        ]
      ],
      "type": 278
    }
  ],
  "279": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          264,
          264
        ],
        [
          264,
          280
        ],
        [
          null,
          280
        ]
      ],
      "type": 279
    }
  ],
  "280": [
    {
      "count": 4,
      "metadata": 0,
      "inShape": [
        [
          5
        ],
        [
          5
        ]
      ],
      "type": 280
    }
  ],
  "281": [
    {
      "count": 4,
      "metadata": 0,
      "inShape": [
        [
          5,
          null,
          5
        ],
        [
          null,
          5,
          null
        ]
      ],
      "type": 281
    }
  ],
  "282": [
    {
      "count": 1,
      "metadata": 0,
      "ingredients": [
        {
          "id": 281
        },
        {
          "id": 40
        },
        {
          "id": 39
        }
      ],
      "type": 282
    }
  ],
  "290": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          5,
          5
        ],
        [
          null,
          280
        ],
        [
          null,
          280
        ]
      ],
      "type": 290
    }
  ],
  "291": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          4,
          4
        ],
        [
          null,
          280
        ],
        [
          null,
          280
        ]
      ],
      "type": 291
    }
  ],
  "292": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          265,
          265
        ],
        [
          null,
          280
        ],
        [
          null,
          280
        ]
      ],
      "type": 292
    }
  ],
  "293": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          264,
          264
        ],
        [
          null,
          280
        ],
        [
          null,
          280
        ]
      ],
      "type": 293
    }
  ],
  "297": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          296,
          296,
          296
        ]
      ],
      "type": 297
    }
  ],
  "298": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          334,
          334,
          334
        ],
        [
          334,
          null,
          334
        ]
      ],
      "type": 298
    }
  ],
  "299": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          334,
          null,
          334
        ],
        [
          334,
          334,
          334
        ],
        [
          334,
          334,
          334
        ]
      ],
      "type": 299
    }
  ],
  "300": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          334,
          334,
          334
        ],
        [
          334,
          null,
          334
        ],
        [
          334,
          null,
          334
        ]
      ],
      "type": 300
    }
  ],
  "301": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          334,
          null,
          334
        ],
        [
          334,
          null,
          334
        ]
      ],
      "type": 301
    }
  ],
  "306": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          265,
          265,
          265
        ],
        [
          265,
          null,
          265
        ]
      ],
      "type": 306
    }
  ],
  "307": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          265,
          null,
          265
        ],
        [
          265,
          265,
          265
        ],
        [
          265,
          265,
          265
        ]
      ],
      "type": 307
    }
  ],
  "308": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          265,
          265,
          265
        ],
        [
          265,
          null,
          265
        ],
        [
          265,
          null,
          265
        ]
      ],
      "type": 308
    }
  ],
  "309": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          265,
          null,
          265
        ],
        [
          265,
          null,
          265
        ]
      ],
      "type": 309
    }
  ],
  "310": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          264,
          264,
          264
        ],
        [
          264,
          null,
          264
        ]
      ],
      "type": 310
    }
  ],
  "311": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          264,
          null,
          264
        ],
        [
          264,
          264,
          264
        ],
        [
          264,
          264,
          264
        ]
      ],
      "type": 311
    }
  ],
  "312": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          264,
          264,
          264
        ],
        [
          264,
          null,
          264
        ],
        [
          264,
          null,
          264
        ]
      ],
      "type": 312
    }
  ],
  "313": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          264,
          null,
          264
        ],
        [
          264,
          null,
          264
        ]
      ],
      "type": 313
    }
  ],
  "321": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          280,
          280,
          280
        ],
        [
          280,
          35,
          280
        ],
        [
          280,
          280,
          280
        ]
      ],
      "type": 321
    }
  ],
  "322": [
    {
      "count": 1,
      "metadata": 1,
      "inShape": [
        [
          41,
          41,
          41
        ],
        [
          41,
          260,
          41
        ],
        [
          41,
          41,
          41
        ]
      ],
      "type": 322
    },
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          371,
          371,
          371
        ],
        [
          371,
          260,
          371
        ],
        [
          371,
          371,
          371
        ]
      ],
      "type": 322
    }
  ],
  "323": [
    {
      "count": 3,
      "metadata": 0,
      "inShape": [
        [
          5,
          5,
          5
        ],
        [
          5,
          5,
          5
        ],
        [
          null,
          280,
          null
        ]
      ],
      "type": 323
    }
  ],
  "324": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          5,
          5
        ],
        [
          5,
          5
        ],
        [
          5,
          5
        ]
      ],
      "type": 324
    }
  ],
  "325": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          265,
          null,
          265
        ],
        [
          null,
          265,
          null
        ]
      ],
      "type": 325
    }
  ],
  "328": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          265,
          null,
          265
        ],
        [
          265,
          265,
          265
        ]
      ],
      "type": 328
    }
  ],
  "330": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          265,
          265
        ],
        [
          265,
          265
        ],
        [
          265,
          265
        ]
      ],
      "type": 330
    }
  ],
  "333": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          5,
          null,
          5
        ],
        [
          5,
          5,
          5
        ]
      ],
      "type": 333
    }
  ],
  "339": [
    {
      "count": 3,
      "metadata": 0,
      "inShape": [
        [
          338,
          338,
          338
        ]
      ],
      "type": 339
    }
  ],
  "340": [
    {
      "count": 1,
      "metadata": 0,
      "ingredients": [
        {
          "id": 334
        },
        {
          "id": 339
        },
        {
          "id": 339
        },
        {
          "id": 339
        }
      ],
      "type": 340
    }
  ],
  "342": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          54
        ],
        [
          328
        ]
      ],
      "type": 342
    }
  ],
  "343": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          61
        ],
        [
          328
        ]
      ],
      "type": 343
    }
  ],
  "345": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          null,
          265,
          null
        ],
        [
          265,
          331,
          265
        ],
        [
          null,
          265,
          null
        ]
      ],
      "type": 345
    }
  ],
  "346": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          null,
          null,
          280
        ],
        [
          null,
          280,
          287
        ],
        [
          280,
          null,
          287
        ]
      ],
      "type": 346
    }
  ],
  "347": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          null,
          266,
          null
        ],
        [
          266,
          331,
          266
        ],
        [
          null,
          266,
          null
        ]
      ],
      "type": 347
    }
  ],
  "351": [
    {
      "count": 3,
      "metadata": 15,
      "ingredients": [
        {
          "id": 352
        }
      ],
      "type": 351
    },
    {
      "count": 2,
      "metadata": 1,
      "ingredients": [
        {
          "id": 38
        }
      ],
      "type": 351
    },
    {
      "count": 2,
      "metadata": 11,
      "ingredients": [
        {
          "id": 37
        }
      ],
      "type": 351
    }
  ],
  "353": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          338
        ]
      ],
      "type": 353
    }
  ],
  "354": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          335,
          335,
          335
        ],
        [
          353,
          344,
          353
        ],
        [
          296,
          296,
          296
        ]
      ],
      "outShape": [
        [
          325,
          325,
          325
        ],
        [
          null,
          null,
          null
        ],
        [
          null,
          null,
          null
        ]
      ],
      "type": 354
    }
  ],
  "355": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          35,
          35,
          35
        ],
        [
          5,
          5,
          5
        ]
      ],
      "type": 355
    }
  ],
  "356": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          76,
          331,
          76
        ],
        [
          1,
          1,
          1
        ]
      ],
      "type": 356
    }
  ],
  "359": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          null,
          265
        ],
        [
          265,
          null
        ]
      ],
      "type": 359
    }
  ],
  "361": [
    {
      "count": 4,
      "metadata": 0,
      "inShape": [
        [
          86
        ]
      ],
      "type": 361
    }
  ],
  "362": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          360
        ]
      ],
      "type": 362
    }
  ],
  "371": [
    {
      "count": 9,
      "metadata": 0,
      "inShape": [
        [
          266
        ]
      ],
      "type": 371
    }
  ],
  "374": [
    {
      "count": 3,
      "metadata": 0,
      "inShape": [
        [
          20,
          null,
          20
        ],
        [
          null,
          20,
          null
        ]
      ],
      "type": 374
    }
  ],
  "376": [
    {
      "count": 1,
      "metadata": 0,
      "ingredients": [
        {
          "id": 353
        },
        {
          "id": 39
        },
        {
          "id": 375
        }
      ],
      "type": 376
    }
  ],
  "377": [
    {
      "count": 2,
      "metadata": 0,
      "ingredients": [
        {
          "id": 369
        }
      ],
      "type": 377
    }
  ],
  "378": [
    {
      "count": 1,
      "metadata": 0,
      "ingredients": [
        {
          "id": 341
        },
        {
          "id": 377
        }
      ],
      "type": 378
    }
  ],
  "379": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          null,
          369,
          null
        ],
        [
          4,
          4,
          4
        ]
      ],
      "type": 379
    }
  ],
  "380": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          265,
          null,
          265
        ],
        [
          265,
          null,
          265
        ],
        [
          265,
          265,
          265
        ]
      ],
      "type": 380
    }
  ],
  "381": [
    {
      "count": 1,
      "metadata": 0,
      "ingredients": [
        {
          "id": 377
        },
        {
          "id": 368
        }
      ],
      "type": 381
    }
  ],
  "382": [
    {
      "count": 1,
      "metadata": 0,
      "ingredients": [
        {
          "id": 371
        },
        {
          "id": 360
        }
      ],
      "type": 382
    }
  ],
  "385": [
    {
      "count": 3,
      "metadata": 0,
      "ingredients": [
        {
          "id": 263
        },
        {
          "id": 377
        },
        {
          "id": 289
        }
      ],
      "type": 385
    }
  ],
  "389": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          280,
          280,
          280
        ],
        [
          280,
          334,
          280
        ],
        [
          280,
          280,
          280
        ]
      ],
      "type": 389
    }
  ],
  "390": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          336,
          null,
          336
        ],
        [
          null,
          336,
          null
        ]
      ],
      "type": 390
    }
  ],
  "395": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          339,
          339,
          339
        ],
        [
          339,
          345,
          339
        ],
        [
          339,
          339,
          339
        ]
      ],
      "type": 395
    }
  ],
  "396": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          371,
          371,
          371
        ],
        [
          371,
          391,
          371
        ],
        [
          371,
          371,
          371
        ]
      ],
      "type": 396
    }
  ],
  "398": [
    {
      "count": 1,
      "metadata": 0,
      "inShape": [
        [
          346,
          null
        ],
        [
          null,
          391
        ]
      ],
      "type": 398
    }
  ],
  "400": [
    {
      "count": 1,
      "metadata": 0,
      "ingredients": [
        {
          "id": 344
        },
        {
          "id": 353
        },
        {
          "id": 86
        }
      ],
      "type": 400
    }
  ]
}

},{}],22:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , assert = require('assert')

module.exports = Furnace;

function Furnace() {
  EventEmitter.call(this);

  this.window = null;
  this.fuel = null;
  this.progress = null;
}
util.inherits(Furnace, EventEmitter);

Furnace.windowType = 2;

// this function is replaced by the inventory plugin
Furnace.prototype.close = function() {
  assert.ok(false, "override");
};

Furnace.prototype.takeInput = function(cb) {
  assert.ok(false, "override");
};
Furnace.prototype.takeFuel = function(cb) {
  assert.ok(false, "override");
};
Furnace.prototype.takeOutput = function(cb) {
  assert.ok(false, "override");
};
Furnace.prototype.putInput = function(itemType, metadata, cb) {
  assert.ok(false, "override");
};
Furnace.prototype.putFuel = function(itemType, metadata, cb) {
  assert.ok(false, "override");
};
Furnace.prototype.inputItem = function() {
  assert.notEqual(this.window, null);
  return this.window.slots[0];
}
Furnace.prototype.fuelItem = function() {
  assert.notEqual(this.window, null);
  return this.window.slots[1];
}
Furnace.prototype.outputItem = function() {
  assert.notEqual(this.window, null);
  return this.window.slots[2];
}

},{"assert":76,"events":94,"util":113}],23:[function(require,module,exports){
(function (Buffer){
var items = require('./enums/items')
  , blocks = require('./enums/blocks')
  , assert = require('assert')

module.exports = Item;

function Item(type, count, metadata, nbt) {
  if (type == null) return null;

  this.type = type;
  this.count = count;
  this.metadata = metadata;
  this.nbt = nbt || new Buffer(0);

  var itemEnum = items[type] || blocks[type];
  assert.ok(itemEnum);
  this.name = itemEnum.name;
  this.displayName = itemEnum.displayName;
  this.stackSize = itemEnum.stackSize;
}

Item.equal = function(item1, item2) {
  if (item1 == null && item2 == null) {
    return true;
  } else if (item1 == null) {
    return false;
  } else if (item2 == null) {
    return false;
  } else {
    return item1.type === item2.type &&
      item1.count === item2.count &&
      item1.metadata === item2.metadata;
  }
};

}).call(this,require("buffer").Buffer)
},{"./enums/blocks":17,"./enums/items":19,"assert":76,"buffer":90}],24:[function(require,module,exports){
var Vec3 = require('vec3').Vec3;
var CHUNK_SIZE = new Vec3(16, 16, 16)

module.exports = Location;

function Location(absoluteVector) {
  this.floored = absoluteVector.floored();
  this.blockPoint = this.floored.modulus(CHUNK_SIZE);
  this.chunkCorner = this.floored.minus(this.blockPoint);
  this.blockIndex =
    this.blockPoint.x +
    CHUNK_SIZE.x * this.blockPoint.z +
    CHUNK_SIZE.x * CHUNK_SIZE.z * this.blockPoint.y;
  this.biomeBlockIndex = this.blockPoint.x + CHUNK_SIZE.x * this.blockPoint.z;
  this.chunkYIndex = Math.floor(absoluteVector.y / 16);
}

},{"vec3":47}],25:[function(require,module,exports){
exports.clamp = function clamp(min, x, max) {
  return x < min ? min : x > max ? max : x;
};

exports.sign = function sign(n) {
  return n > 0 ?  1 : n < 0 ?  -1 : 0;
};

exports.euclideanMod = function euclideanMod(numerator, denominator) {
  var result = numerator % denominator;
  return result < 0 ? result + denominator : result;
};

},{}],26:[function(require,module,exports){
var Vec3 = require('vec3').Vec3;

module.exports = Painting;

function Painting(id, pos, name, direction) {
  this.id = id;
  this.position = pos;
  this.name = name;
  this.direction = direction;
}

},{"vec3":47}],27:[function(require,module,exports){
var assert = require('assert');

module.exports = inject;

function inject(bot) {
  bot.isSleeping = false;

  function wake() {
    assert.strictEqual(bot.isSleeping, true, "already awake");
    bot.client.write('entity_action', {
      entityId: bot.entity.id,
      actionId: 3,
      jumpBoost: 0
    });
  }

  function sleep(bedBlock) {
    assert.strictEqual(bot.isSleeping, false, "already sleeping");
    assert.strictEqual(bedBlock.type, 26);
    bot.activateBlock(bedBlock);
  }

  bot.client.on('game_state_change', function(packet) {
    if (packet.reason === 0) {
      // occurs when you can't spawn in your bed and your spawn point gets reset
      bot.emit('spawnReset');
    }
  });

  bot.on('entitySleep', function(entity) {
    if (entity === bot.entity) {
      bot.isSleeping = true;
      bot.emit('sleep');
    }
  });

  bot.on('entityWake', function(entity) {
    if (entity === bot.entity) {
      bot.isSleeping = false;
      bot.emit('wake');
    }
  });

  bot.wake = wake;
  bot.sleep = sleep;
}

},{"assert":76}],28:[function(require,module,exports){
var instruments = require('../enums/instruments')
  , Vec3 = require('vec3').Vec3

module.exports = inject;

function inject(bot) {
  bot.client.on('block_action', function(packet) {
    // block action
    var pt = new Vec3(packet.x, packet.y, packet.z);
    var block = bot.blockAt(pt);
    if (packet.blockId === 25) {
      bot.emit('noteHeard', block, instruments[packet.byte1], packet.byte2);
    } else if (packet.blockId === 29 || packet.blockId === 33) {
      bot.emit('pistonMove', block, packet.byte1, packet.byte2);
    } else {
      bot.emit('chestLidMove', block, packet.byte2);
    }
  });
}

},{"../enums/instruments":18,"vec3":47}],29:[function(require,module,exports){
(function (Buffer){
var vec3 = require('vec3')
  , Vec3 = vec3.Vec3
  , assert = require('assert')
  , zlib = require('zlib')
  , Block = require('../block')
  , Painting = require('../painting')
  , Location = require('../location')

module.exports = inject;

var paintingFaceToVec = [
  new Vec3(0, 0, -1),
  new Vec3(-1, 0, 0),
  new Vec3(0, 0, 1),
  new Vec3(1, 0, 0),
];

function inject(bot) {
  var columns = {};
  var signs = {};
  var paintingsByPos = {};
  var paintingsById = {};

  function addPainting(painting) {
    paintingsById[painting.id] = painting;
    paintingsByPos[painting.position] = painting;
  }

  function deletePainting(painting) {
    delete paintingsById[painting.id];
    delete paintingsByPos[painting.position];
  }

  function addColumn(args) {
    var columnCorner = new Vec3(args.x * 16, 0, args.z * 16);
    var key = columnKeyXZ(columnCorner.x, columnCorner.z);
    if (! args.bitMap) {
      // stop storing the chunk column
      delete columns[key];
      bot.emit("chunkColumnUnload", columnCorner);
      return;
    }
    var column = columns[key];
    if (! column) columns[key] = column = new Column();
    var chunkIncluded = new Array(16);
    var y;
    for (y = 0; y < 16; ++y) {
      chunkIncluded[y] = args.bitMap & (1 << y);
    }

    var offset = 0;

    // block types
    var size = 16 * 16 * 16 * 2;
    for (y = 0; y < 16; ++y) {
      var blockId = args.data.slice(offset, offset + size);

      // Column.metadata doesn't exist anymore.
      column.blockType[y] = chunkIncluded[y] ? blockId : null;
      offset = chunkIncluded[y] ? offset + size : offset;
    }
    var size = 16 * 16 * 16 / 2;
    // light
    for (y = 0; y < 16; ++y) {
      column.light[y] = chunkIncluded[y] ?
        args.data.slice(offset, offset + size) : null;
      offset = chunkIncluded[y] ? offset + size : offset;
    }
    // sky light
    if (args.skyLightSent) {
      for (y = 0; y < 16; ++y) {
        column.skyLight[y] = chunkIncluded[y] ?
          args.data.slice(offset, offset + size) : null;
        offset = chunkIncluded[y] ? offset + size : offset;
      }
    }
    // biome
    if (args.groundUp) {
      size = 256;
      column.biome = args.data.slice(offset, offset + size);
      offset += size;
    }

    assert.strictEqual(offset, args.data.length);
    bot.emit("chunkColumnLoad", columnCorner);
  }

  function blockAt(absolutePoint) {
    var loc = new Location(absolutePoint);
    var key = columnKeyXZ(loc.chunkCorner.x, loc.chunkCorner.z);
    var column = columns[key];
    // null column means chunk not loaded
    if (! column) return null;
    var blockType = bite(column.blockType);
    var nibbleIndex = loc.blockIndex >> 1;
    var lowNibble = loc.blockIndex % 2 === 1;

    var biomeId = column.biome.readUInt8(loc.biomeBlockIndex);

    var block = new Block(blockType >> 4, biomeId);
    block.metadata = blockType & 0x0f;
    block.light = nib(column.light);
    block.skyLight = nib(column.skyLight);
    block.add = nib(column.add);
    block.position = loc.floored;
    block.signText = signs[loc.floored];
    block.painting = paintingsByPos[loc.floored];

    return block;

    function bite(array) {
      var buf = array[loc.chunkYIndex];
      return buf ? buf.readUInt16LE(loc.blockIndex * 2) : 0;
    }

    function nib(array) {
      var buf = array[loc.chunkYIndex];
      return buf ? nibble(buf.readUInt8(nibbleIndex), lowNibble) : 0;
    }
  }

  function emitBlockUpdate(oldBlock, newBlock) {
    bot.emit("blockUpdate", oldBlock, newBlock);
    var position = oldBlock ? oldBlock.position :
      (newBlock ? newBlock.position : null);
    if (position) bot.emit("blockUpdate:" + newBlock.position, oldBlock, newBlock);
  }

  function updateBlock(point, type, metadata) {
    var oldBlock = blockAt(point);
    var loc = new Location(point);
    var nibbleIndex = loc.blockIndex >> 1;
    var key = columnKeyXZ(loc.chunkCorner.x, loc.chunkCorner.z);
    var column = columns[key];
    // sometimes minecraft server sends us block updates before it sends
    // us the column that the block is in. ignore this.
    if (! column) return;
    var blockTypeBuffer = column.blockType[loc.chunkYIndex];
    // if it's null, it was all air, but now we're inserting a block.
    if (! blockTypeBuffer) {
      blockTypeBuffer = new Buffer(16*16*16*2);
      blockTypeBuffer.fill(0);
      column.blockType[loc.chunkYIndex] = blockTypeBuffer;
    }
    blockTypeBuffer.writeUInt16LE((type << 4) | metadata, loc.blockIndex * 2);

    delete signs[loc.floored];

    var painting = paintingsByPos[loc.floored];
    if (painting) deletePainting(painting);

    emitBlockUpdate(oldBlock, blockAt(point));
  }

  bot.client.on('map_chunk', function(packet) {
    addColumn({
      x: packet.x,
      z: packet.z,
      bitMap: packet.bitMap,
      skyLightSent: true,
      groundUp: packet.groundUp,
      data: packet.chunkData,
    });
  });


  bot.client.on('map_chunk_bulk', function(packet) {
    var offset = 0;
    var meta, i, size;
    for (i = 0; i < packet.meta.length; ++i) {
      meta = packet.meta[i];
      size = (8192 + (packet.skyLightSent ? 2048 : 0)) *
        onesInShort(meta.bitMap) + // block ids
        2048 * onesInShort(meta.bitMap) + // (two bytes per block id)
        256; // biomes
      addColumn({
        x: meta.x,
        z: meta.z,
        bitMap: meta.bitMap,
        skyLightSent: packet.skyLightSent,
        groundUp: true,
        data: packet.data.slice(offset, offset + size),
      });
      offset += size;
    }

    assert.strictEqual(offset, packet.data.length);
  });

  bot.client.on('multi_block_change', function(packet) {
    // multi block change
    var i, record, metadata, type, blockX, blockZ, y, pt;
    for (i = 0; i < packet.recordCount; ++i) {
      record   = packet.records[i];

      metadata = (record.blockId & 0x0f);
      type     = (record.blockId) >> 4;
      y        = record.y;
      blockZ   = (record.horizontalPos & 0x0f) >> 24;
      blockX   = (record.horizontalPos & 0xf0) >> 4;

      pt = new Vec3(packet.chunkX * 16 + blockX, y, packet.chunkZ * 16 + blockZ);
      updateBlock(pt, type, metadata);
    }
  });

  bot.client.on('block_change', function(packet) {
    // block change
    var pt = new Vec3(packet.location.x, packet.location.y, packet.location.z);
    updateBlock(pt, packet.type >> 4, packet.type & 0x0f);
  });

  bot.client.on('explosion', function(packet) {
    // explosion
    packet.affectedBlockOffsets.forEach(function(offset) {
      var pt = vec3(offset).offset(packet.x, packet.y, packet.z);
      updateBlock(pt.floor(), 0, 0);
    });
  });

  bot.client.on('spawn_entity_painting', function(packet) {
    var pos = new Vec3(packet.x, packet.y, packet.z);
    var painting = new Painting(packet.entityId,
      pos, packet.title, paintingFaceToVec[packet.direction]);
    addPainting(painting);
  });

  bot.client.on('entity_destroy', function(packet) {
    // destroy entity
    packet.entityIds.forEach(function(id) {
      var painting = paintingsById[id];
      if (painting) deletePainting(painting);
    });
  });

  bot.client.on('update_sign', function(packet) {
    // update sign
    var pos = new Vec3(packet.x, packet.y, packet.z);
    var oldBlock = blockAt(pos);
    var str = packet.text1 + "\n" + packet.text2 + "\n" + packet.text3 + "\n" + packet.text4;
    signs[pos] = str;
    emitBlockUpdate(oldBlock, blockAt(pos));
  });
  bot.updateSign = function(block, text) {
    var lines = text.split("\n");
    if (lines.length > 4) {
      bot.emit("error", new Error("too many lines for sign text"));
      return;
    }
    for (var i = 0; i < lines.length; ++i) {
      if (lines[i].length > 15) {
        bot.emit("error", new Error("signs have max line length 15"));
        return;
      }
    }
    bot.client.write('update_sign', {
      x: block.position.x,
      y: block.position.y,
      z: block.position.z,
      text1: lines[0] || "",
      text2: lines[1] || "",
      text3: lines[2] || "",
      text4: lines[3] || "",
    });
  }

  // if we get a respawn packet and the dimension is changed,
  // unload all chunks from memory.
  var dimension;
  bot.client.on('login', function(packet) {
    dimension = packet.dimension
  });
  bot.client.on('respawn', function(packet) {
    if (dimension === packet.dimension) return;
    dimension = packet.dimension;
    columns = {};
  });

  bot.blockAt = blockAt;
  bot._updateBlock = updateBlock;
}

function columnKeyXZ(x, z) {
  return x + ',' + z;
}

function onesInShort(n) {
  n = n & 0xffff;
  var count = 0;
  for (var i = 0; i < 16; ++i) {
    count = ((1 << i) & n) ? count + 1 : count;
  }
  return count;
}

function nibble(wholeByte, low) {
  return low ?
    wholeByte & 0x0f :
    wholeByte >> 4;
}

function Column() {
  this.blockType = new Array(16);
  // TODO : Is this part of the public API ?
  //this.metadata = new Array(16);
  this.light = new Array(16);
  this.skyLight = new Array(16);
  this.add = new Array(16);
  this.biome = null;
}


}).call(this,require("buffer").Buffer)
},{"../block":9,"../location":24,"../painting":26,"assert":76,"buffer":90,"vec3":47,"zlib":89}],30:[function(require,module,exports){
var assert = require('assert')
  , quoteMeta = require('quotemeta')
  , ChatMessage = require('../chat_message')
  , LEGAL_CHARS = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»§'
  , CHAT_LENGTH_LIMIT = 100

module.exports = inject;

var quotedLegalChars = quoteMeta(LEGAL_CHARS);
var incomingFilter = new RegExp("([^" + quotedLegalChars + "]|§.)", 'g');
var outgoingFilter = new RegExp("([^" + quotedLegalChars + "])", 'g');

function inject(bot) {
  bot.client.on('chat', function(packet) {

    // used by minecraft <= 1.6.1 and craftbukkit >= 1.6.2
    function parseOldMessage(message) {
      var legalContent = message.replace(incomingFilter, '');
      var match, username, content;
      if (match = legalContent.match(/^<(?:.+? )?(.+?)> (.*)$/)) {
        // spoken chat
        username = match[1];
        content = match[2];
        bot.emit('chat', username, content, message);
      } else if (match = legalContent.match(/^(?:.+? )?(.+?) (?:whispers to you:|whispers) (.*)$/)) {
        // whispered chat
        username = match[1];
        content = match[2];
        bot.emit('whisper', username, content, message);
      }
    }

    /**
     * Parse 1.6.* version message
     * @param  {JSONObject} jsonMessage
     * @return {void}
     */
    function parseJsonMessage6(jsonMessage) {
      if (typeof jsonMsg.translate === 'string' && jsonMsg.translate.match(/^chat\./)) {
        var username = jsonMsg.using[0];
        var content = jsonMsg.using[1].replace(incomingFilter, '');
        bot.emit('chat', username, content, jsonMessage.translate, jsonMessage)
      } else if (jsonMsg.translate === "commands.message.display.incoming") {
        username = jsonMsg.using[0];
        content = jsonMsg.using[1].replace(incomingFilter, '');
        bot.emit('whisper', username, content, jsonMsg.translate, jsonMsg);
      } else if (typeof jsonMsg.text === 'string') {
        // craftbukkit message format
        parseOldMessage(jsonMsg.text);
      }
      bot.emit('message', jsonMsg);
    }

    /**
     * Parse 1.7+ version message
     * @param  {JSONObject} jsonMessage
     * @return {void}
     */
    function parseJsonMessage7(jsonMessage) {
      var chatMessage = new ChatMessage(jsonMessage);
      bot.emit('message', chatMessage);
      // Now parse the message type
      switch(chatMessage.translate) {
        case undefined: {
          parseOldMessage(chatMessage.toString());
          break;
        }
        case 'chat.type.text': {
          var username = chatMessage.getText(0);
          var extendedMessage = chatMessage.toString().substring(username.length).trim();
          bot.emit('chat', username, extendedMessage, chatMessage.translate, chatMessage);
          break;
        }
        case 'commands.message.display.incoming': {
          var username = chatMessage.getText(0);
          var extendedMessage = chatMessage.toString().substring(username.length).trim();
          bot.emit('whisper', username, extendedMessage, chatMessage.translate, chatMessage);
          break;
        }
      }
    }

    // used by minecraft >= 1.6.2
    function parseJsonMessage(jsonMessage) {
      if(jsonMessage.using) {
        parseJsonMessage6(jsonMessage);
      }else {
        parseJsonMessage7(jsonMessage);
      }      
    }

    var jsonMsg;
    // Honestly we should be checking against the server version
    try {
      jsonMsg = JSON.parse(packet.message);
    } catch (e) {
      // old message format
      bot.emit('message', packet.message);
      parseOldMessage(packet.message);
      return;
    }
    parseJsonMessage(jsonMsg)
  });

  function chatWithHeader(header, message) {
    message = message.replace(outgoingFilter, '');
    var lengthLimit = CHAT_LENGTH_LIMIT - header.length;
    message.split("\n").forEach(function(subMessage) {
      if (! subMessage) return;
      var i, smallMsg;
      for (i = 0; i < subMessage.length; i += lengthLimit) {
        smallMsg = header + subMessage.substring(i, i + lengthLimit);
        bot.client.write('chat', {message: smallMsg});
      }
    });
  }
  bot.whisper = function(username, message) {
    chatWithHeader("/tell " + username + " ", message);
  };
  bot.chat = function(message) {
    chatWithHeader("", message);
  };
}

},{"../chat_message":10,"assert":76,"quotemeta":46}],31:[function(require,module,exports){
var assert = require('assert');
var toolMultipliers = require('../enums/materials');

module.exports = inject;

function inject(bot) {
  var swingInterval = null;
  var waitTimeout = null;

  bot.targetDigBlock = null;
  bot.lastDigTime = null

  function dig(block, cb) {
    if (bot.targetDigBlock) bot.stopDigging();
    cb = cb || noop;
    bot.lookAt(block.position);
    bot.client.write('block_dig', {
      status: 0, // start digging
      location: block.position,
      face: 1, // hard coded to always dig from the top
    });
    var waitTime = bot.digTime(block);
    waitTimeout = setTimeout(finishDigging, waitTime);
    bot.targetDigBlock = block;
    swingInterval = setInterval(function() {
      bot.client.write('arm_animation', {
        entityId: bot.entity.id,
        animation: 1,
      });
    }, 350);
    var eventName = "blockUpdate:" + block.position;
    bot.on(eventName, onBlockUpdate);

    bot.stopDigging = function() {
      bot.removeListener(eventName, onBlockUpdate);
      clearInterval(swingInterval);
      clearTimeout(waitTimeout);
      swingInterval = null;
      waitTimeout = null;
      bot.client.write('block_dig', {
        status: 1, // cancel digging
        x: bot.targetDigBlock.position.x,
        y: bot.targetDigBlock.position.y,
        z: bot.targetDigBlock.position.z,
        face: 1, // hard coded to always dig from the top
      });
      var block = bot.targetDigBlock;
      bot.targetDigBlock = null;
      bot.lastDigTime = new Date();
      bot.emit("diggingAborted", block);
      bot.stopDigging = noop;
    };

    function onBlockUpdate(oldBlock, newBlock) {
      bot.removeListener(eventName, onBlockUpdate);
      clearInterval(swingInterval);
      clearTimeout(waitTimeout);
      swingInterval = null;
      waitTimeout = null;
      bot.targetDigBlock = null;
      bot.lastDigTime = new Date();
      if (newBlock.type === 0) {
        bot.emit("diggingCompleted", newBlock);
        cb();
      } else {
        bot.emit("diggingAborted", newBlock);
        var err = new Error("digging interruption");
        err.code = "EDIGINTERRUPT";
        cb(err);
      }
    }

    function finishDigging() {
      clearInterval(swingInterval);
      clearTimeout(waitTimeout);
      swingInterval = null;
      waitTimeout = null;
      bot.client.write('block_dig', {
        status: 2, // finish digging
        location: bot.targetDigBlock.position,
        face: 1, // hard coded to always dig from the top
      });
      bot.targetDigBlock = null;
      bot.lastDigTime = new Date();
      bot._updateBlock(block.position, 0, 0);
    }
  }

  function canDigBlock(block) {
    return block && block.diggable && block.position.offset(0.5, 0.5, 0.5).distanceTo(bot.entity.position) < 6;
  }

  function digTime(block) {
    if (bot.game.gameMode === 'creative') return 0;
    var time = 1000 * block.hardness * 1.5;
    if (block.harvestTools) {
      var penalty = !bot.heldItem || !block.harvestTools[bot.heldItem.type];
      if (penalty) return time * 10 / 3;
    }
    var toolMultiplier = toolMultipliers[block.material];
    if (toolMultiplier && bot.heldItem) {
      var multiplier = toolMultiplier[bot.heldItem.type];
      if (multiplier) time /= multiplier;
    }
    if (! bot.entity.onGround) time *= 5;
    var blockIn = bot.blockAt(bot.entity.position);
    var inWater = blockIn.type === 9; // only stationary water counts
    if (inWater) time *= 5;
    return time;
  }

  bot.dig = dig;
  bot.stopDigging = noop;
  bot.canDigBlock = canDigBlock;
  bot.digTime = digTime;
}

function noop(err) {
  if (err) throw err;
}

},{"../enums/materials":20,"assert":76}],32:[function(require,module,exports){
var Vec3 = require('vec3').Vec3
  , _ = require('lodash')
  , Entity = require('../entity')
  , conv = require('../conversions')
  , NAMED_ENTITY_HEIGHT = 1.62
  , CROUCH_HEIGHT = NAMED_ENTITY_HEIGHT - 0.08

module.exports = inject;

var animationEvents = {
  1: 'entitySwingArm',
  2: 'entityHurt',
  3: 'entityWake',
  5: 'entityEat',
  104: 'entityCrouch',
  105: 'entityUncrouch',
};

var entityStatusEvents = {
  2: 'entityHurt',
  3: 'entityDead',
  6: 'entityTaming',
  7: 'entityTamed',
  8: 'entityShakingOffWater',
  10: 'entityEatingGrass',
};

var spawnedObjectTypes = {
  1: 'boat',
  2: 'itemStack',
  10: 'minecart',
  11: 'minecartChest',
  12: 'minecartPowered',
  50: 'activatedTnt',
  51: 'enderCrystal',
  60: 'arrowProjectile',
  61: 'snowballProjectile',
  62: 'eggProjectile',
  65: 'thrownEnderpearl',
  66: 'witherSkull',
  70: 'fallingObjects',
  71: 'itemFrames',
  72: 'eyeOfEnder',
  73: 'thrownPotion',
  74: 'fallingDragonEgg',
  75: 'thrownExperienceBottle',
  90: 'fishingFloat',
};

var mobTypes = {
  50: "creeper",
  51: "skeleton",
  52: "spider",
  53: "giantZombie",
  54: "zombie",
  55: "slime",
  56: "ghast",
  57: "zombiePigman",
  58: "enderman",
  59: "caveSpider",
  60: "silverfish",
  61: "blaze",
  62: "magmaCube",
  63: "enderDragon",
  64: "wither",
  65: "bat",
  66: "witch",
  90: "pig",
  91: "sheep",
  92: "cow",
  93: "chicken",
  94: "squid",
  95: "wolf",
  96: "mooshroom",
  97: "snowman",
  98: "ocelot",
  99: "ironGolem",
  120: "villager",
};

function inject(bot) {
  
  bot.findPlayer = bot.findPlayers = function(filter) {
    var filterFn =  function(entity) {
      if(entity.type !== 'player') return false;
      if(filter == null) return true;
      if(typeof filter === 'object' && filter instanceof RegExp) {
        return entity.username.search(filter) !== -1;
      }else if(typeof filter === 'function') {
        return filter(entity);
      }else if(typeof filter === 'string') {
        return entity.username.toLowerCase() === filter.toLowerCase();
      }
      return false;
    }
    var resultSet = _.transform(bot.entities, function(players, entity) {
      if(filterFn(entity)) players.push(entity);
    }, []);

    if(typeof filter === 'string') {
      switch(resultSet.length) {
        case 0: return null;
        case 1: return resultSet[0];
        default: return resultSet;
      }
    }
    return resultSet;
  }

  bot.players = {};
  bot.uuidToUsername = {};
  bot.entities = {};

  bot.client.once('login', function(packet) {
    // login
    bot.entity = fetchEntity(packet.entityId);
    bot.entity.username = bot.username;
    bot.entity.type = 'player';
  });

  bot.client.on('entity_equipment', function(packet) {
    // entity equipment
    var entity = fetchEntity(packet.entityId);
    entity.setEquipment(packet.slot, packet.item);
    bot.emit('entityEquip', entity);
  });

  bot.client.on('bed', function(packet) {
    // use bed
    var entity = fetchEntity(packet.entityId);
    entity.position.set(packet.x, packet.y, packet.z);
    bot.emit('entitySleep', entity);
  });

  bot.client.on('animation', function(packet) {
    // animation
    var entity = fetchEntity(packet.entityId);
    var eventName = animationEvents[packet.animation];
    if (eventName) bot.emit(eventName, entity);
  });

  bot.client.on('named_entity_spawn', function(packet) {
    // spawn named entity
    var entity = fetchEntity(packet.entityId);
    entity.type = 'player';
    entity.username = bot.uuidToUsername[packet.playerUUID];
    entity.uuid = packet.playerUUID;
    entity.dataBlobs = packet.data;
    entity.position.set(packet.x / 32, packet.y / 32, packet.z / 32);
    entity.yaw = conv.fromNotchianYawByte(packet.yaw);
    entity.pitch = conv.fromNotchianPitchByte(packet.pitch);
    entity.height = NAMED_ENTITY_HEIGHT;
    entity.metadata = parseMetadata(packet.metadata);
    if(!bot.players[entity.username].entity) {
      bot.players[entity.username].entity = entity;
    }
    bot.emit('entitySpawn', entity);
  });
  bot.on("entityCrouch", function(entity) {
    entity.height = CROUCH_HEIGHT;
  });
  bot.on("entityUncrouch", function(entity) {
    entity.height = NAMED_ENTITY_HEIGHT;
  });

  bot.client.on('collect', function(packet) {
    // collect item
    var collector = fetchEntity(packet.collectorEntityId);
    var collected = fetchEntity(packet.collectedEntityId);
    bot.emit('playerCollect', collector, collected);
  });

  bot.client.on('spawn_entity', function(packet) {
    // spawn object/vehicle
    var entity = fetchEntity(packet.entityId);
    entity.type = 'object';
    entity.objectType = spawnedObjectTypes[packet.type];
    entity.position.set(packet.x / 32, packet.y / 32, packet.z / 32);
    entity.yaw = conv.fromNotchianYawByte(packet.yaw);
    entity.pitch = conv.fromNotchianPitchByte(packet.pitch);
    entity.objectData = packet.objectData;
    bot.emit('entitySpawn', entity);
  });

  bot.client.on('spawn_entity_experience_orb', function(packet) {
    var entity = fetchEntity(packet.entityId);
    entity.type = 'orb';
    entity.position.set(packet.x / 32, packet.y / 32, packet.z / 32);
    entity.count = packet.count;
    bot.emit('entitySpawn', entity);
  });

  bot.client.on('spawn_entity_living', function(packet) {
    // spawn mob
    var entity = fetchEntity(packet.entityId);
    entity.type = 'mob';
    entity.mobType = mobTypes[packet.type];
    entity.position.set(packet.x / 32, packet.y / 32, packet.z / 32);
    entity.yaw = conv.fromNotchianYawByte(packet.yaw);
    entity.pitch = conv.fromNotchianPitchByte(packet.pitch);
    entity.headPitch = conv.fromNotchianPitchByte(packet.headPitch);
    var notchVel = new Vec3(packet.velocityX, packet.velocityY, packet.velocityZ);
    entity.velocity.update(conv.fromNotchVelocity(notchVel));
    entity.metadata = parseMetadata(packet.metadata);
    bot.emit('entitySpawn', entity);
  });

  bot.client.on('entity_velocity', function(packet) {
    // entity velocity
    var entity = fetchEntity(packet.entityId);
    var notchVel = new Vec3(packet.velocityX, packet.velocityY, packet.velocityZ);
    entity.velocity.update(conv.fromNotchVelocity(notchVel));
  });

  bot.client.on('entity_destroy', function(packet) {
    // destroy entity
    packet.entityIds.forEach(function(id) {
      var entity = fetchEntity(id);
      bot.emit('entityGone', entity);
      entity.isValid = false;
      if(entity.username && bot.players[entity.username]) {
        bot.players[entity.username].entity = null;
      }
      delete bot.entities[id];
    });
  });

  bot.client.on('rel_entity_move', function(packet) {
    // entity relative move
    var entity = fetchEntity(packet.entityId);
    entity.position.translate(packet.dX / 32, packet.dY / 32, packet.dZ / 32);
    bot.emit('entityMoved', entity);
  });

  bot.client.on('entity_look', function(packet) {
    // entity look
    var entity = fetchEntity(packet.entityId);
    entity.yaw = conv.fromNotchianYawByte(packet.yaw);
    entity.pitch = conv.fromNotchianPitchByte(packet.pitch);
    bot.emit('entityMoved', entity);
  });

  bot.client.on('entity_move_look', function(packet) {
    // entity look and relative move
    var entity = fetchEntity(packet.entityId);
    entity.position.translate(packet.dX / 32, packet.dY / 32, packet.dZ / 32);
    entity.yaw = conv.fromNotchianYawByte(packet.yaw);
    entity.pitch = conv.fromNotchianPitchByte(packet.pitch);
    bot.emit('entityMoved', entity);
  });

  bot.client.on('entity_teleport', function(packet) {
    // entity teleport
    var entity = fetchEntity(packet.entityId);
    entity.position.set(packet.x / 32, packet.y / 32, packet.z / 32);
    entity.yaw = conv.fromNotchianYawByte(packet.yaw);
    entity.pitch = conv.fromNotchianPitchByte(packet.pitch);
    bot.emit('entityMoved', entity);
  });

  bot.client.on('entity_head_rotation', function(packet) {
    // entity head look
    var entity = fetchEntity(packet.entityId);
    entity.headYaw = conv.fromNotchianYawByte(packet.headYaw);
    bot.emit('entityMoved', entity);
  });

  bot.client.on('entity_status', function(packet) {
    // entity status
    var entity = fetchEntity(packet.entityId);
    var eventName = entityStatusEvents[packet.status];
    if (eventName) bot.emit(eventName, entity);
  });

  bot.client.on('attach_entity', function(packet) {
    // attach entity
    var entity = fetchEntity(packet.entityId);
    if (packet.vehicleId === -1) {
      var vehicle = entity.vehicle;
      delete entity.vehicle;
      bot.emit('entityDetach', entity, vehicle);
    } else {
      entity.vehicle = fetchEntity(packet.vehicleId);
      bot.emit('entityAttach', entity, entity.vehicle);
    }
  });

  bot.client.on('entity_metadata', function(packet) {
    // entity metadata
    var entity = fetchEntity(packet.entityId);
    entity.metadata = parseMetadata(packet.metadata);
    bot.emit('entityUpdate', entity);
  });

  bot.client.on('entity_effect', function(packet) {
    // entity effect
    var entity = fetchEntity(packet.entityId);
    var effect = {
      id: packet.effectId,
      amplifier: packet.amplifier,
      duration: packet.duration,
    };
    entity.effects[effect.id] = effect;
    bot.emit('entityEffect', entity, effect);
  });

  bot.client.on('remove_entity_effect', function(packet) {
    // remove entity effect
    var entity = fetchEntity(packet.entityId);
    var effect = entity.effects[packet.effectId];
    delete entity.effects[effect.id];
    bot.emit('entityEffectEnd', entity, effect);
  });

  bot.client.on('spawn_entity_weather', function(packet) {
    // spawn global entity
    var entity = fetchEntity(packet.entityId);
    entity.type = 'global';
    entity.globalType = 'thunderbolt';
    entity.position.set(packet.x / 32, packet.y / 32, packet.z / 32);
    bot.emit('entitySpawn', entity);
  });

  bot.on('spawn', function() {
    bot.emit('entitySpawn', bot.entity);
  });
  bot.client.on('player_info', function(packet) {
    // player list item(s)
    packet.data.forEach(function(item) {
      var playerEntity = bot.findPlayers(item.name);
      var player = bot.uuidToUsername[item.UUID] ? bot.players[bot.uuidToUsername[item.UUID]] : null;
      if(packet.action === 0) {
        // New Player
        if(!player) {
          player = bot.players[item.name] = { username: item.name, ping: item.ping , uuid: item.UUID};
          bot.uuidToUsername[item.UUID]=item.name;
          bot.emit('playerJoined', player);
          // Just an Update
        } else player.ping = item.ping;

        player.entity = playerEntity;
      } else if (packet.action === 1) {
        // TODO: update gamemode
      } else if (packet.action === 2) {
        // TODO: update latency
      } else if (packet.action === 3) {
        // TODO: update display name
      } else if (packet.action === 4) {
        // Player has parted
        player.entity = null;
        delete bot.players[item.name];
        delete bot.uuidToUsername[item.UUID]
        bot.emit('playerLeft', player);
      }
    });
  });

  // attaching to a vehicle
  bot.client.on('attach_entity', function(packet) {
    if (packet.entityId !== bot.entity.id) return;
    var vehicle = bot.vehicle;
    if (packet.vehicleId === -1) {
      bot.vehicle = null;
      bot.emit("dismount", vehicle);
    } else {
      bot.vehicle = bot.entities[packet.vehicleId];
      bot.emit("mount");
    }
  });


  bot.attack = attack;
  bot.mount = mount;
  bot.dismount = dismount;
  bot.useOn = useOn;

  function useOn(target) {
    // TODO: check if not crouching will make make this action always use the item
    useEntity(target, false);
  }

  function attack(target, swing) {
    if(swing)
    {
      bot.client.write('arm_animation', {
        entityId: target.id,
        animation: 1
      });
    }
    useEntity(target, true);
  }

  function mount(target) {
    // TODO: check if crouching will make make this action always mount
    useEntity(target, false);
  }

  function dismount(target) {
    if (bot.vehicle) {
      mount(bot.vehicle);
    } else {
      bot.emit("error", new Error("dismount: not mounted"));
    }
  }

  function useEntity(target, leftClick) {
    bot.client.write('use_entity', {
      target: target.id,
      leftClick: leftClick,
    });
  }

  function fetchEntity(id) {
    return bot.entities[id] || (bot.entities[id] = new Entity(id));
  }
}

function parseMetadata(metadata) {
  var o = {};
  metadata.forEach(function(pair) {
    o[pair.key] = pair.value;
  });
  return o;
}

},{"../conversions":12,"../entity":15,"lodash":45,"vec3":47}],33:[function(require,module,exports){
module.exports = inject;

function inject(bot) {
  bot.experience = {
    level: null,
    points: null,
    progress: null,
  };
  bot.client.on('experience', function(packet) {
    bot.experience.level = packet.level;
    bot.experience.points = packet.totalExperience;
    bot.experience.progress = packet.experienceBar;
    bot.emit('experience');
  });
}

},{}],34:[function(require,module,exports){
(function (Buffer){
module.exports = inject;

var dimensionNames = {
  '-1': 'nether',
  '0': 'overworld',
  '1': 'end',
};

var difficultyNames = ['peaceful', 'easy', 'normal', 'hard'];

function inject(bot, options) {
  bot.game = {};

  bot.client.on('login', function(packet) {
    bot.game.levelType = packet.levelType;
    bot.game.gameMode = parseGameMode(packet.gameMode);
    bot.game.hardcore = parseHardcore(packet.gameMode);
    bot.game.dimension = dimensionNames[packet.dimension];
    bot.game.difficulty = difficultyNames[packet.difficulty];
    bot.game.maxPlayers = packet.maxPlayers;
    bot.emit('login');
    bot.emit('game');
    bot.client.write('held_item_slot', {slotId: 0});
    bot.client.write('custom_payload', {channel: 'MC|Brand', data: new Buffer('vanilla')})

    //autoRespawn(bot);
  });

  bot.client.on('respawn', function(packet) {
    bot.game.levelType = packet.levelType;
    bot.game.dimension = dimensionNames[packet.dimension];
    bot.game.difficulty = difficultyNames[packet.difficulty];
    bot.game.gameMode = parseGameMode(packet.gameMode);
    bot.game.hardcore = parseHardcore(packet.gameMode);
    bot.emit('game');
  });

  bot.client.on('game_state_change', function(packet) {
    if (packet.reason === 3) {
      bot.game.gameMode = parseGameMode(packet.gameMode);
      bot.emit('game');
    }
  });
}

var gameModes = ['survival', 'creative', 'adventure'];

function parseGameMode(gameModeBits) {
  return gameModes[(gameModeBits & 0x03)];
}

function parseHardcore(gameModeBits) {
  return !!(gameModeBits & 0x04);
}

/**
 * AutoRespawn if dead on login
 * Waits 2 seconds for the update_health packet,
 * on timeout of this packet it sends a respawn request
 * I can't think of a cleaner way to do this at the moment.
 * @param  {Bot} bot
 * @return {void}
 */
function autoRespawn(bot) {
  var timer = setTimeout(function() {
    bot.client.write('client_command', { payload: 0 });
  }, 2000);
  bot.client.once('update_health', function() {
    clearTimeout(timer);
  })
}


}).call(this,require("buffer").Buffer)
},{"buffer":90}],35:[function(require,module,exports){
module.exports = inject;

function inject(bot, options) {
  bot.isAlive = false;

  bot.client.on('respawn', function(packet) {
    bot.isAlive = false;
    bot.emit("respawn");
  });

  bot.client.on('update_health', function(packet) {
    bot.health = packet.health;
    bot.food = packet.food;
    bot.foodSaturation = packet.foodSaturation;
    bot.emit('health');
    if (bot.health <= 0) {
      bot.isAlive = false;
      bot.emit('death');
      bot.client.write('client_command', { payload: 0 });
    } else if (bot.health > 0 && !bot.isAlive) {
      bot.isAlive = true;
      bot.emit('spawn');
    }
  });
}

},{}],36:[function(require,module,exports){
(function (process){
var Item = require('../item')
  , assert = require('assert')
  , Recipe = require('../recipe')
  , windows = require('../windows')
  , Chest = require('../chest')
  , Furnace = require('../furnace')
  , Dispenser = require('../dispenser')
  , EnchantmentTable = require('../enchantment_table')
  , Vec3 = require('vec3').Vec3;

module.exports = inject;

var QUICK_BAR_START = 36;
var QUICK_BAR_COUNT = 9;

// ms to wait before clicking on a tool so the server can send the new
// damage information
var DIG_CLICK_TIMEOUT = 500;

var armorSlots = {
  head: 5,
  torso: 6,
  legs: 7,
  feet: 8,
};

function inject(bot) {
  var nextActionNumber = 0;
  var windowClickQueue = [];
  var nextQuickBarSlot = 0;

  // 0-8, null = uninitialized
  // which quick bar slot is selected
  bot.quickBarSlot = null;
  bot.inventory = new windows.InventoryWindow(0, "Inventory", 44);
  bot.currentWindow = null;
  bot.heldItem = null;

  function activateItem() {
    bot.client.write('block_place', {
      location:new Vec3(-1,255,-1),
      direction: -1,
      heldItem: itemToNotch(bot.heldItem),
      cursorX: -1,
      cursorY: -1,
      cursorZ: -1,
    });
  }

  function deactivateItem() {
    bot.client.write('block_dig', {
      status: 5,
      location:new Vec3(0,0,0),
      face: 5,
    });
  }


  function putSelectedItemRange(start, end, window, slot, cb) {
    // put the selected item back indow the slot range in window

    // try to put it in an item that already exists and just increase
    // the count.
    tryToJoin();

    function tryToJoin() {
      if (! window.selectedItem) {
        cb();
        return;
      }
      var item = window.findItemRange(start, end, window.selectedItem.type,
          window.selectedItem.metadata, true);
      if (item) {
        clickWindow(item.slot, 0, 0, onClick);
      } else {
        tryToFindEmpty();
      }

      function onClick(err) {
        if (err) {
          cb(err);
        } else {
          tryToJoin();
        }
      }
    }
    function tryToFindEmpty() {
      var emptySlot = window.firstEmptySlotRange(start, end);
      if (emptySlot == null) {
        // if there is still some leftover and slot is not null, click slot
        if (slot == null) {
          tossLeftover();
        } else {
          clickWindow(slot, 0, 0, tossLeftover);
        }
      } else {
        clickWindow(emptySlot, 0, 0, cb);
      }
    }
    function tossLeftover() {
      if (window.selectedItem) {
        clickWindow(-999, 0, 0, cb);
      } else {
        cb();
      }
    }
  }

  function activateBlock(block) {
    // TODO: tell the server that we are not sneaking while doing this
    bot.lookAt(block.position);
    // swing arm animation
    bot.client.write('arm_animation', {
      entityId: bot.entity.id,
      animation: 1,
    });
    // place block message
    bot.client.write('block_place', {
      location:block.position,
      direction: 1,
      heldItem: itemToNotch(bot.heldItem),
      cursorX: 8,
      cursorY: 8,
      cursorZ: 8,
    });
  }

  function openDispenser(dispenserBlock) {
    assert.strictEqual(dispenserBlock.type, 23);
    var dispenser = openBlock(dispenserBlock, Dispenser);
    dispenser.deposit = deposit;
    dispenser.withdraw = withdraw;
    return dispenser;
    function deposit(itemType, metadata, count, cb) {
      var options = {
        window: dispenser.window,
        itemType: itemType,
        metadata: metadata,
        count: count,
        sourceStart: dispenser.window.inventorySlotStart,
        sourceEnd: dispenser.window.inventorySlotStart + windows.INVENTORY_SLOT_COUNT,
        destStart: 0,
        destEnd: dispenser.window.inventorySlotStart,
      };
      transfer(options, cb);
    }
    function withdraw(itemType, metadata, count, cb) {
      var options = {
        window: dispenser.window,
        itemType: itemType,
        metadata: metadata,
        count: count,
        sourceStart: 0,
        sourceEnd: dispenser.window.inventorySlotStart,
        destStart: dispenser.window.inventorySlotStart,
        destEnd: dispenser.window.inventorySlotStart + windows.INVENTORY_SLOT_COUNT,
      };
      transfer(options, cb);
    }
  }

  function openFurnace(furnaceBlock) {
    assert.ok(furnaceBlock.type === 61 || furnaceBlock.type === 62);
    var furnace = openBlock(furnaceBlock, Furnace);
    furnace.takeInput = takeInput;
    furnace.takeFuel = takeFuel;
    furnace.takeOutput = takeOutput;
    furnace.putInput = putInput;
    furnace.putFuel = putFuel;
    bot.client.on('craft_progress_bar', onUpdateWindowProperty);
    furnace.once("close", onClose);
    return furnace;
    function onClose() {
      bot.client.removeListener('craft_progress_bar', onUpdateWindowProperty);
    }
    function onUpdateWindowProperty(packet) {
      if (!furnace.window) return;
      if (packet.windowId !== furnace.window.id) return;
      if (packet.property === 0) {
        furnace.progress = packet.value / 200;
      } else if (packet.property === 1) {
        furnace.fuel = packet.value / 300;
      }
      furnace.emit("update");
    }
    function takeSomething(item, cb) {
      assert.ok(item);
      putAway(item.slot, function(err) {
        if (err) {
          cb(err);
        } else {
          cb(null, item);
        }
      });
    }
    function takeInput(cb) {
      takeSomething(furnace.inputItem(), cb);
    }
    function takeFuel(cb) {
      takeSomething(furnace.fuelItem(), cb);
    }
    function takeOutput(cb) {
      takeSomething(furnace.outputItem(), cb);
    }
    function putSomething(destSlot, itemType, metadata, count, cb) {
      var options = {
        window: furnace.window,
        itemType: itemType,
        metadata: metadata,
        count: count,
        sourceStart: furnace.window.inventorySlotStart,
        sourceEnd: furnace.window.inventorySlotStart + windows.INVENTORY_SLOT_COUNT,
        destStart: destSlot,
      };
      transfer(options, cb);
    }
    function putInput(itemType, metadata, count, cb) {
      putSomething(0, itemType, metadata, count, cb);
    }
    function putFuel(itemType, metadata, count, cb) {
      putSomething(1, itemType, metadata, count, cb);
    }
  }

  function openEnchantmentTable(enchantmentTableBlock) {
    assert.strictEqual(enchantmentTableBlock.type, 116);
    var ready = false;
    var enchantmentTable = openBlock(enchantmentTableBlock, EnchantmentTable);
    resetEnchantmentOptions();
    bot.client.on('craft_progress_bar', onUpdateWindowProperty);
    enchantmentTable.on('updateSlot', onUpdateSlot);
    enchantmentTable.once('close', onClose);
    enchantmentTable.enchant = enchant;
    enchantmentTable.takeTargetItem = takeTargetItem;
    enchantmentTable.putTargetItem = putTargetItem;
    return enchantmentTable;
    function onClose() {
      bot.client.removeListener('craft_progress_bar', onUpdateWindowProperty);
    }
    function onUpdateWindowProperty(packet) {
      if (!enchantmentTable.window) return;
      if (packet.windowId !== enchantmentTable.window.id) return;
      assert.ok(packet.property >= 0);
      assert.ok(packet.property < 3);
      var arr = enchantmentTable.enchantments;
      arr[packet.property].level = packet.value;
      if (arr[0].level && arr[1].level && arr[2].level && ! ready) {
        ready = true;
        enchantmentTable.emit("ready");
      }
    }
    function onUpdateSlot(oldItem, newItem) {
      resetEnchantmentOptions();
    }
    function resetEnchantmentOptions() {
      enchantmentTable.enchantments = [ {level: null}, {level: null}, {level: null} ];
      ready = false;
    }
    function enchant(choice, cb) {
      choice = parseInt(choice, 10); // allow string argument
      cb = cb || noop;
      assert.notEqual(enchantmentTable.enchantments[choice].level, null);
      bot.client.write('enchant_item', {
        windowId: enchantmentTable.window.id,
        enchantment: choice,
      });
      enchantmentTable.once('updateSlot', function(oldItem, newItem) { cb(null, newItem); });
    }
    function takeTargetItem(cb) {
      cb = cb || noop;
      var item = enchantmentTable.targetItem();
      assert.ok(item);
      putAway(item.slot, function(err) {
        cb(err, item);
      });
    }
    function putTargetItem(item, cb) {
      cb = cb || noop;
      moveSlotItem(item.slot, 0, cb);
    }
  }

  function transfer(options, cb) {
    var window = options.window || bot.currentWindow || bot.inventory;
    var itemType = options.itemType;
    var metadata = options.metadata;
    var count = options.count == null ? 1 : options.count;
    cb = cb || noop;
    var firstSourceSlot = null;

    // ranges
    var sourceStart = options.sourceStart;
    var destStart = options.destStart;
    assert.notEqual(sourceStart, null);
    assert.notEqual(destStart, null);
    var sourceEnd = options.sourceEnd == null ? sourceStart + 1 : options.sourceEnd;
    var destEnd = options.destEnd == null ? destStart + 1 : options.destEnd;

    transferOne();

    function transferOne() {
      if (count === 0) {
        putSelectedItemRange(sourceStart, sourceEnd, window, firstSourceSlot, cb);
        return;
      }
      if (!window.selectedItem || window.selectedItem.type !== itemType ||
        (metadata != null && window.selectedItem.metadata !== metadata))
      {
        // we are not holding the item we need. click it.
        var sourceItem = window.findItemRange(sourceStart, sourceEnd, itemType, metadata);
        if (!sourceItem) return cb(new Error("missing source item"));
        if (firstSourceSlot == null) firstSourceSlot = sourceItem.slot;
        clickWindow(sourceItem.slot, 0, 0, function(err) {
          if (err) {
            cb(err);
          } else {
            clickDest();
          }
        });
      } else {
        clickDest();
      }

      function clickDest() {
        assert.notEqual(window.selectedItem.type, null);
        assert.notEqual(window.selectedItem.metadata, null);
        var destItem, destSlot;
        // special case for tossing
        if (destStart === -999) {
          destSlot = -999;
        } else {
          // find a non full item that we can drop into
          destItem = window.findItemRange(destStart, destEnd,
              window.selectedItem.type, window.selectedItem.metadata, true);
          // if that didn't work find an empty slot to drop into
          destSlot = destItem ? destItem.slot :
            window.firstEmptySlotRange(destStart, destEnd);
          // if that didn't work, give up
          if (destSlot == null) {
            cb(new Error("destination full"));
            return;
          }
        }
        clickWindow(destSlot, 1, 0, function(err) {
          if (err) {
            cb(err);
          } else {
            count -= 1;
            transferOne();
          }
        });
      }
    }
  }
  
  function openBlock(block, Class) {
    var session = new Class();
    session.close = close;
    bot.once("windowOpen", onWindowOpen);
    bot.activateBlock(block);
    return session;
    function onWindowOpen(window) {
      if (window.type !== Class.windowType) return;
      session.window = window;
      bot.once("windowClose", onClose);
      bot.on("setSlot:" + window.id, onSetSlot);
      session.emit("open");
    }
    function close() {
      assert.notEqual(session.window, null);
      closeWindow(session.window);
    }
    function onClose() {
      bot.removeListener("setSlot:" + session.window.id, onSetSlot);
      session.window = null;
      session.emit("close");
    }
    function onSetSlot(oldItem, newItem) {
      if (! Item.equal(oldItem, newItem)) {
        session.emit("updateSlot", oldItem, newItem);
      }
    }
  }

  function openChest(chestBlock) {
    assert.ok(chestBlock.type === 54 || chestBlock.type === 130 || chestBlock.type === 146);
    var chest = openBlock(chestBlock, Chest);
    chest.withdraw = withdraw;
    chest.deposit = deposit;
    return chest;
    function deposit(itemType, metadata, count, cb) {
      var options = {
        window: chest.window,
        itemType: itemType,
        metadata: metadata,
        count: count,
        sourceStart: chest.window.inventorySlotStart,
        sourceEnd: chest.window.inventorySlotStart + windows.INVENTORY_SLOT_COUNT,
        destStart: 0,
        destEnd: chest.window.inventorySlotStart,
      };
      transfer(options, cb);
    }
    function withdraw(itemType, metadata, count, cb) {
      var options = {
        window: chest.window,
        itemType: itemType,
        metadata: metadata,
        count: count,
        sourceStart: 0,
        sourceEnd: chest.window.inventorySlotStart,
        destStart: chest.window.inventorySlotStart,
        destEnd: chest.window.inventorySlotStart + windows.INVENTORY_SLOT_COUNT,
      };
      transfer(options, cb);
    }
  }

  function craft(recipe, count, craftingTable, cb) {
    assert.ok(recipe);
    cb = cb || noop;
    count = count == null ? 1 : parseInt(count, 10);
    if (recipe.requiresTable && !craftingTable) {
      cb(new Error("recipe requires craftingTable"));
      return;
    }
    next();
    function next(err) {
      if (err) {
        cb(err);
      } else if (count > 0) {
        count -= 1;
        craftOnce(recipe, craftingTable, next);
      } else {
        cb();
      }
    }
  }

  function craftOnce(recipe, craftingTable, cb) {
    if (craftingTable) {
      activateBlock(craftingTable);
      bot.once('windowOpen', function(window) {
        if (window.type !== 1) {
          cb(new Error("crafting: non craftingTable used as craftingTable"));
          return;
        }
        startClicking(window, 3, 3);
      });
    } else {
      startClicking(bot.inventory, 2, 2);
    }

    function startClicking(window, w, h) {
      var extraSlots = unusedRecipeSlots();
      var ingredientIndex = 0;
      var originalSourceSlot = null;
      var it;
      if (recipe.inShape) {
        it = {
          x: 0,
          y: 0,
          row: recipe.inShape[0],
        };
        clickShape();
      } else {
        nextIngredientsClick();
      }

      function incrementShapeIterator() {
        it.x += 1;
        if (it.x >= it.row.length) {
          it.y += 1;
          if (it.y >= recipe.inShape.length) return null;
          it.x = 0;
          it.row = recipe.inShape[it.y];
        }
        return it;
      }
      function nextShapeClick() {
        if (incrementShapeIterator()) {
          clickShape();
        } else if (! recipe.ingredients) {
          putMaterialsAway();
        } else {
          nextIngredientsClick();
        }
      }
      function clickShape() {
        var destSlot = slot(it.x, it.y);
        var ingredient = it.row[it.x];
        if (!ingredient) return nextShapeClick();
        if (!window.selectedItem || window.selectedItem.type !== ingredient.id ||
            (ingredient.metadata != null &&
             window.selectedItem.metadata !== ingredient.metadata))
        {
          // we are not holding the item we need. click it.
          var sourceItem = window.findInventoryItem(ingredient.id, ingredient.metadata);
          if (!sourceItem) return cb(new Error("missing ingredient"));
          if (originalSourceSlot == null) originalSourceSlot = sourceItem.slot;
          clickWindow(sourceItem.slot, 0, 0, function(err) {
            if (err) return cb(err);
            clickDest();
          });
        } else {
          clickDest();
        }
        function clickDest() {
          clickWindow(destSlot, 1, 0, function(err) {
            if (err) {
              cb(err);
            } else {
              nextShapeClick();
            }
          });
        }
      }
      function nextIngredientsClick() {
        var ingredient = recipe.ingredients[ingredientIndex];
        var destSlot = extraSlots.pop();
        if (!window.selectedItem || window.selectedItem.type !== ingredient.id ||
          (ingredient.metadata != null &&
           window.selectedItem.metadata !== ingredient.metadata))
        {
          // we are not holding the item we need. click it.
          var sourceItem = window.findInventoryItem(ingredient.id, ingredient.metadata);
          if (!sourceItem) return cb(new Error("missing ingredient"));
          if (originalSourceSlot == null) originalSourceSlot = sourceItem.slot;
          clickWindow(sourceItem.slot, 0, 0, clickDest);
        } else {
          clickDest();
        }
        function clickDest() {
          clickWindow(destSlot, 1, 0, function(err) {
            if (err) {
              cb(err);
            } else if (++ingredientIndex < recipe.ingredients.length) {
              nextIngredientsClick();
            } else {
              putMaterialsAway();
            }
          });
        }
      }
      function putMaterialsAway() {
        var start = window.inventorySlotStart;
        var end = start + windows.INVENTORY_SLOT_COUNT;
        putSelectedItemRange(start, end, window, originalSourceSlot, function(err) {
          if (err) {
            cb(err);
          } else {
            grabResult();
          }
        });
      }
      function grabResult() {
        assert.equal(window.selectedItem, null);
        // put the recipe result in the output
        var item = new Item(recipe.type, recipe.count, recipe.metadata);
        window.updateSlot(0, item);
        // shift click result
        putAway(0, function (err) {
          if (err) {
            cb(err);
          } else {
            updateOutShape();
          }
        });
      }
      function updateOutShape() {
        if (! recipe.outShape) {
          for(i=1;i<=w*h;i++)
            window.updateSlot(i,null);
          closeTheWindow();
          return;
        }
        var slotsToClick = [];
        var x, y, row, item, theSlot;
        for (y = 0; y < recipe.outShape.length; ++y) {
          row = recipe.outShape[y];
          for (x = 0; x < row.length; ++x) {
            theSlot = slot(x, y);
            if (row[x]) {
              item = new Item(row[x].id, row[x].count, row[x].metadata || 0);
              slotsToClick.push(theSlot);
            } else {
              item = null;
            }
            window.updateSlot(theSlot, item);
          }
        }
        next();
        function next() {
          var theSlot = slotsToClick.pop();
          if (!theSlot) {
            closeTheWindow();
            return
          }
          putAway(theSlot, function(err) {
            if (err) {
              cb(err);
            } else {
              next();
            }
          });
        }
      }
      function closeTheWindow() {
        closeWindow(window);
        cb();
      }
      function slot(x, y) {
        return 1 + x + w * y;
      }
      function unusedRecipeSlots() {
        var result = [];
        var x, y, row;
        if (recipe.inShape) {
          for (y = 0; y < recipe.inShape.length; ++y) {
            row = recipe.inShape[y];
            for (x = 0; x < row.length; ++x) {
              if (! row[x]) result.push(slot(x, y));
            }
            for (; x < w; ++x) {
              result.push(slot(x, y));
            }
          }
          for (; y < h; ++y) {
            for (x = 0; x < w; ++x) {
              result.push(slot(x, y));
            }
          }
        } else {
          for (y = 0; y < h; ++y) {
            for (x = 0; x < w; ++x) {
              result.push(slot(x, y));
            }
          }
        }
        return result;
      }
    }
  }

  function recipesFor(itemType, metadata, minResultCount, craftingTable) {
    minResultCount = minResultCount == null ? 1 : minResultCount;
    var results = [];
    Recipe.find(itemType, metadata).forEach(function(recipe) {
      if (requirementsMetForRecipe(recipe, minResultCount, craftingTable)) {
        results.push(recipe);
      }
    });
    return results;
  }

  function requirementsMetForRecipe(recipe, minResultCount, craftingTable) {
    if (recipe.requiresTable && !craftingTable) return false;

    // how many times we have to perform the craft to achieve minResultCount
    var craftCount = Math.ceil(minResultCount / recipe.count);

    // false if not enough inventory to make all the ones that we want
    for (var i = 0; i < recipe.delta.length; ++i) {
      var d = recipe.delta[i];
      if (bot.inventory.count(d.type, d.metadata) + d.count * craftCount < 0) return false;
    }

    // otherwise true
    return true;
  }

  function placeBlock(referenceBlock, faceVector) {
    assert.ok(bot.heldItem, "must be holding an item to place a block");
    // TODO: tell the server that we are sneaking while doing this
    var pos = referenceBlock.position;
    bot.client.write('block_place', {
      location: pos,
      direction: vectorToDirection(faceVector),
      heldItem: itemToNotch(bot.heldItem),
      cursorX: 8,
      cursorY: 8,
      cursorZ: 8,
    });
    // update it immediately; the server will correct us if it did not work.
    var dest = pos.plus(faceVector);
    bot._updateBlock(dest, bot.heldItem.type, bot.heldItem.metadata);
  }

  function createActionNumber() {
    return nextActionNumber++;
  }

  function setQuickBarSlot(slot) {
    assert.ok(slot >= 0);
    assert.ok(slot < 9);
    if (bot.quickBarSlot === slot) return;
    bot.quickBarSlot = slot;
    bot.client.write('held_item_slot', {
      slotId: slot,
    });
    updateHeldItem();
  }

  function updateHeldItem() {
    bot.heldItem = bot.inventory.slots[QUICK_BAR_START + bot.quickBarSlot];
  }

  function closeWindow(window) {
    bot.client.write('close_window', {
      windowId: window.id,
    });
    bot.currentWindow = null;
    bot.emit("windowClose", window);
  }

  function confirmTransaction(windowId, actionId, accepted) {
    // drop the queue entries for all the clicks that the server did not send
    // transaction packets for.
    var click = windowClickQueue.shift();
    assert.ok(click.id <= actionId);
    while (actionId > click.id) {
      onAccepted();
      click = windowClickQueue.shift();
    }
    assert.ok(click);

    if (accepted) {
      onAccepted();
    } else {
      onRejected();
    }
    updateHeldItem();

    function onAccepted() {
      var window = windowId === 0 ? bot.inventory : bot.currentWindow;
      if (! window || window.id !== click.windowId) return;
      window.acceptClick(click);
      bot.emit("confirmTransaction" + click.id, true);
    }

    function onRejected() {
      bot.client.write('transaction', {
        windowId: 0,
        action: click.id,
        accepted: false,
      });
      bot.emit("confirmTransaction" + click.id, false);
    }
  }

  function clickWindow(slot, mouseButton, mode, cb) {
    // if you click on the quick bar and have dug recently,
    // wait a bit
    if (slot >= QUICK_BAR_START && bot.lastDigTime != null) {
      var timeSinceLastDig = new Date() - bot.lastDigTime;
      if (timeSinceLastDig < DIG_CLICK_TIMEOUT) {
        setTimeout(function() {
          clickWindow(slot, mouseButton, mode, cb);
        }, DIG_CLICK_TIMEOUT - timeSinceLastDig);
        return;
      }
    }
    cb = cb || noop;
    var window = bot.currentWindow || bot.inventory;

    assert.ok(mouseButton === 0 || mouseButton === 1);
    assert.strictEqual(mode, 0);
    var actionId = createActionNumber();

    var click = {
      slot: slot,
      mouseButton: mouseButton,
      mode: mode,
      id: actionId,
      windowId: window.id,
    };
    windowClickQueue.push(click);
    bot.client.write('window_click', {
      windowId: window.id,
      slot: slot,
      mouseButton: mouseButton,
      action: actionId,
      mode: mode,
      item: slot === -999 ? { blockId: -1 } : itemToNotch(window.slots[slot]),
    });
    bot.once("confirmTransaction" + actionId, function(success) {
      if (success) {
        cb();
      } else {
        cb(new Error("Server rejected transaction."));
      }
    });
    // notchian servers are assholes and only confirm certain transactions.
    if (! window.transactionRequiresConfirmation(click)) {
      // jump the gun and accept the click
      confirmTransaction(window.id, actionId, true);
    }
  }

  function tossStack(item, cb) {
    cb = cb || noop;
    assert.ok(item);
    clickWindow(item.slot, 0, 0, function(err) {
      if (err) return cb(err);
      clickWindow(-999, 0, 0, cb);
      closeWindow(bot.currentWindow || bot.inventory);
    });
  }

  function toss(itemType, metadata, count, cb) {
    var window = bot.currentWindow || bot.inventory;
    var options = {
      window: window,
      itemType: itemType,
      metadata: metadata,
      count: count,
      sourceStart: window.inventorySlotStart,
      sourceEnd: window.inventorySlotStart + windows.INVENTORY_SLOT_COUNT,
      destStart: -999,
    };
    transfer(options, cb);
  }

  function getDestSlot(destination) {
    if (! destination || destination === 'hand') {
      return QUICK_BAR_START + bot.quickBarSlot;
    } else {
      var destSlot = armorSlots[destination];
      assert.ok(destSlot != null, "invalid destination: " + destination);
      return destSlot;
    }
  }

  function unequip(destination, cb) {
    cb = cb || noop;
    if (destination === 'hand') {
      equipEmpty(cb);
    } else {
      disrobe(destination, cb);
    }
  }

  function equipEmpty(cb) {
    for (var i = 0; i < 9; ++i) {
      if (! bot.inventory.slots[QUICK_BAR_START + i]) {
        setQuickBarSlot(i);
        process.nextTick(cb);
        return;
      }
    }
    var slot = bot.inventory.firstEmptyInventorySlot();
    if (! slot) {
      bot.tossStack(bot.heldItem, cb);
      return;
    }
    var equipSlot = QUICK_BAR_START + bot.quickBarSlot;
    clickWindow(equipSlot, 0, 0, function(err) {
      if (err) return cb(err);
      clickWindow(slot, 0, 0, function(err) {
        if (err) return cb(err);
        if (bot.inventory.selectedItem) {
          clickWindow(-999, 0, 0, cb);
        } else {
          cb();
        }
      });
    });
  }

  function putAway(slot, cb) {
    clickWindow(slot, 0, 0, function(err) {
      if (err) return cb(err);
      var window = bot.currentWindow || bot.inventory;
      var start = window.inventorySlotStart;
      var end = start + windows.INVENTORY_SLOT_COUNT;
      putSelectedItemRange(start, end, window, null, cb);
    });
  }

  function disrobe(destination, cb) {
    assert.equal(bot.currentWindow, null);
    var destSlot = getDestSlot(destination);
    putAway(destSlot, cb);
  }

  function equip(item, destination, cb) {
    cb = cb || noop;
    if(typeof item === 'number') {
      item = bot.inventory.findInventoryItem(item);
    }
    if(item == null || typeof item !== 'object') {
      return cb(new Error('Invalid item object in equip'));
    }
    var sourceSlot = item.slot;
    var destSlot = getDestSlot(destination);

    if (sourceSlot === destSlot) {
      // don't need to do anything
      process.nextTick(cb);
      return;
    }

    if (destSlot >= QUICK_BAR_START && sourceSlot >= QUICK_BAR_START) {
      // all we have to do is change the quick bar selection
      bot.setQuickBarSlot(sourceSlot - QUICK_BAR_START);
      process.nextTick(cb);
      return;
    }

    if (destination !== 'hand') {
      moveSlotItem(sourceSlot, destSlot, cb);
      return;
    }

    // find an empty slot on the quick bar to put the source item in
    destSlot = bot.inventory.firstEmptySlotRange(QUICK_BAR_START, QUICK_BAR_START + QUICK_BAR_COUNT);
    if (destSlot == null) {
      // LRU cache for the quick bar items
      destSlot = QUICK_BAR_START + nextQuickBarSlot;
      nextQuickBarSlot = (nextQuickBarSlot + 1) % QUICK_BAR_COUNT;
    }
    bot.setQuickBarSlot(destSlot - QUICK_BAR_START);
    moveSlotItem(sourceSlot, destSlot, cb);
  }

  function moveSlotItem(sourceSlot, destSlot, cb) {
    clickWindow(sourceSlot, 0, 0, function(err) {
      if (err) return cb(err);
      clickWindow(destSlot, 0, 0, function(err) {
        // if we're holding an item, put it back where the source item was.
        // otherwise we're done.
        if (err) {
          cb(err);
        } else if (bot.inventory.selectedItem) {
          clickWindow(sourceSlot, 0, 0, cb);
        } else {
          cb();
        }
      });
    });
  }

  bot.client.on('transaction', function(packet) {
    // confirm transaction
    confirmTransaction(packet.windowId, packet.action, packet.accepted);
  });

  bot.client.on('held_item_slot', function(packet) {
    // held item change
    bot.quickBarSlot = packet.slot;
    updateHeldItem();
  });
  bot.client.on('open_window', function(packet) {
    // open window
    bot.currentWindow = windows.createWindow(packet.windowId,
      packet.inventoryType, packet.windowTitle, packet.slotCount);
    // don't emit windowOpen until we have the slot data
    var window = bot.currentWindow;
    bot.once("setWindowItems:" + window.id, function() {
      bot.emit("windowOpen", window);
    });
  });
  bot.client.on('close_window', function(packet) {
    // close window
    var oldWindow = bot.currentWindow;
    bot.currentWindow = null;
    bot.emit("windowClose", oldWindow);
  });
  bot.client.on('set_slot', function(packet) {
    // set slot
    var window = packet.windowId === 0 ? bot.inventory : bot.currentWindow;
    if (! window || window.id !== packet.windowId) return;
    var newItem = itemFromNotch(packet.item);
    var oldItem = window.slots[packet.slot];
    window.updateSlot(packet.slot, newItem);
    updateHeldItem();
    bot.emit("setSlot:" + window.id, oldItem, newItem);
  });
  bot.client.on('window_items', function(packet) {
    // set window items
    var window = packet.windowId === 0 ? bot.inventory : bot.currentWindow;
    if (! window || window.id !== packet.windowId) return;
    var i, item;
    for (i = 0; i < packet.items.length; ++i) {
      item = itemFromNotch(packet.items[i]);
      window.updateSlot(i, item);
    }
    updateHeldItem();
    bot.emit("setWindowItems:" + window.id);
  });

  bot.equip = equip;
  bot.unequip = unequip;
  bot.toss = toss;
  bot.tossStack = tossStack;
  bot.activateBlock = activateBlock;
  bot.placeBlock = placeBlock;
  bot.setQuickBarSlot = setQuickBarSlot;
  bot.craft = craft;
  bot.recipesFor = recipesFor;
  bot.openChest = openChest;
  bot.openFurnace = openFurnace;
  bot.openDispenser = openDispenser;
  bot.openEnchantmentTable = openEnchantmentTable;
  bot.activateItem = activateItem;
  bot.deactivateItem = deactivateItem;
}

function itemToNotch(item) {
  assert.ok(typeof item === 'object');
  var notchItem=item ? {
    blockId: item.type,
    itemCount: item.count,
    itemDamage: item.metadata,
  } : { blockId: -1 };
  if(item!=null && item.nbt.length!=0)
    notchItem.nbtData=item.nbt;
  return notchItem;
}

function itemFromNotch(item) {
  return item.blockId === -1 ? null :
    new Item(item.blockId, item.itemCount, item.itemDamage, item.nbtData);
}

function noop(err) {
  if (err) throw err;
}

function vectorToDirection(v) {
  if (v.y < 0) {
    return 0;
  } else if (v.y > 0) {
    return 1;
  } else if (v.z < 0) {
    return 2;
  } else if (v.z > 0) {
    return 3;
  } else if (v.x < 0) {
    return 4;
  } else if (v.x > 0) {
    return 5;
  }
  assert.ok(false, "invalid direction vector " + v);
}

}).call(this,require('_process'))
},{"../chest":11,"../dispenser":13,"../enchantment_table":14,"../furnace":22,"../item":23,"../recipe":43,"../windows":44,"_process":98,"assert":76,"vec3":47}],37:[function(require,module,exports){
module.exports = inject;

function inject(bot) {
  bot.client.on('kick_disconnect', function(packet) {
    bot.emit('kicked', packet.reason);
  });
  bot.quit = function(reason) {
    reason = reason || 'disconnect.quitting';
    bot.client.end(reason);
  };
}

},{}],38:[function(require,module,exports){
var Vec3 = require('vec3').Vec3
  , assert = require('assert')
  , math = require('../math')
  , conv = require('../conversions')

module.exports = inject;

var EPSILON = 0.000001
  , PI = Math.PI
  , PI_2 = Math.PI * 2
  , POSITION_UPDATE_INTERVAL_MS = 50
  , PHYSICS_INTERVAL_MS = 20
  , MAX_PHYSICS_DELTA_SECONDS = 0.2;

function inject(bot) {
  var physics = {
    maxGroundSpeed: 4.27, // according to the internet
    terminalVelocity: 20.0, // guess
    walkingAcceleration: 100.0, // seems good
    gravity: 27.0, // seems good
    groundFriction: 0.9, // seems good
    playerApothem: 0.32, // notch's client F3 says 0.30, but that caused spankings
    playerHeight: 1.74, // tested with a binary search
    jumpSpeed: 9.0, // seems good
    yawSpeed: 3.0, // seems good
    sprintSpeed: 1.3, // correct
  };

  var controlState = {
    forward: false,
    back: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
  };
  var jumpQueued = false;
  var lastSentYaw = null;
  var positionUpdateTimer = null;
  var doPhysicsTimer = null;
  var lastPositionSentTime = null;
  var lastPhysicsFrameTime = null;
  var lastFlyingUpdate = 0;

  function doPhysics() {
    var now = new Date();
    var deltaSeconds = (now - lastPhysicsFrameTime) / 1000;
    lastPhysicsFrameTime = now;
    var deltaToUse = deltaSeconds < MAX_PHYSICS_DELTA_SECONDS ?
                     deltaSeconds : MAX_PHYSICS_DELTA_SECONDS;
    nextFrame(deltaToUse);
  }

  function cleanup() {
    stopPhysics();
    stopPositionUpdates();
  }

  function stopPositionUpdates() {
    clearInterval(positionUpdateTimer);
    positionUpdateTimer = null;
  }

  function stopPhysics() {
    clearInterval(doPhysicsTimer);
    doPhysicsTimer = null;
  }

  function nextFrame(deltaSeconds) {
    if (deltaSeconds < EPSILON) return; // too fast
    var pos = bot.entity.position;
    var vel = bot.entity.velocity;

    // derive xy movement vector from controls
    var movementRight = 0;
    if (controlState.right) movementRight += 1;
    if (controlState.left) movementRight -= 1;
    var movementForward = 0;
    if (controlState.forward) movementForward += 1;
    if (controlState.back) movementForward -= 1;

    // acceleration is m/s/s
    var acceleration = new Vec3(0, 0, 0);
    if (movementForward || movementRight) {
      // input acceleration
      var rotationFromInput = Math.atan2(-movementRight, movementForward);
      var inputYaw = bot.entity.yaw + rotationFromInput;
      acceleration.x += physics.walkingAcceleration * -Math.sin(inputYaw);
      acceleration.z += physics.walkingAcceleration * -Math.cos(inputYaw);
      if (controlState.sprint) {
        acceleration.x *= physics.sprintSpeed;
        acceleration.z *= physics.sprintSpeed;
      }
    }

    // jumping
    if ((controlState.jump || jumpQueued) && bot.entity.onGround) {
      vel.y = physics.jumpSpeed;
    }
    jumpQueued = false;

    // gravity
    acceleration.y -= physics.gravity;

    var oldGroundSpeedSquared = calcGroundSpeedSquared();
    if (oldGroundSpeedSquared < EPSILON) {
      // stopped
      vel.x = 0;
      vel.z = 0;
    } else {
      // non-zero ground speed
      var oldGroundSpeed = Math.sqrt(oldGroundSpeedSquared);
      var groundFriction = physics.groundFriction * physics.walkingAcceleration;
      // less friction for air
      if (! bot.entity.onGround) groundFriction *= 0.05;
      // if friction would stop the motion, do it
      var maybeNewGroundFriction = oldGroundSpeed / deltaSeconds;
      groundFriction = groundFriction > maybeNewGroundFriction ?
        maybeNewGroundFriction : groundFriction;
      acceleration.x -= vel.x / oldGroundSpeed * groundFriction;
      acceleration.z -= vel.z / oldGroundSpeed * groundFriction;
    }

    // calculate new speed
    vel.add(acceleration.scaled(deltaSeconds))

    // limit speed
    var groundSpeedSquared = calcGroundSpeedSquared();
    if (groundSpeedSquared > physics.maxGroundSpeed * physics.maxGroundSpeed) {
      var groundSpeed = Math.sqrt(groundSpeedSquared);
      var correctionScale = physics.maxGroundSpeed / groundSpeed;
      vel.x *= correctionScale;
      vel.z *= correctionScale;
    }
    vel.y = math.clamp(-physics.terminalVelocity, vel.y, physics.terminalVelocity);

    // calculate new positions and resolve collisions
    var boundingBox = getBoundingBox();
    var boundingBoxMin, boundingBoxMax;
    if (vel.x !== 0) {
      pos.x += vel.x * deltaSeconds;
      var blockX = Math.floor(pos.x + math.sign(vel.x) * physics.playerApothem);
      boundingBoxMin = new Vec3(blockX, boundingBox.min.y, boundingBox.min.z);
      boundingBoxMax = new Vec3(blockX, boundingBox.max.y, boundingBox.max.z);
      if (collisionInRange(boundingBoxMin, boundingBoxMax)) {
        pos.x = blockX + (vel.x < 0 ? 1 + physics.playerApothem : -physics.playerApothem) * 1.001;
        vel.x = 0;
        boundingBox = getBoundingBox();
      }
    }

    if (vel.z !== 0) {
      pos.z += vel.z * deltaSeconds;
      var blockZ = Math.floor(pos.z + math.sign(vel.z) * physics.playerApothem);
      boundingBoxMin = new Vec3(boundingBox.min.x, boundingBox.min.y, blockZ);
      boundingBoxMax = new Vec3(boundingBox.max.x, boundingBox.max.y, blockZ);
      if (collisionInRange(boundingBoxMin, boundingBoxMax)) {
        pos.z = blockZ + (vel.z < 0 ? 1 + physics.playerApothem : -physics.playerApothem) * 1.001;
        vel.z = 0;
        boundingBox = getBoundingBox();
      }
    }


    bot.entity.onGround = false;
    if (vel.y !== 0) {
      pos.y += vel.y * deltaSeconds;
      var playerHalfHeight = physics.playerHeight / 2;
      var blockY = Math.floor(pos.y + playerHalfHeight + math.sign(vel.y) * playerHalfHeight);
      boundingBoxMin = new Vec3(boundingBox.min.x, blockY, boundingBox.min.z);
      boundingBoxMax = new Vec3(boundingBox.max.x, blockY, boundingBox.max.z);
      if (collisionInRange(boundingBoxMin, boundingBoxMax)) {
        pos.y = blockY + (vel.y < 0 ? 1 : -physics.playerHeight) * 1.001;
        bot.entity.onGround = vel.y < 0 ? true : bot.entity.onGround;
        vel.y = 0;
      }
    }

  }

  function collisionInRange(boundingBoxMin, boundingBoxMax) {
    var cursor = new Vec3(0, 0, 0);
    var block;
    for (cursor.x = boundingBoxMin.x; cursor.x <= boundingBoxMax.x; cursor.x++) {
      for (cursor.y = boundingBoxMin.y; cursor.y <= boundingBoxMax.y; cursor.y++) {
        for (cursor.z = boundingBoxMin.z; cursor.z <= boundingBoxMax.z; cursor.z++) {
          block = bot.blockAt(cursor);
          if (block && block.boundingBox === 'block') return true;
        }
      }
    }

    return false;
  }

  function calcGroundSpeedSquared() {
    var vel = bot.entity.velocity;
    return vel.x * vel.x + vel.z * vel.z;
  }

  function getBoundingBox() {
    var pos = bot.entity.position;
    return {
      min: new Vec3(
        pos.x - physics.playerApothem,
        pos.y,
        pos.z - physics.playerApothem
      ).floor(),
      max: new Vec3(
        pos.x + physics.playerApothem,
        pos.y + physics.playerHeight,
        pos.z + physics.playerApothem
      ).floor(),
    };
  }

  function sendPositionAndLook(entity) {
    // sends data, no logic
    var packet = {
      x: entity.position.x,
      y: entity.position.y,
      z: entity.position.z,
      onGround: entity.onGround,
    };
    packet.yaw = conv.toNotchianYaw(entity.yaw);
    packet.pitch = conv.toNotchianPitch(entity.pitch);
    bot.client.write('position_look', packet);

    bot.emit('move');
  }

  function sendPosition() {
    // increment the yaw in baby steps so that notchian clients (not the server) can keep up.
    if(typeof bot.entity.height !== 'number' || isNaN(bot.entity.height) || bot.entity.height < 0.1 || bot.entity.height > 1.65) {
      // Sometimes this is NaN, not sure of why, it seems it's set via a position packet
      // Note seems some packets handled by 'position' event do not have a stance. 
      bot.entity.height = 1.62;
    }
    var sentPosition = {
      yaw: bot.entity.yaw % PI_2,
      pitch: bot.entity.pitch,
      position: bot.entity.position,
      velocity: bot.entity.velocity,
      height: bot.entity.height,
      onGround: bot.entity.onGround,
    }
    var deltaYaw = math.euclideanMod(sentPosition.yaw - lastSentYaw, PI_2);
    deltaYaw = deltaYaw < 0 ?
      (deltaYaw < -PI ? deltaYaw + PI_2 : deltaYaw) :
      (deltaYaw >  PI ? deltaYaw - PI_2 : deltaYaw);
    var absDeltaYaw = Math.abs(deltaYaw);
    assert.ok(absDeltaYaw < PI + 0.001);

    var now = new Date();
    var deltaMs = now - lastPositionSentTime;
    lastPositionSentTime = now;
    var maxDeltaYaw = deltaMs / 1000 * physics.yawSpeed;
    deltaYaw = absDeltaYaw > maxDeltaYaw ? maxDeltaYaw * math.sign(deltaYaw) : deltaYaw;
    lastSentYaw = (lastSentYaw + deltaYaw) % PI_2;
    sentPosition.yaw = lastSentYaw;

    if(new Date() - lastFlyingUpdate > 1000) {
      // Always send flying messages
      // If you're dead, you're probably on the ground though ...
      if(!bot.isAlive) bot.entity.onGround = true;
      bot.client.write('flying', {onGround: bot.entity.onGround});
      lastFlyingUpdate = new Date();
    }

    // Only send location when alive though
    if(bot.isAlive) {
      sendPositionAndLook(sentPosition);
    }
  }

  bot.physics = physics;

  bot.setControlState = function(control, state) {
    assert.ok(control in controlState, "invalid control: " + control);
    if (controlState[control] === state) return;
    controlState[control] = state;
    if (control === 'jump' && state) {
      jumpQueued = true;
    } else if(control === 'sprint') {
      bot.client.write('entity_action', {
        entityId: bot.entity.id,
        actionId: state ? 4 : 5,
      });
    }
  };

  bot.clearControlStates = function() {
    for (var control in controlState) {
      bot.setControlState(control, false);
    }
  };

  bot.look = function(yaw, pitch, force) {
    bot.entity.yaw = yaw;
    bot.entity.pitch = pitch;
    if (force) lastSentYaw = yaw;
  };

  bot.lookAt = function(point, force) {
    var delta = point.minus(bot.entity.position.offset(0, bot.entity.height, 0));
    var yaw = Math.atan2(-delta.x, -delta.z);
    var groundDistance = Math.sqrt(delta.x * delta.x + delta.z * delta.z);
    var pitch = Math.atan2(delta.y, groundDistance);
    bot.look(yaw, pitch, force);
  };

  // player position and look
  bot.client.on('position', function(packet) {
    if (positionUpdateTimer == null) {
      // got first 0x0d. start the clocks
      bot.entity.yaw = conv.fromNotchianYaw(packet.yaw);
      bot.entity.pitch = conv.fromNotchianPitch(packet.pitch);
      positionUpdateTimer = setInterval(sendPosition, POSITION_UPDATE_INTERVAL_MS);
    }

    bot.entity.velocity.set(0, 0, 0);
    bot.entity.position.set(packet.x, packet.y, packet.z);

    // Packet 0x08 Player Position And Look, does not send a stance
    if(packet.stance) bot.entity.height = packet.stance - bot.entity.position.y;
    else bot.entity.height = 1.62;

    // apologize to the notchian server by echoing an identical position back
    sendPositionAndLook(bot.entity);

    if (doPhysicsTimer == null) {
      lastSentYaw = math.euclideanMod(bot.entity.yaw, PI_2);
      lastPositionSentTime = new Date();
      lastPhysicsFrameTime = new Date();
      doPhysicsTimer = setInterval(doPhysics, PHYSICS_INTERVAL_MS);
    }
  });

  bot.on('mount', stopPhysics);
  bot.on('respawn', stopPhysics);
  bot.on('end', cleanup);
}

},{"../conversions":12,"../math":25,"assert":76,"vec3":47}],39:[function(require,module,exports){
module.exports = inject;

function inject(bot) {
  bot.isRaining = false;
  bot.client.on('game_state_change', function(packet) {
    if (packet.reason === 1) {
      bot.isRaining = true;
      bot.emit('rain');
    } else if (packet.reason === 2) {
      bot.isRaining = false;
      bot.emit('rain');
    }
  });
}

},{}],40:[function(require,module,exports){
var assert = require('assert');

module.exports = inject;

var chatToBits = {
  enabled: 0,
  commandsOnly: 1,
  disabled: 2,
};

var viewDistanceToBits = {
  'far': 0,
  'normal': 1,
  'short': 2,
  'tiny': 3,
};

function inject(bot, options) {
  function setSettings(settings) {
    extend(bot.settings, settings);
    var chatBits = chatToBits[bot.settings.chat];
    assert.ok(chatBits != null, "invalid chat setting: " + bot.settings.chat);
    var viewDistanceBits = viewDistanceToBits[bot.settings.viewDistance];
    assert.ok(viewDistanceBits != null, "invalid view distance setting: " + bot.settings.viewDistance);
    bot.settings.showCape = !!bot.settings.showCape;
    bot.client.write('settings', {
      locale: bot.settings.locale || 'en_US',
      viewDistance: viewDistanceBits,
      chatFlags: chatBits,
      chatColors: bot.settings.colorsEnabled,
      skinParts:255
    });
  }

  bot.settings = {
    chat: options.chat || 'enabled',
    colorsEnabled: options.colorsEnabled == null ? true : options.colorsEnabled,
    viewDistance: options.viewDistance || 'far',
    difficulty: options.difficulty == null ? 2 : options.difficulty,
    showCape: options.showCape == null ? true : !!options.showCape,
  };

  bot.client.once('login', function() {
    setSettings({});
  });

  bot.setSettings = setSettings;
}

var hasOwn = {}.hasOwnProperty;
function extend(obj, src) {
  for (var key in src) {
    if (hasOwn.call(src, key)) obj[key] = src[key];
  }
  return obj;
}

},{"assert":76}],41:[function(require,module,exports){
var Vec3 = require('vec3').Vec3;

module.exports = inject;

function inject(bot) {
  bot.spawnPoint = new Vec3(0, 0, 0);
  bot.client.on('spawn_position', function(packet) {
    bot.spawnPoint=new Vec3(packet.location.x,packet.location.y,packet.location.z);
    bot.emit('game');
  });
}

},{"vec3":47}],42:[function(require,module,exports){
module.exports = inject;

function inject(bot) {
  bot.time = {
    day: null,
    age: null,
  };
  bot.client.on('update_time', function(packet) {
    // for day we ignore the big number since it is always 0
    bot.time.day = longToNumber(packet.time) % 24000;
    bot.time.age = longToNumber(packet.age);
    bot.emit('time');
  });
}

function longToNumber(arr) {
  return arr[1] + 4294967296 * arr[0];
}

},{}],43:[function(require,module,exports){
var recipes = require('./enums/recipes');

module.exports = Recipe;

function Recipe(recipeEnumItem) {
  this.type = recipeEnumItem.type;
  this.count = recipeEnumItem.count;
  this.metadata = recipeEnumItem.metadata;

  var x, y, row, myRow;
  this.inShape = recipeEnumItem.inShape ?
    reformatShape(recipeEnumItem.inShape) : null;
  this.outShape = recipeEnumItem.outShape ?
    reformatShape(recipeEnumItem.outShape) : null;
  this.ingredients = recipeEnumItem.ingredients ?
    reformatIngredients(recipeEnumItem.ingredients) : null;
  this.delta = computeDelta(this);
  this.requiresTable = computeRequiresTable(this);
}

Recipe.find = function(itemType, metadata) {
  var results = [];
  (recipes[itemType] || []).forEach(function(recipeEnumItem) {
    if ((metadata == null || recipeEnumItem.metadata === metadata)) {
      results.push(new Recipe(recipeEnumItem));
    }
  });
  return results;
};

function computeRequiresTable(recipe) {
  var spaceLeft = 4;

  var x, y, row;
  if (recipe.inShape) {
    if (recipe.inShape.length > 2) return true;
    for (y = 0; y < recipe.inShape.length; ++y) {
      row = recipe.inShape[y];
      if (row.length > 2) return true;
      for (x = 0; x < row.length; ++x) {
        if (row[x]) spaceLeft -= 1;
      }
    }
  }
  if (recipe.ingredients) spaceLeft -= recipe.ingredients.length;
  return spaceLeft < 0;
}

function computeDelta(recipe) {
  // returns a list of item type and metadata with the delta how many more or
  // less you will have in your inventory after crafting
  var delta = [];
  if (recipe.inShape) applyShape(recipe.inShape, -1);
  if (recipe.outShape) applyShape(recipe.outShape, 1);
  if (recipe.ingredients) applyIngredients(recipe.ingredients);
  // add the result
  add(recipe.type, recipe.metadata, recipe.count);
  return delta;

  function add(type, metadata, count) {
    metadata = metadata == null ? null : metadata;
    for (var i = 0; i < delta.length; ++i) {
      var d = delta[i];
      if (d.type === type && d.metadata === metadata) {
        d.count += count;
        return;
      }
    }
    delta.push({
      type: type,
      metadata: metadata,
      count: count,
    });
  }

  function applyShape(shape, direction) {
    var x, y, row;
    for (y = 0; y < shape.length; ++y) {
      row = recipe.inShape[y];
      for (x = 0; x < row.length; ++x) {
        if (row[x] != null) add(row[x].id, null, direction);
      }
    }
  }

  function applyIngredients(ingredients) {
    var i, id;
    for (i = 0; i < ingredients.length; ++i) {
      id = ingredients[i].id;
      add(ingredients[i].id, ingredients[i].metadata, -1);
    }
  }
}

function reformatShape(shape) {
  var out = new Array(shape.length);
  var x, y, row, outRow;
  for (y = 0; y < shape.length; ++y) {
    row = shape[y];
    out[y] = outRow = new Array(row.length);
    for (x = 0; x < outRow.length; ++x) {
      outRow[x] = row[x] ? {
        id: row[x],
        metadata: null,
        count: 1,
      } : null;
    }
  }
  return out;
}

function reformatIngredients(ingredients) {
  var out = new Array(ingredients.length);
  for (var i = 0; i < out.length; ++i) {
    out[i] = {
      id: ingredients[i].id,
      metadata: ingredients[i].metadata,
    };
  }
  return out;
}

},{"./enums/recipes":21}],44:[function(require,module,exports){
var util = require('util')
  , assert = require('assert')
  , Item = require('./item')


var INVENTORY_SLOT_COUNT = 36;

module.exports = {
  createWindow: createWindow,
  Window: Window,
  InventoryWindow: InventoryWindow,
  ChestWindow: ChestWindow,
  CraftingTableWindow: CraftingTableWindow,
  FurnaceWindow: FurnaceWindow,
  DispenserWindow: DispenserWindow,
  EnchantmentTableWindow: EnchantmentTableWindow,
  BrewingStandWindow: BrewingStandWindow,
  INVENTORY_SLOT_COUNT: INVENTORY_SLOT_COUNT,
};

var windows = {
  "minecraft:chest":ChestWindow,
  "minecraft:crafting_table":CraftingTableWindow,
  "minecraft:furnace":FurnaceWindow,
  "minecraft:dispenser":DispenserWindow,
  "minecraft:enchanting_table":EnchantmentTableWindow,
  "minecraft:brewing_stand":BrewingStandWindow,
};

function createWindow(id, type, title, slotCount) {
  return new windows[type](id, title, slotCount);
}

function Window(id, type, title, slotCount) {
  this.id = id;
  this.type = type;
  this.title = title;
  this.slots = new Array(slotCount);
  // in vanilla client, this is the item you are holding with the
  // mouse cursor
  this.selectedItem = null;
}

Window.prototype.findItemRange = function(start, end, itemType, metadata, notFull) {
  assert.notEqual(itemType, null);
  for (var i = start; i < end; ++i) {
    var item = this.slots[i];
    if (item && itemType === item.type &&
       (metadata == null || metadata === item.metadata) &&
       (!notFull || item.count < item.stackSize))
    {
      return item;
    }
  }
  return null;
};

Window.prototype.findInventoryItem = function(itemType, metadata, notFull) {
  assert.ok(this.inventorySlotStart != null);

  var end = this.inventorySlotStart + INVENTORY_SLOT_COUNT;
  return this.findItemRange(this.inventorySlotStart, end, itemType, metadata, notFull);
};

Window.prototype.firstEmptySlotRange = function(start, end) {
  for (var i = start; i < end; ++i) {
    if (!this.slots[i]) return i;
  }
  return null;
};

Window.prototype.firstEmptyInventorySlot = function() {
  var end = this.inventorySlotStart + INVENTORY_SLOT_COUNT;
  return this.firstEmptySlotRange(this.inventorySlotStart, end);
};

Window.prototype.acceptClick = function(click) {
  assert.ok(click.mouseButton === 0 || click.mouseButton === 1);
  var invSlotEnd = this.inventorySlotStart + INVENTORY_SLOT_COUNT;
  if (click.slot === -999) {
    this.acceptOutsideWindowClick(click);
  } else if (click.slot >= this.inventorySlotStart && click.slot < invSlotEnd) {
    this.acceptInventoryClick(click);
  } else {
    this.acceptUniqueClick(click);
  }
};

Window.prototype.acceptOutsideWindowClick = function(click) {
  assert.strictEqual(click.mode, 0, "unimplemented");
  if (click.mouseButton === 0) {
    this.selectedItem = null;
  } else if (click.mouseButton === 1) {
    this.selectedItem.count -= 1;
    if (! this.selectedItem.count) this.selectedItem = null;
  } else {
    assert.ok(false, "unimplemented");
  }
}

Window.prototype.acceptInventoryClick = function(click) {
  if (click.mouseButton === 0) {
    if (click.mode > 0) {
      assert.ok(false, "unimplemented");
    } else {
      this.acceptSwapAreaLeftClick(click);
    }
  } else if (click.mouseButton === 1) {
    this.acceptSwapAreaRightClick(click);
  } else {
    assert.ok(false, "unimplemented");
  }
};

Window.prototype.acceptNonInventorySwapAreaClick = function(click) {
  assert.strictEqual(click.mode, 0, "unimplemented");
  if (click.mouseButton === 0) {
    this.acceptSwapAreaLeftClick(click);
  } else if (click.mouseButton === 1) {
    this.acceptSwapAreaRightClick(click);
  } else {
    assert.ok(false, "unimplemented");
  }
};


Window.prototype.acceptSwapAreaRightClick = function(click) {
  assert.strictEqual(click.mouseButton, 1);
  assert.strictEqual(click.mode, 0);

  var item = this.slots[click.slot];
  if (this.selectedItem) {
    if (item) {
      if (item.type === this.selectedItem.type &&
          item.metadata === this.selectedItem.metadata)
      {
        item.count += 1;
        this.selectedItem.count -= 1;
        if (this.selectedItem.count === 0) this.selectedItem = null;
      } else {
        // swap selected item and window item
        this.updateSlot(click.slot, this.selectedItem);
        this.selectedItem = item;
      }
    } else {
      if (this.selectedItem.count === 1) {
        this.updateSlot(click.slot, this.selectedItem);
        this.selectedItem = null;
      } else {
        this.updateSlot(click.slot, new Item(this.selectedItem.type, 1,
              this.selectedItem.metadata, this.selectedItem.nbt));
        this.selectedItem.count -= 1;
      }
    }
  } else if (item) {
    // grab 1/2 of item
    this.selectedItem = new Item(item.type, Math.ceil(item.count / 2),
        item.metadata, item.nbt);
    item.count -= this.selectedItem.count;
    if (item.count === 0) this.updateSlot(item.slot, null);
  }
}

Window.prototype.acceptSwapAreaLeftClick = function(click) {
  assert.strictEqual(click.mouseButton, 0);
  assert.strictEqual(click.mode, 0);
  var item = this.slots[click.slot];
  if (item && this.selectedItem &&
      item.type === this.selectedItem.type &&
      item.metadata === this.selectedItem.metadata)
  {
    // drop as many held item counts into the slot as we can
    var newCount = item.count + this.selectedItem.count;
    var leftover = newCount - item.stackSize;
    if (leftover <= 0) {
      item.count = newCount;
      this.selectedItem = null;
    } else {
      item.count = item.stackSize;
      this.selectedItem.count = leftover;
    }
  } else {
    // swap selected item and window item
    var tmp = this.selectedItem;
    this.selectedItem = item;
    this.updateSlot(click.slot, tmp);
  }
};

Window.prototype.updateSlot = function (slot, newItem) {
  if (newItem) newItem.slot = slot;
  this.slots[slot] = newItem;
};

Window.prototype.acceptUniqueClick = function(click) {
  assert.ok(false, "override this method");
};

Window.prototype.countRange = function(start, end, itemType, metadata) {
  var sum = 0;
  for (var i = start; i < end; ++i) {
    var item = this.slots[i];
    if (item && itemType === item.type &&
       (metadata == null || item.metadata === metadata))
    {
      sum += item.count;
    }
  }
  return sum;
};

Window.prototype.itemsRange = function(start, end) {
  var results = [];
  for (var i = start; i < end; ++i) {
    var item = this.slots[i];
    if (item) results.push(item);
  }
  return results;
};

Window.prototype.count = function(itemType, metadata) {
  itemType = parseInt(itemType, 10); // allow input to be string
  assert.ok(this.inventorySlotStart != null);

  var end = this.inventorySlotStart + INVENTORY_SLOT_COUNT;
  return this.countRange(this.inventorySlotStart, end, itemType, metadata);
};

Window.prototype.items = function() {
  assert.ok(this.inventorySlotStart != null);
  var end = this.inventorySlotStart + INVENTORY_SLOT_COUNT;
  return this.itemsRange(this.inventorySlotStart, end);
};

Window.prototype.emptySlotCount = function() {
  var end = this.inventorySlotStart + INVENTORY_SLOT_COUNT;
  var count = 0;
  for (var i = this.inventorySlotStart; i < end; ++i) {
    if (!this.slots[i]) count += 1;
  }
  return count;
};

Window.prototype.transactionRequiresConfirmation = function(click) {
  return true;
};

Window.prototype.acceptCraftingClick = function(click) {
  assert.strictEqual(click.mouseButton, 0);
  assert.strictEqual(click.mode, 0);
  assert.equal(this.selectedItem, null);
  this.acceptNonInventorySwapAreaClick(click);
};

function InventoryWindow(id, title, slotCount) {
  Window.call(this, id, null, title, slotCount);
}
util.inherits(InventoryWindow, Window);

InventoryWindow.prototype.inventorySlotStart = 9;

InventoryWindow.prototype.acceptUniqueClick = function(click) {
  if (click.slot === 0) {
    this.acceptCraftingClick(click);
  } else if (click.slot >= 1 && click.slot < 9) {
    this.acceptNonInventorySwapAreaClick(click);
  }
}


function ChestWindow(id, title, slotCount) {
  Window.call(this, id, 0, title, slotCount);

  this.inventorySlotStart = slotCount > 62 ? 54 : 27;
}
util.inherits(ChestWindow, Window);

ChestWindow.prototype.chestItems = function() {
  return this.itemsRange(0, this.inventorySlotStart);
};

ChestWindow.prototype.chestCount = function(itemType, metadata) {
  itemType = parseInt(itemType, 10); // allow input to be a string
  return this.countRange(0, this.inventorySlotStart, itemType, metadata);
};

ChestWindow.prototype.findChestItem = function(itemType, metadata, notFull) {
  itemType = parseInt(itemType, 10); // allow input to be a string
  return this.findItemRange(0, this.inventorySlotStart, itemType, metadata, notFull);
};

ChestWindow.prototype.firstEmptyChestSlot = function() {
  return this.firstEmptySlotRange(0, this.inventorySlotStart);
};

ChestWindow.prototype.acceptUniqueClick = function(click) {
  assert.ok(click.slot >= 0);
  assert.ok(click.slot < this.inventorySlotStart);
  this.acceptNonInventorySwapAreaClick(click);
};

function CraftingTableWindow(id, title, slotCount) {
  Window.call(this, id, 1, title, slotCount);
}
util.inherits(CraftingTableWindow, Window);

CraftingTableWindow.prototype.inventorySlotStart = 10;

CraftingTableWindow.prototype.acceptUniqueClick = function(click) {
  if (click.slot === 0) {
    this.acceptCraftingClick(click);
  } else if (click.slot >= 1 && click.slot < 10) {
    this.acceptNonInventorySwapAreaClick(click);
  }
};

function FurnaceWindow(id, title, slotCount) {
  Window.call(this, id, 2, title, slotCount);
}
util.inherits(FurnaceWindow, Window);

FurnaceWindow.prototype.inventorySlotStart = 3;

FurnaceWindow.prototype.acceptUniqueClick = function(click) {
  this.acceptNonInventorySwapAreaClick(click);
}

function DispenserWindow(id, title, slotCount) {
  Window.call(this, id, 3, title, slotCount);
}
util.inherits(DispenserWindow, Window);

DispenserWindow.prototype.inventorySlotStart = 9;

DispenserWindow.prototype.dispenserItems = function() {
  return this.itemsRange(0, this.inventorySlotStart);
};

DispenserWindow.prototype.dispenserCount = function(itemType, metadata) {
  itemType = parseInt(itemType, 10); // allow input to be a string
  return this.countRange(0, this.inventorySlotStart, itemType, metadata);
};

DispenserWindow.prototype.acceptUniqueClick = function(click) {
  assert.ok(click.slot >= 0);
  assert.ok(click.slot < this.inventorySlotStart);
  this.acceptNonInventorySwapAreaClick(click);
};

function EnchantmentTableWindow(id, title, slotCount) {
  // this window incorrectly reports the number of slots as 9. it should be 1.
  Window.call(this, id, 4, title, 1);
}
util.inherits(EnchantmentTableWindow, Window);

EnchantmentTableWindow.prototype.inventorySlotStart = 1;

EnchantmentTableWindow.prototype.acceptUniqueClick = function(click) {
  if (click.slot === 0) {
    // this is technically incorrect. there are some exceptions to enchantment
    // table slot clicks but we're going to bank on them not being used.
    this.acceptNonInventorySwapAreaClick(click);
  }
}


function BrewingStandWindow(id, title, slotCount) {
  Window.call(this, id, 5, title, slotCount);
}
util.inherits(BrewingStandWindow, Window);

BrewingStandWindow.prototype.inventorySlotStart = 5;

},{"./item":23,"assert":76,"util":113}],45:[function(require,module,exports){
(function (global){
/**
 * @license
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modern -o ./dist/lodash.js`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
;(function() {

  /** Used as a safe reference for `undefined` in pre ES5 environments */
  var undefined;

  /** Used to pool arrays and objects used internally */
  var arrayPool = [],
      objectPool = [];

  /** Used to generate unique IDs */
  var idCounter = 0;

  /** Used to prefix keys to avoid issues with `__proto__` and properties on `Object.prototype` */
  var keyPrefix = +new Date + '';

  /** Used as the size when optimizations are enabled for large arrays */
  var largeArraySize = 75;

  /** Used as the max size of the `arrayPool` and `objectPool` */
  var maxPoolSize = 40;

  /** Used to detect and test whitespace */
  var whitespace = (
    // whitespace
    ' \t\x0B\f\xA0\ufeff' +

    // line terminators
    '\n\r\u2028\u2029' +

    // unicode category "Zs" space separators
    '\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000'
  );

  /** Used to match empty string literals in compiled template source */
  var reEmptyStringLeading = /\b__p \+= '';/g,
      reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
      reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

  /**
   * Used to match ES6 template delimiters
   * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-literals-string-literals
   */
  var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

  /** Used to match regexp flags from their coerced string values */
  var reFlags = /\w*$/;

  /** Used to detected named functions */
  var reFuncName = /^\s*function[ \n\r\t]+\w/;

  /** Used to match "interpolate" template delimiters */
  var reInterpolate = /<%=([\s\S]+?)%>/g;

  /** Used to match leading whitespace and zeros to be removed */
  var reLeadingSpacesAndZeros = RegExp('^[' + whitespace + ']*0+(?=.$)');

  /** Used to ensure capturing order of template delimiters */
  var reNoMatch = /($^)/;

  /** Used to detect functions containing a `this` reference */
  var reThis = /\bthis\b/;

  /** Used to match unescaped characters in compiled string literals */
  var reUnescapedString = /['\n\r\t\u2028\u2029\\]/g;

  /** Used to assign default `context` object properties */
  var contextProps = [
    'Array', 'Boolean', 'Date', 'Function', 'Math', 'Number', 'Object',
    'RegExp', 'String', '_', 'attachEvent', 'clearTimeout', 'isFinite', 'isNaN',
    'parseInt', 'setTimeout'
  ];

  /** Used to make template sourceURLs easier to identify */
  var templateCounter = 0;

  /** `Object#toString` result shortcuts */
  var argsClass = '[object Arguments]',
      arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      objectClass = '[object Object]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';

  /** Used to identify object classifications that `_.clone` supports */
  var cloneableClasses = {};
  cloneableClasses[funcClass] = false;
  cloneableClasses[argsClass] = cloneableClasses[arrayClass] =
  cloneableClasses[boolClass] = cloneableClasses[dateClass] =
  cloneableClasses[numberClass] = cloneableClasses[objectClass] =
  cloneableClasses[regexpClass] = cloneableClasses[stringClass] = true;

  /** Used as an internal `_.debounce` options object */
  var debounceOptions = {
    'leading': false,
    'maxWait': 0,
    'trailing': false
  };

  /** Used as the property descriptor for `__bindData__` */
  var descriptor = {
    'configurable': false,
    'enumerable': false,
    'value': null,
    'writable': false
  };

  /** Used to determine if values are of the language type Object */
  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  /** Used to escape characters for inclusion in compiled string literals */
  var stringEscapes = {
    '\\': '\\',
    "'": "'",
    '\n': 'n',
    '\r': 'r',
    '\t': 't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  /** Used as a reference to the global object */
  var root = (objectTypes[typeof window] && window) || this;

  /** Detect free variable `exports` */
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  /** Detect free variable `module` */
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

  /** Detect the popular CommonJS extension `module.exports` */
  var moduleExports = freeModule && freeModule.exports === freeExports && freeExports;

  /** Detect free variable `global` from Node.js or Browserified code and use it as `root` */
  var freeGlobal = objectTypes[typeof global] && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
    root = freeGlobal;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * The base implementation of `_.indexOf` without support for binary searches
   * or `fromIndex` constraints.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {*} value The value to search for.
   * @param {number} [fromIndex=0] The index to search from.
   * @returns {number} Returns the index of the matched value or `-1`.
   */
  function baseIndexOf(array, value, fromIndex) {
    var index = (fromIndex || 0) - 1,
        length = array ? array.length : 0;

    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * An implementation of `_.contains` for cache objects that mimics the return
   * signature of `_.indexOf` by returning `0` if the value is found, else `-1`.
   *
   * @private
   * @param {Object} cache The cache object to inspect.
   * @param {*} value The value to search for.
   * @returns {number} Returns `0` if `value` is found, else `-1`.
   */
  function cacheIndexOf(cache, value) {
    var type = typeof value;
    cache = cache.cache;

    if (type == 'boolean' || value == null) {
      return cache[value] ? 0 : -1;
    }
    if (type != 'number' && type != 'string') {
      type = 'object';
    }
    var key = type == 'number' ? value : keyPrefix + value;
    cache = (cache = cache[type]) && cache[key];

    return type == 'object'
      ? (cache && baseIndexOf(cache, value) > -1 ? 0 : -1)
      : (cache ? 0 : -1);
  }

  /**
   * Adds a given value to the corresponding cache object.
   *
   * @private
   * @param {*} value The value to add to the cache.
   */
  function cachePush(value) {
    var cache = this.cache,
        type = typeof value;

    if (type == 'boolean' || value == null) {
      cache[value] = true;
    } else {
      if (type != 'number' && type != 'string') {
        type = 'object';
      }
      var key = type == 'number' ? value : keyPrefix + value,
          typeCache = cache[type] || (cache[type] = {});

      if (type == 'object') {
        (typeCache[key] || (typeCache[key] = [])).push(value);
      } else {
        typeCache[key] = true;
      }
    }
  }

  /**
   * Used by `_.max` and `_.min` as the default callback when a given
   * collection is a string value.
   *
   * @private
   * @param {string} value The character to inspect.
   * @returns {number} Returns the code unit of given character.
   */
  function charAtCallback(value) {
    return value.charCodeAt(0);
  }

  /**
   * Used by `sortBy` to compare transformed `collection` elements, stable sorting
   * them in ascending order.
   *
   * @private
   * @param {Object} a The object to compare to `b`.
   * @param {Object} b The object to compare to `a`.
   * @returns {number} Returns the sort order indicator of `1` or `-1`.
   */
  function compareAscending(a, b) {
    var ac = a.criteria,
        bc = b.criteria,
        index = -1,
        length = ac.length;

    while (++index < length) {
      var value = ac[index],
          other = bc[index];

      if (value !== other) {
        if (value > other || typeof value == 'undefined') {
          return 1;
        }
        if (value < other || typeof other == 'undefined') {
          return -1;
        }
      }
    }
    // Fixes an `Array#sort` bug in the JS engine embedded in Adobe applications
    // that causes it, under certain circumstances, to return the same value for
    // `a` and `b`. See https://github.com/jashkenas/underscore/pull/1247
    //
    // This also ensures a stable sort in V8 and other engines.
    // See http://code.google.com/p/v8/issues/detail?id=90
    return a.index - b.index;
  }

  /**
   * Creates a cache object to optimize linear searches of large arrays.
   *
   * @private
   * @param {Array} [array=[]] The array to search.
   * @returns {null|Object} Returns the cache object or `null` if caching should not be used.
   */
  function createCache(array) {
    var index = -1,
        length = array.length,
        first = array[0],
        mid = array[(length / 2) | 0],
        last = array[length - 1];

    if (first && typeof first == 'object' &&
        mid && typeof mid == 'object' && last && typeof last == 'object') {
      return false;
    }
    var cache = getObject();
    cache['false'] = cache['null'] = cache['true'] = cache['undefined'] = false;

    var result = getObject();
    result.array = array;
    result.cache = cache;
    result.push = cachePush;

    while (++index < length) {
      result.push(array[index]);
    }
    return result;
  }

  /**
   * Used by `template` to escape characters for inclusion in compiled
   * string literals.
   *
   * @private
   * @param {string} match The matched character to escape.
   * @returns {string} Returns the escaped character.
   */
  function escapeStringChar(match) {
    return '\\' + stringEscapes[match];
  }

  /**
   * Gets an array from the array pool or creates a new one if the pool is empty.
   *
   * @private
   * @returns {Array} The array from the pool.
   */
  function getArray() {
    return arrayPool.pop() || [];
  }

  /**
   * Gets an object from the object pool or creates a new one if the pool is empty.
   *
   * @private
   * @returns {Object} The object from the pool.
   */
  function getObject() {
    return objectPool.pop() || {
      'array': null,
      'cache': null,
      'criteria': null,
      'false': false,
      'index': 0,
      'null': false,
      'number': null,
      'object': null,
      'push': null,
      'string': null,
      'true': false,
      'undefined': false,
      'value': null
    };
  }

  /**
   * Releases the given array back to the array pool.
   *
   * @private
   * @param {Array} [array] The array to release.
   */
  function releaseArray(array) {
    array.length = 0;
    if (arrayPool.length < maxPoolSize) {
      arrayPool.push(array);
    }
  }

  /**
   * Releases the given object back to the object pool.
   *
   * @private
   * @param {Object} [object] The object to release.
   */
  function releaseObject(object) {
    var cache = object.cache;
    if (cache) {
      releaseObject(cache);
    }
    object.array = object.cache = object.criteria = object.object = object.number = object.string = object.value = null;
    if (objectPool.length < maxPoolSize) {
      objectPool.push(object);
    }
  }

  /**
   * Slices the `collection` from the `start` index up to, but not including,
   * the `end` index.
   *
   * Note: This function is used instead of `Array#slice` to support node lists
   * in IE < 9 and to ensure dense arrays are returned.
   *
   * @private
   * @param {Array|Object|string} collection The collection to slice.
   * @param {number} start The start index.
   * @param {number} end The end index.
   * @returns {Array} Returns the new array.
   */
  function slice(array, start, end) {
    start || (start = 0);
    if (typeof end == 'undefined') {
      end = array ? array.length : 0;
    }
    var index = -1,
        length = end - start || 0,
        result = Array(length < 0 ? 0 : length);

    while (++index < length) {
      result[index] = array[start + index];
    }
    return result;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Create a new `lodash` function using the given context object.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} [context=root] The context object.
   * @returns {Function} Returns the `lodash` function.
   */
  function runInContext(context) {
    // Avoid issues with some ES3 environments that attempt to use values, named
    // after built-in constructors like `Object`, for the creation of literals.
    // ES5 clears this up by stating that literals must use built-in constructors.
    // See http://es5.github.io/#x11.1.5.
    context = context ? _.defaults(root.Object(), context, _.pick(root, contextProps)) : root;

    /** Native constructor references */
    var Array = context.Array,
        Boolean = context.Boolean,
        Date = context.Date,
        Function = context.Function,
        Math = context.Math,
        Number = context.Number,
        Object = context.Object,
        RegExp = context.RegExp,
        String = context.String,
        TypeError = context.TypeError;

    /**
     * Used for `Array` method references.
     *
     * Normally `Array.prototype` would suffice, however, using an array literal
     * avoids issues in Narwhal.
     */
    var arrayRef = [];

    /** Used for native method references */
    var objectProto = Object.prototype;

    /** Used to restore the original `_` reference in `noConflict` */
    var oldDash = context._;

    /** Used to resolve the internal [[Class]] of values */
    var toString = objectProto.toString;

    /** Used to detect if a method is native */
    var reNative = RegExp('^' +
      String(toString)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/toString| for [^\]]+/g, '.*?') + '$'
    );

    /** Native method shortcuts */
    var ceil = Math.ceil,
        clearTimeout = context.clearTimeout,
        floor = Math.floor,
        fnToString = Function.prototype.toString,
        getPrototypeOf = isNative(getPrototypeOf = Object.getPrototypeOf) && getPrototypeOf,
        hasOwnProperty = objectProto.hasOwnProperty,
        push = arrayRef.push,
        setTimeout = context.setTimeout,
        splice = arrayRef.splice,
        unshift = arrayRef.unshift;

    /** Used to set meta data on functions */
    var defineProperty = (function() {
      // IE 8 only accepts DOM elements
      try {
        var o = {},
            func = isNative(func = Object.defineProperty) && func,
            result = func(o, o, o) && func;
      } catch(e) { }
      return result;
    }());

    /* Native method shortcuts for methods with the same name as other `lodash` methods */
    var nativeCreate = isNative(nativeCreate = Object.create) && nativeCreate,
        nativeIsArray = isNative(nativeIsArray = Array.isArray) && nativeIsArray,
        nativeIsFinite = context.isFinite,
        nativeIsNaN = context.isNaN,
        nativeKeys = isNative(nativeKeys = Object.keys) && nativeKeys,
        nativeMax = Math.max,
        nativeMin = Math.min,
        nativeParseInt = context.parseInt,
        nativeRandom = Math.random;

    /** Used to lookup a built-in constructor by [[Class]] */
    var ctorByClass = {};
    ctorByClass[arrayClass] = Array;
    ctorByClass[boolClass] = Boolean;
    ctorByClass[dateClass] = Date;
    ctorByClass[funcClass] = Function;
    ctorByClass[objectClass] = Object;
    ctorByClass[numberClass] = Number;
    ctorByClass[regexpClass] = RegExp;
    ctorByClass[stringClass] = String;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object which wraps the given value to enable intuitive
     * method chaining.
     *
     * In addition to Lo-Dash methods, wrappers also have the following `Array` methods:
     * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`, `splice`,
     * and `unshift`
     *
     * Chaining is supported in custom builds as long as the `value` method is
     * implicitly or explicitly included in the build.
     *
     * The chainable wrapper functions are:
     * `after`, `assign`, `bind`, `bindAll`, `bindKey`, `chain`, `compact`,
     * `compose`, `concat`, `countBy`, `create`, `createCallback`, `curry`,
     * `debounce`, `defaults`, `defer`, `delay`, `difference`, `filter`, `flatten`,
     * `forEach`, `forEachRight`, `forIn`, `forInRight`, `forOwn`, `forOwnRight`,
     * `functions`, `groupBy`, `indexBy`, `initial`, `intersection`, `invert`,
     * `invoke`, `keys`, `map`, `max`, `memoize`, `merge`, `min`, `object`, `omit`,
     * `once`, `pairs`, `partial`, `partialRight`, `pick`, `pluck`, `pull`, `push`,
     * `range`, `reject`, `remove`, `rest`, `reverse`, `shuffle`, `slice`, `sort`,
     * `sortBy`, `splice`, `tap`, `throttle`, `times`, `toArray`, `transform`,
     * `union`, `uniq`, `unshift`, `unzip`, `values`, `where`, `without`, `wrap`,
     * and `zip`
     *
     * The non-chainable wrapper functions are:
     * `clone`, `cloneDeep`, `contains`, `escape`, `every`, `find`, `findIndex`,
     * `findKey`, `findLast`, `findLastIndex`, `findLastKey`, `has`, `identity`,
     * `indexOf`, `isArguments`, `isArray`, `isBoolean`, `isDate`, `isElement`,
     * `isEmpty`, `isEqual`, `isFinite`, `isFunction`, `isNaN`, `isNull`, `isNumber`,
     * `isObject`, `isPlainObject`, `isRegExp`, `isString`, `isUndefined`, `join`,
     * `lastIndexOf`, `mixin`, `noConflict`, `parseInt`, `pop`, `random`, `reduce`,
     * `reduceRight`, `result`, `shift`, `size`, `some`, `sortedIndex`, `runInContext`,
     * `template`, `unescape`, `uniqueId`, and `value`
     *
     * The wrapper functions `first` and `last` return wrapped values when `n` is
     * provided, otherwise they return unwrapped values.
     *
     * Explicit chaining can be enabled by using the `_.chain` method.
     *
     * @name _
     * @constructor
     * @category Chaining
     * @param {*} value The value to wrap in a `lodash` instance.
     * @returns {Object} Returns a `lodash` instance.
     * @example
     *
     * var wrapped = _([1, 2, 3]);
     *
     * // returns an unwrapped value
     * wrapped.reduce(function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * // returns a wrapped value
     * var squares = wrapped.map(function(num) {
     *   return num * num;
     * });
     *
     * _.isArray(squares);
     * // => false
     *
     * _.isArray(squares.value());
     * // => true
     */
    function lodash(value) {
      // don't wrap if already wrapped, even if wrapped by a different `lodash` constructor
      return (value && typeof value == 'object' && !isArray(value) && hasOwnProperty.call(value, '__wrapped__'))
       ? value
       : new lodashWrapper(value);
    }

    /**
     * A fast path for creating `lodash` wrapper objects.
     *
     * @private
     * @param {*} value The value to wrap in a `lodash` instance.
     * @param {boolean} chainAll A flag to enable chaining for all methods
     * @returns {Object} Returns a `lodash` instance.
     */
    function lodashWrapper(value, chainAll) {
      this.__chain__ = !!chainAll;
      this.__wrapped__ = value;
    }
    // ensure `new lodashWrapper` is an instance of `lodash`
    lodashWrapper.prototype = lodash.prototype;

    /**
     * An object used to flag environments features.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    var support = lodash.support = {};

    /**
     * Detect if functions can be decompiled by `Function#toString`
     * (all but PS3 and older Opera mobile browsers & avoided in Windows 8 apps).
     *
     * @memberOf _.support
     * @type boolean
     */
    support.funcDecomp = !isNative(context.WinRTError) && reThis.test(runInContext);

    /**
     * Detect if `Function#name` is supported (all but IE).
     *
     * @memberOf _.support
     * @type boolean
     */
    support.funcNames = typeof Function.name == 'string';

    /**
     * By default, the template delimiters used by Lo-Dash are similar to those in
     * embedded Ruby (ERB). Change the following template settings to use alternative
     * delimiters.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    lodash.templateSettings = {

      /**
       * Used to detect `data` property values to be HTML-escaped.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'escape': /<%-([\s\S]+?)%>/g,

      /**
       * Used to detect code to be evaluated.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'evaluate': /<%([\s\S]+?)%>/g,

      /**
       * Used to detect `data` property values to inject.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'interpolate': reInterpolate,

      /**
       * Used to reference the data object in the template text.
       *
       * @memberOf _.templateSettings
       * @type string
       */
      'variable': '',

      /**
       * Used to import variables into the compiled template.
       *
       * @memberOf _.templateSettings
       * @type Object
       */
      'imports': {

        /**
         * A reference to the `lodash` function.
         *
         * @memberOf _.templateSettings.imports
         * @type Function
         */
        '_': lodash
      }
    };

    /*--------------------------------------------------------------------------*/

    /**
     * The base implementation of `_.bind` that creates the bound function and
     * sets its meta data.
     *
     * @private
     * @param {Array} bindData The bind data array.
     * @returns {Function} Returns the new bound function.
     */
    function baseBind(bindData) {
      var func = bindData[0],
          partialArgs = bindData[2],
          thisArg = bindData[4];

      function bound() {
        // `Function#bind` spec
        // http://es5.github.io/#x15.3.4.5
        if (partialArgs) {
          // avoid `arguments` object deoptimizations by using `slice` instead
          // of `Array.prototype.slice.call` and not assigning `arguments` to a
          // variable as a ternary expression
          var args = slice(partialArgs);
          push.apply(args, arguments);
        }
        // mimic the constructor's `return` behavior
        // http://es5.github.io/#x13.2.2
        if (this instanceof bound) {
          // ensure `new bound` is an instance of `func`
          var thisBinding = baseCreate(func.prototype),
              result = func.apply(thisBinding, args || arguments);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisArg, args || arguments);
      }
      setBindData(bound, bindData);
      return bound;
    }

    /**
     * The base implementation of `_.clone` without argument juggling or support
     * for `thisArg` binding.
     *
     * @private
     * @param {*} value The value to clone.
     * @param {boolean} [isDeep=false] Specify a deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {Array} [stackA=[]] Tracks traversed source objects.
     * @param {Array} [stackB=[]] Associates clones with source counterparts.
     * @returns {*} Returns the cloned value.
     */
    function baseClone(value, isDeep, callback, stackA, stackB) {
      if (callback) {
        var result = callback(value);
        if (typeof result != 'undefined') {
          return result;
        }
      }
      // inspect [[Class]]
      var isObj = isObject(value);
      if (isObj) {
        var className = toString.call(value);
        if (!cloneableClasses[className]) {
          return value;
        }
        var ctor = ctorByClass[className];
        switch (className) {
          case boolClass:
          case dateClass:
            return new ctor(+value);

          case numberClass:
          case stringClass:
            return new ctor(value);

          case regexpClass:
            result = ctor(value.source, reFlags.exec(value));
            result.lastIndex = value.lastIndex;
            return result;
        }
      } else {
        return value;
      }
      var isArr = isArray(value);
      if (isDeep) {
        // check for circular references and return corresponding clone
        var initedStack = !stackA;
        stackA || (stackA = getArray());
        stackB || (stackB = getArray());

        var length = stackA.length;
        while (length--) {
          if (stackA[length] == value) {
            return stackB[length];
          }
        }
        result = isArr ? ctor(value.length) : {};
      }
      else {
        result = isArr ? slice(value) : assign({}, value);
      }
      // add array properties assigned by `RegExp#exec`
      if (isArr) {
        if (hasOwnProperty.call(value, 'index')) {
          result.index = value.index;
        }
        if (hasOwnProperty.call(value, 'input')) {
          result.input = value.input;
        }
      }
      // exit for shallow clone
      if (!isDeep) {
        return result;
      }
      // add the source value to the stack of traversed objects
      // and associate it with its clone
      stackA.push(value);
      stackB.push(result);

      // recursively populate clone (susceptible to call stack limits)
      (isArr ? forEach : forOwn)(value, function(objValue, key) {
        result[key] = baseClone(objValue, isDeep, callback, stackA, stackB);
      });

      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return result;
    }

    /**
     * The base implementation of `_.create` without support for assigning
     * properties to the created object.
     *
     * @private
     * @param {Object} prototype The object to inherit from.
     * @returns {Object} Returns the new object.
     */
    function baseCreate(prototype, properties) {
      return isObject(prototype) ? nativeCreate(prototype) : {};
    }
    // fallback for browsers without `Object.create`
    if (!nativeCreate) {
      baseCreate = (function() {
        function Object() {}
        return function(prototype) {
          if (isObject(prototype)) {
            Object.prototype = prototype;
            var result = new Object;
            Object.prototype = null;
          }
          return result || context.Object();
        };
      }());
    }

    /**
     * The base implementation of `_.createCallback` without support for creating
     * "_.pluck" or "_.where" style callbacks.
     *
     * @private
     * @param {*} [func=identity] The value to convert to a callback.
     * @param {*} [thisArg] The `this` binding of the created callback.
     * @param {number} [argCount] The number of arguments the callback accepts.
     * @returns {Function} Returns a callback function.
     */
    function baseCreateCallback(func, thisArg, argCount) {
      if (typeof func != 'function') {
        return identity;
      }
      // exit early for no `thisArg` or already bound by `Function#bind`
      if (typeof thisArg == 'undefined' || !('prototype' in func)) {
        return func;
      }
      var bindData = func.__bindData__;
      if (typeof bindData == 'undefined') {
        if (support.funcNames) {
          bindData = !func.name;
        }
        bindData = bindData || !support.funcDecomp;
        if (!bindData) {
          var source = fnToString.call(func);
          if (!support.funcNames) {
            bindData = !reFuncName.test(source);
          }
          if (!bindData) {
            // checks if `func` references the `this` keyword and stores the result
            bindData = reThis.test(source);
            setBindData(func, bindData);
          }
        }
      }
      // exit early if there are no `this` references or `func` is bound
      if (bindData === false || (bindData !== true && bindData[1] & 1)) {
        return func;
      }
      switch (argCount) {
        case 1: return function(value) {
          return func.call(thisArg, value);
        };
        case 2: return function(a, b) {
          return func.call(thisArg, a, b);
        };
        case 3: return function(value, index, collection) {
          return func.call(thisArg, value, index, collection);
        };
        case 4: return function(accumulator, value, index, collection) {
          return func.call(thisArg, accumulator, value, index, collection);
        };
      }
      return bind(func, thisArg);
    }

    /**
     * The base implementation of `createWrapper` that creates the wrapper and
     * sets its meta data.
     *
     * @private
     * @param {Array} bindData The bind data array.
     * @returns {Function} Returns the new function.
     */
    function baseCreateWrapper(bindData) {
      var func = bindData[0],
          bitmask = bindData[1],
          partialArgs = bindData[2],
          partialRightArgs = bindData[3],
          thisArg = bindData[4],
          arity = bindData[5];

      var isBind = bitmask & 1,
          isBindKey = bitmask & 2,
          isCurry = bitmask & 4,
          isCurryBound = bitmask & 8,
          key = func;

      function bound() {
        var thisBinding = isBind ? thisArg : this;
        if (partialArgs) {
          var args = slice(partialArgs);
          push.apply(args, arguments);
        }
        if (partialRightArgs || isCurry) {
          args || (args = slice(arguments));
          if (partialRightArgs) {
            push.apply(args, partialRightArgs);
          }
          if (isCurry && args.length < arity) {
            bitmask |= 16 & ~32;
            return baseCreateWrapper([func, (isCurryBound ? bitmask : bitmask & ~3), args, null, thisArg, arity]);
          }
        }
        args || (args = arguments);
        if (isBindKey) {
          func = thisBinding[key];
        }
        if (this instanceof bound) {
          thisBinding = baseCreate(func.prototype);
          var result = func.apply(thisBinding, args);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisBinding, args);
      }
      setBindData(bound, bindData);
      return bound;
    }

    /**
     * The base implementation of `_.difference` that accepts a single array
     * of values to exclude.
     *
     * @private
     * @param {Array} array The array to process.
     * @param {Array} [values] The array of values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     */
    function baseDifference(array, values) {
      var index = -1,
          indexOf = getIndexOf(),
          length = array ? array.length : 0,
          isLarge = length >= largeArraySize && indexOf === baseIndexOf,
          result = [];

      if (isLarge) {
        var cache = createCache(values);
        if (cache) {
          indexOf = cacheIndexOf;
          values = cache;
        } else {
          isLarge = false;
        }
      }
      while (++index < length) {
        var value = array[index];
        if (indexOf(values, value) < 0) {
          result.push(value);
        }
      }
      if (isLarge) {
        releaseObject(values);
      }
      return result;
    }

    /**
     * The base implementation of `_.flatten` without support for callback
     * shorthands or `thisArg` binding.
     *
     * @private
     * @param {Array} array The array to flatten.
     * @param {boolean} [isShallow=false] A flag to restrict flattening to a single level.
     * @param {boolean} [isStrict=false] A flag to restrict flattening to arrays and `arguments` objects.
     * @param {number} [fromIndex=0] The index to start from.
     * @returns {Array} Returns a new flattened array.
     */
    function baseFlatten(array, isShallow, isStrict, fromIndex) {
      var index = (fromIndex || 0) - 1,
          length = array ? array.length : 0,
          result = [];

      while (++index < length) {
        var value = array[index];

        if (value && typeof value == 'object' && typeof value.length == 'number'
            && (isArray(value) || isArguments(value))) {
          // recursively flatten arrays (susceptible to call stack limits)
          if (!isShallow) {
            value = baseFlatten(value, isShallow, isStrict);
          }
          var valIndex = -1,
              valLength = value.length,
              resIndex = result.length;

          result.length += valLength;
          while (++valIndex < valLength) {
            result[resIndex++] = value[valIndex];
          }
        } else if (!isStrict) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * The base implementation of `_.isEqual`, without support for `thisArg` binding,
     * that allows partial "_.where" style comparisons.
     *
     * @private
     * @param {*} a The value to compare.
     * @param {*} b The other value to compare.
     * @param {Function} [callback] The function to customize comparing values.
     * @param {Function} [isWhere=false] A flag to indicate performing partial comparisons.
     * @param {Array} [stackA=[]] Tracks traversed `a` objects.
     * @param {Array} [stackB=[]] Tracks traversed `b` objects.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     */
    function baseIsEqual(a, b, callback, isWhere, stackA, stackB) {
      // used to indicate that when comparing objects, `a` has at least the properties of `b`
      if (callback) {
        var result = callback(a, b);
        if (typeof result != 'undefined') {
          return !!result;
        }
      }
      // exit early for identical values
      if (a === b) {
        // treat `+0` vs. `-0` as not equal
        return a !== 0 || (1 / a == 1 / b);
      }
      var type = typeof a,
          otherType = typeof b;

      // exit early for unlike primitive values
      if (a === a &&
          !(a && objectTypes[type]) &&
          !(b && objectTypes[otherType])) {
        return false;
      }
      // exit early for `null` and `undefined` avoiding ES3's Function#call behavior
      // http://es5.github.io/#x15.3.4.4
      if (a == null || b == null) {
        return a === b;
      }
      // compare [[Class]] names
      var className = toString.call(a),
          otherClass = toString.call(b);

      if (className == argsClass) {
        className = objectClass;
      }
      if (otherClass == argsClass) {
        otherClass = objectClass;
      }
      if (className != otherClass) {
        return false;
      }
      switch (className) {
        case boolClass:
        case dateClass:
          // coerce dates and booleans to numbers, dates to milliseconds and booleans
          // to `1` or `0` treating invalid dates coerced to `NaN` as not equal
          return +a == +b;

        case numberClass:
          // treat `NaN` vs. `NaN` as equal
          return (a != +a)
            ? b != +b
            // but treat `+0` vs. `-0` as not equal
            : (a == 0 ? (1 / a == 1 / b) : a == +b);

        case regexpClass:
        case stringClass:
          // coerce regexes to strings (http://es5.github.io/#x15.10.6.4)
          // treat string primitives and their corresponding object instances as equal
          return a == String(b);
      }
      var isArr = className == arrayClass;
      if (!isArr) {
        // unwrap any `lodash` wrapped values
        var aWrapped = hasOwnProperty.call(a, '__wrapped__'),
            bWrapped = hasOwnProperty.call(b, '__wrapped__');

        if (aWrapped || bWrapped) {
          return baseIsEqual(aWrapped ? a.__wrapped__ : a, bWrapped ? b.__wrapped__ : b, callback, isWhere, stackA, stackB);
        }
        // exit for functions and DOM nodes
        if (className != objectClass) {
          return false;
        }
        // in older versions of Opera, `arguments` objects have `Array` constructors
        var ctorA = a.constructor,
            ctorB = b.constructor;

        // non `Object` object instances with different constructors are not equal
        if (ctorA != ctorB &&
              !(isFunction(ctorA) && ctorA instanceof ctorA && isFunction(ctorB) && ctorB instanceof ctorB) &&
              ('constructor' in a && 'constructor' in b)
            ) {
          return false;
        }
      }
      // assume cyclic structures are equal
      // the algorithm for detecting cyclic structures is adapted from ES 5.1
      // section 15.12.3, abstract operation `JO` (http://es5.github.io/#x15.12.3)
      var initedStack = !stackA;
      stackA || (stackA = getArray());
      stackB || (stackB = getArray());

      var length = stackA.length;
      while (length--) {
        if (stackA[length] == a) {
          return stackB[length] == b;
        }
      }
      var size = 0;
      result = true;

      // add `a` and `b` to the stack of traversed objects
      stackA.push(a);
      stackB.push(b);

      // recursively compare objects and arrays (susceptible to call stack limits)
      if (isArr) {
        // compare lengths to determine if a deep comparison is necessary
        length = a.length;
        size = b.length;
        result = size == length;

        if (result || isWhere) {
          // deep compare the contents, ignoring non-numeric properties
          while (size--) {
            var index = length,
                value = b[size];

            if (isWhere) {
              while (index--) {
                if ((result = baseIsEqual(a[index], value, callback, isWhere, stackA, stackB))) {
                  break;
                }
              }
            } else if (!(result = baseIsEqual(a[size], value, callback, isWhere, stackA, stackB))) {
              break;
            }
          }
        }
      }
      else {
        // deep compare objects using `forIn`, instead of `forOwn`, to avoid `Object.keys`
        // which, in this case, is more costly
        forIn(b, function(value, key, b) {
          if (hasOwnProperty.call(b, key)) {
            // count the number of properties.
            size++;
            // deep compare each property value.
            return (result = hasOwnProperty.call(a, key) && baseIsEqual(a[key], value, callback, isWhere, stackA, stackB));
          }
        });

        if (result && !isWhere) {
          // ensure both objects have the same number of properties
          forIn(a, function(value, key, a) {
            if (hasOwnProperty.call(a, key)) {
              // `size` will be `-1` if `a` has more properties than `b`
              return (result = --size > -1);
            }
          });
        }
      }
      stackA.pop();
      stackB.pop();

      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return result;
    }

    /**
     * The base implementation of `_.merge` without argument juggling or support
     * for `thisArg` binding.
     *
     * @private
     * @param {Object} object The destination object.
     * @param {Object} source The source object.
     * @param {Function} [callback] The function to customize merging properties.
     * @param {Array} [stackA=[]] Tracks traversed source objects.
     * @param {Array} [stackB=[]] Associates values with source counterparts.
     */
    function baseMerge(object, source, callback, stackA, stackB) {
      (isArray(source) ? forEach : forOwn)(source, function(source, key) {
        var found,
            isArr,
            result = source,
            value = object[key];

        if (source && ((isArr = isArray(source)) || isPlainObject(source))) {
          // avoid merging previously merged cyclic sources
          var stackLength = stackA.length;
          while (stackLength--) {
            if ((found = stackA[stackLength] == source)) {
              value = stackB[stackLength];
              break;
            }
          }
          if (!found) {
            var isShallow;
            if (callback) {
              result = callback(value, source);
              if ((isShallow = typeof result != 'undefined')) {
                value = result;
              }
            }
            if (!isShallow) {
              value = isArr
                ? (isArray(value) ? value : [])
                : (isPlainObject(value) ? value : {});
            }
            // add `source` and associated `value` to the stack of traversed objects
            stackA.push(source);
            stackB.push(value);

            // recursively merge objects and arrays (susceptible to call stack limits)
            if (!isShallow) {
              baseMerge(value, source, callback, stackA, stackB);
            }
          }
        }
        else {
          if (callback) {
            result = callback(value, source);
            if (typeof result == 'undefined') {
              result = source;
            }
          }
          if (typeof result != 'undefined') {
            value = result;
          }
        }
        object[key] = value;
      });
    }

    /**
     * The base implementation of `_.random` without argument juggling or support
     * for returning floating-point numbers.
     *
     * @private
     * @param {number} min The minimum possible value.
     * @param {number} max The maximum possible value.
     * @returns {number} Returns a random number.
     */
    function baseRandom(min, max) {
      return min + floor(nativeRandom() * (max - min + 1));
    }

    /**
     * The base implementation of `_.uniq` without support for callback shorthands
     * or `thisArg` binding.
     *
     * @private
     * @param {Array} array The array to process.
     * @param {boolean} [isSorted=false] A flag to indicate that `array` is sorted.
     * @param {Function} [callback] The function called per iteration.
     * @returns {Array} Returns a duplicate-value-free array.
     */
    function baseUniq(array, isSorted, callback) {
      var index = -1,
          indexOf = getIndexOf(),
          length = array ? array.length : 0,
          result = [];

      var isLarge = !isSorted && length >= largeArraySize && indexOf === baseIndexOf,
          seen = (callback || isLarge) ? getArray() : result;

      if (isLarge) {
        var cache = createCache(seen);
        indexOf = cacheIndexOf;
        seen = cache;
      }
      while (++index < length) {
        var value = array[index],
            computed = callback ? callback(value, index, array) : value;

        if (isSorted
              ? !index || seen[seen.length - 1] !== computed
              : indexOf(seen, computed) < 0
            ) {
          if (callback || isLarge) {
            seen.push(computed);
          }
          result.push(value);
        }
      }
      if (isLarge) {
        releaseArray(seen.array);
        releaseObject(seen);
      } else if (callback) {
        releaseArray(seen);
      }
      return result;
    }

    /**
     * Creates a function that aggregates a collection, creating an object composed
     * of keys generated from the results of running each element of the collection
     * through a callback. The given `setter` function sets the keys and values
     * of the composed object.
     *
     * @private
     * @param {Function} setter The setter function.
     * @returns {Function} Returns the new aggregator function.
     */
    function createAggregator(setter) {
      return function(collection, callback, thisArg) {
        var result = {};
        callback = lodash.createCallback(callback, thisArg, 3);

        var index = -1,
            length = collection ? collection.length : 0;

        if (typeof length == 'number') {
          while (++index < length) {
            var value = collection[index];
            setter(result, value, callback(value, index, collection), collection);
          }
        } else {
          forOwn(collection, function(value, key, collection) {
            setter(result, value, callback(value, key, collection), collection);
          });
        }
        return result;
      };
    }

    /**
     * Creates a function that, when called, either curries or invokes `func`
     * with an optional `this` binding and partially applied arguments.
     *
     * @private
     * @param {Function|string} func The function or method name to reference.
     * @param {number} bitmask The bitmask of method flags to compose.
     *  The bitmask may be composed of the following flags:
     *  1 - `_.bind`
     *  2 - `_.bindKey`
     *  4 - `_.curry`
     *  8 - `_.curry` (bound)
     *  16 - `_.partial`
     *  32 - `_.partialRight`
     * @param {Array} [partialArgs] An array of arguments to prepend to those
     *  provided to the new function.
     * @param {Array} [partialRightArgs] An array of arguments to append to those
     *  provided to the new function.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {number} [arity] The arity of `func`.
     * @returns {Function} Returns the new function.
     */
    function createWrapper(func, bitmask, partialArgs, partialRightArgs, thisArg, arity) {
      var isBind = bitmask & 1,
          isBindKey = bitmask & 2,
          isCurry = bitmask & 4,
          isCurryBound = bitmask & 8,
          isPartial = bitmask & 16,
          isPartialRight = bitmask & 32;

      if (!isBindKey && !isFunction(func)) {
        throw new TypeError;
      }
      if (isPartial && !partialArgs.length) {
        bitmask &= ~16;
        isPartial = partialArgs = false;
      }
      if (isPartialRight && !partialRightArgs.length) {
        bitmask &= ~32;
        isPartialRight = partialRightArgs = false;
      }
      var bindData = func && func.__bindData__;
      if (bindData && bindData !== true) {
        // clone `bindData`
        bindData = slice(bindData);
        if (bindData[2]) {
          bindData[2] = slice(bindData[2]);
        }
        if (bindData[3]) {
          bindData[3] = slice(bindData[3]);
        }
        // set `thisBinding` is not previously bound
        if (isBind && !(bindData[1] & 1)) {
          bindData[4] = thisArg;
        }
        // set if previously bound but not currently (subsequent curried functions)
        if (!isBind && bindData[1] & 1) {
          bitmask |= 8;
        }
        // set curried arity if not yet set
        if (isCurry && !(bindData[1] & 4)) {
          bindData[5] = arity;
        }
        // append partial left arguments
        if (isPartial) {
          push.apply(bindData[2] || (bindData[2] = []), partialArgs);
        }
        // append partial right arguments
        if (isPartialRight) {
          unshift.apply(bindData[3] || (bindData[3] = []), partialRightArgs);
        }
        // merge flags
        bindData[1] |= bitmask;
        return createWrapper.apply(null, bindData);
      }
      // fast path for `_.bind`
      var creater = (bitmask == 1 || bitmask === 17) ? baseBind : baseCreateWrapper;
      return creater([func, bitmask, partialArgs, partialRightArgs, thisArg, arity]);
    }

    /**
     * Used by `escape` to convert characters to HTML entities.
     *
     * @private
     * @param {string} match The matched character to escape.
     * @returns {string} Returns the escaped character.
     */
    function escapeHtmlChar(match) {
      return htmlEscapes[match];
    }

    /**
     * Gets the appropriate "indexOf" function. If the `_.indexOf` method is
     * customized, this method returns the custom method, otherwise it returns
     * the `baseIndexOf` function.
     *
     * @private
     * @returns {Function} Returns the "indexOf" function.
     */
    function getIndexOf() {
      var result = (result = lodash.indexOf) === indexOf ? baseIndexOf : result;
      return result;
    }

    /**
     * Checks if `value` is a native function.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a native function, else `false`.
     */
    function isNative(value) {
      return typeof value == 'function' && reNative.test(value);
    }

    /**
     * Sets `this` binding data on a given function.
     *
     * @private
     * @param {Function} func The function to set data on.
     * @param {Array} value The data array to set.
     */
    var setBindData = !defineProperty ? noop : function(func, value) {
      descriptor.value = value;
      defineProperty(func, '__bindData__', descriptor);
    };

    /**
     * A fallback implementation of `isPlainObject` which checks if a given value
     * is an object created by the `Object` constructor, assuming objects created
     * by the `Object` constructor have no inherited enumerable properties and that
     * there are no `Object.prototype` extensions.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
     */
    function shimIsPlainObject(value) {
      var ctor,
          result;

      // avoid non Object objects, `arguments` objects, and DOM elements
      if (!(value && toString.call(value) == objectClass) ||
          (ctor = value.constructor, isFunction(ctor) && !(ctor instanceof ctor))) {
        return false;
      }
      // In most environments an object's own properties are iterated before
      // its inherited properties. If the last iterated property is an object's
      // own property then there are no inherited enumerable properties.
      forIn(value, function(value, key) {
        result = key;
      });
      return typeof result == 'undefined' || hasOwnProperty.call(value, result);
    }

    /**
     * Used by `unescape` to convert HTML entities to characters.
     *
     * @private
     * @param {string} match The matched character to unescape.
     * @returns {string} Returns the unescaped character.
     */
    function unescapeHtmlChar(match) {
      return htmlUnescapes[match];
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Checks if `value` is an `arguments` object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an `arguments` object, else `false`.
     * @example
     *
     * (function() { return _.isArguments(arguments); })(1, 2, 3);
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    function isArguments(value) {
      return value && typeof value == 'object' && typeof value.length == 'number' &&
        toString.call(value) == argsClass || false;
    }

    /**
     * Checks if `value` is an array.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an array, else `false`.
     * @example
     *
     * (function() { return _.isArray(arguments); })();
     * // => false
     *
     * _.isArray([1, 2, 3]);
     * // => true
     */
    var isArray = nativeIsArray || function(value) {
      return value && typeof value == 'object' && typeof value.length == 'number' &&
        toString.call(value) == arrayClass || false;
    };

    /**
     * A fallback implementation of `Object.keys` which produces an array of the
     * given object's own enumerable property names.
     *
     * @private
     * @type Function
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names.
     */
    var shimKeys = function(object) {
      var index, iterable = object, result = [];
      if (!iterable) return result;
      if (!(objectTypes[typeof object])) return result;
        for (index in iterable) {
          if (hasOwnProperty.call(iterable, index)) {
            result.push(index);
          }
        }
      return result
    };

    /**
     * Creates an array composed of the own enumerable property names of an object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names.
     * @example
     *
     * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
     * // => ['one', 'two', 'three'] (property order is not guaranteed across environments)
     */
    var keys = !nativeKeys ? shimKeys : function(object) {
      if (!isObject(object)) {
        return [];
      }
      return nativeKeys(object);
    };

    /**
     * Used to convert characters to HTML entities:
     *
     * Though the `>` character is escaped for symmetry, characters like `>` and `/`
     * don't require escaping in HTML and have no special meaning unless they're part
     * of a tag or an unquoted attribute value.
     * http://mathiasbynens.be/notes/ambiguous-ampersands (under "semi-related fun fact")
     */
    var htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    /** Used to convert HTML entities to characters */
    var htmlUnescapes = invert(htmlEscapes);

    /** Used to match HTML entities and HTML characters */
    var reEscapedHtml = RegExp('(' + keys(htmlUnescapes).join('|') + ')', 'g'),
        reUnescapedHtml = RegExp('[' + keys(htmlEscapes).join('') + ']', 'g');

    /*--------------------------------------------------------------------------*/

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object. Subsequent sources will overwrite property assignments of previous
     * sources. If a callback is provided it will be executed to produce the
     * assigned values. The callback is bound to `thisArg` and invoked with two
     * arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @type Function
     * @alias extend
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param {Function} [callback] The function to customize assigning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * _.assign({ 'name': 'fred' }, { 'employer': 'slate' });
     * // => { 'name': 'fred', 'employer': 'slate' }
     *
     * var defaults = _.partialRight(_.assign, function(a, b) {
     *   return typeof a == 'undefined' ? b : a;
     * });
     *
     * var object = { 'name': 'barney' };
     * defaults(object, { 'name': 'fred', 'employer': 'slate' });
     * // => { 'name': 'barney', 'employer': 'slate' }
     */
    var assign = function(object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      if (argsLength > 3 && typeof args[argsLength - 2] == 'function') {
        var callback = baseCreateCallback(args[--argsLength - 1], args[argsLength--], 2);
      } else if (argsLength > 2 && typeof args[argsLength - 1] == 'function') {
        callback = args[--argsLength];
      }
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          result[index] = callback ? callback(result[index], iterable[index]) : iterable[index];
        }
        }
      }
      return result
    };

    /**
     * Creates a clone of `value`. If `isDeep` is `true` nested objects will also
     * be cloned, otherwise they will be assigned by reference. If a callback
     * is provided it will be executed to produce the cloned values. If the
     * callback returns `undefined` cloning will be handled by the method instead.
     * The callback is bound to `thisArg` and invoked with one argument; (value).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to clone.
     * @param {boolean} [isDeep=false] Specify a deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the cloned value.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * var shallow = _.clone(characters);
     * shallow[0] === characters[0];
     * // => true
     *
     * var deep = _.clone(characters, true);
     * deep[0] === characters[0];
     * // => false
     *
     * _.mixin({
     *   'clone': _.partialRight(_.clone, function(value) {
     *     return _.isElement(value) ? value.cloneNode(false) : undefined;
     *   })
     * });
     *
     * var clone = _.clone(document.body);
     * clone.childNodes.length;
     * // => 0
     */
    function clone(value, isDeep, callback, thisArg) {
      // allows working with "Collections" methods without using their `index`
      // and `collection` arguments for `isDeep` and `callback`
      if (typeof isDeep != 'boolean' && isDeep != null) {
        thisArg = callback;
        callback = isDeep;
        isDeep = false;
      }
      return baseClone(value, isDeep, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 1));
    }

    /**
     * Creates a deep clone of `value`. If a callback is provided it will be
     * executed to produce the cloned values. If the callback returns `undefined`
     * cloning will be handled by the method instead. The callback is bound to
     * `thisArg` and invoked with one argument; (value).
     *
     * Note: This method is loosely based on the structured clone algorithm. Functions
     * and DOM nodes are **not** cloned. The enumerable properties of `arguments` objects and
     * objects created by constructors other than `Object` are cloned to plain `Object` objects.
     * See http://www.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the deep cloned value.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * var deep = _.cloneDeep(characters);
     * deep[0] === characters[0];
     * // => false
     *
     * var view = {
     *   'label': 'docs',
     *   'node': element
     * };
     *
     * var clone = _.cloneDeep(view, function(value) {
     *   return _.isElement(value) ? value.cloneNode(true) : undefined;
     * });
     *
     * clone.node == view.node;
     * // => false
     */
    function cloneDeep(value, callback, thisArg) {
      return baseClone(value, true, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 1));
    }

    /**
     * Creates an object that inherits from the given `prototype` object. If a
     * `properties` object is provided its own enumerable properties are assigned
     * to the created object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} prototype The object to inherit from.
     * @param {Object} [properties] The properties to assign to the object.
     * @returns {Object} Returns the new object.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * function Circle() {
     *   Shape.call(this);
     * }
     *
     * Circle.prototype = _.create(Shape.prototype, { 'constructor': Circle });
     *
     * var circle = new Circle;
     * circle instanceof Circle;
     * // => true
     *
     * circle instanceof Shape;
     * // => true
     */
    function create(prototype, properties) {
      var result = baseCreate(prototype);
      return properties ? assign(result, properties) : result;
    }

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object for all destination properties that resolve to `undefined`. Once a
     * property is set, additional defaults of the same property will be ignored.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param- {Object} [guard] Allows working with `_.reduce` without using its
     *  `key` and `object` arguments as sources.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var object = { 'name': 'barney' };
     * _.defaults(object, { 'name': 'fred', 'employer': 'slate' });
     * // => { 'name': 'barney', 'employer': 'slate' }
     */
    var defaults = function(object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          if (typeof result[index] == 'undefined') result[index] = iterable[index];
        }
        }
      }
      return result
    };

    /**
     * This method is like `_.findIndex` except that it returns the key of the
     * first element that passes the callback check, instead of the element itself.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to search.
     * @param {Function|Object|string} [callback=identity] The function called per
     *  iteration. If a property name or object is provided it will be used to
     *  create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {string|undefined} Returns the key of the found element, else `undefined`.
     * @example
     *
     * var characters = {
     *   'barney': {  'age': 36, 'blocked': false },
     *   'fred': {    'age': 40, 'blocked': true },
     *   'pebbles': { 'age': 1,  'blocked': false }
     * };
     *
     * _.findKey(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => 'barney' (property order is not guaranteed across environments)
     *
     * // using "_.where" callback shorthand
     * _.findKey(characters, { 'age': 1 });
     * // => 'pebbles'
     *
     * // using "_.pluck" callback shorthand
     * _.findKey(characters, 'blocked');
     * // => 'fred'
     */
    function findKey(object, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forOwn(object, function(value, key, object) {
        if (callback(value, key, object)) {
          result = key;
          return false;
        }
      });
      return result;
    }

    /**
     * This method is like `_.findKey` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to search.
     * @param {Function|Object|string} [callback=identity] The function called per
     *  iteration. If a property name or object is provided it will be used to
     *  create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {string|undefined} Returns the key of the found element, else `undefined`.
     * @example
     *
     * var characters = {
     *   'barney': {  'age': 36, 'blocked': true },
     *   'fred': {    'age': 40, 'blocked': false },
     *   'pebbles': { 'age': 1,  'blocked': true }
     * };
     *
     * _.findLastKey(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => returns `pebbles`, assuming `_.findKey` returns `barney`
     *
     * // using "_.where" callback shorthand
     * _.findLastKey(characters, { 'age': 40 });
     * // => 'fred'
     *
     * // using "_.pluck" callback shorthand
     * _.findLastKey(characters, 'blocked');
     * // => 'pebbles'
     */
    function findLastKey(object, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forOwnRight(object, function(value, key, object) {
        if (callback(value, key, object)) {
          result = key;
          return false;
        }
      });
      return result;
    }

    /**
     * Iterates over own and inherited enumerable properties of an object,
     * executing the callback for each property. The callback is bound to `thisArg`
     * and invoked with three arguments; (value, key, object). Callbacks may exit
     * iteration early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * Shape.prototype.move = function(x, y) {
     *   this.x += x;
     *   this.y += y;
     * };
     *
     * _.forIn(new Shape, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'x', 'y', and 'move' (property order is not guaranteed across environments)
     */
    var forIn = function(collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
        for (index in iterable) {
          if (callback(iterable[index], index, collection) === false) return result;
        }
      return result
    };

    /**
     * This method is like `_.forIn` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * Shape.prototype.move = function(x, y) {
     *   this.x += x;
     *   this.y += y;
     * };
     *
     * _.forInRight(new Shape, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'move', 'y', and 'x' assuming `_.forIn ` logs 'x', 'y', and 'move'
     */
    function forInRight(object, callback, thisArg) {
      var pairs = [];

      forIn(object, function(value, key) {
        pairs.push(key, value);
      });

      var length = pairs.length;
      callback = baseCreateCallback(callback, thisArg, 3);
      while (length--) {
        if (callback(pairs[length--], pairs[length], object) === false) {
          break;
        }
      }
      return object;
    }

    /**
     * Iterates over own enumerable properties of an object, executing the callback
     * for each property. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, key, object). Callbacks may exit iteration early by
     * explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.forOwn({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
     *   console.log(key);
     * });
     * // => logs '0', '1', and 'length' (property order is not guaranteed across environments)
     */
    var forOwn = function(collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          if (callback(iterable[index], index, collection) === false) return result;
        }
      return result
    };

    /**
     * This method is like `_.forOwn` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.forOwnRight({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
     *   console.log(key);
     * });
     * // => logs 'length', '1', and '0' assuming `_.forOwn` logs '0', '1', and 'length'
     */
    function forOwnRight(object, callback, thisArg) {
      var props = keys(object),
          length = props.length;

      callback = baseCreateCallback(callback, thisArg, 3);
      while (length--) {
        var key = props[length];
        if (callback(object[key], key, object) === false) {
          break;
        }
      }
      return object;
    }

    /**
     * Creates a sorted array of property names of all enumerable properties,
     * own and inherited, of `object` that have function values.
     *
     * @static
     * @memberOf _
     * @alias methods
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names that have function values.
     * @example
     *
     * _.functions(_);
     * // => ['all', 'any', 'bind', 'bindAll', 'clone', 'compact', 'compose', ...]
     */
    function functions(object) {
      var result = [];
      forIn(object, function(value, key) {
        if (isFunction(value)) {
          result.push(key);
        }
      });
      return result.sort();
    }

    /**
     * Checks if the specified property name exists as a direct property of `object`,
     * instead of an inherited property.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @param {string} key The name of the property to check.
     * @returns {boolean} Returns `true` if key is a direct property, else `false`.
     * @example
     *
     * _.has({ 'a': 1, 'b': 2, 'c': 3 }, 'b');
     * // => true
     */
    function has(object, key) {
      return object ? hasOwnProperty.call(object, key) : false;
    }

    /**
     * Creates an object composed of the inverted keys and values of the given object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to invert.
     * @returns {Object} Returns the created inverted object.
     * @example
     *
     * _.invert({ 'first': 'fred', 'second': 'barney' });
     * // => { 'fred': 'first', 'barney': 'second' }
     */
    function invert(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = {};

      while (++index < length) {
        var key = props[index];
        result[object[key]] = key;
      }
      return result;
    }

    /**
     * Checks if `value` is a boolean value.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a boolean value, else `false`.
     * @example
     *
     * _.isBoolean(null);
     * // => false
     */
    function isBoolean(value) {
      return value === true || value === false ||
        value && typeof value == 'object' && toString.call(value) == boolClass || false;
    }

    /**
     * Checks if `value` is a date.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a date, else `false`.
     * @example
     *
     * _.isDate(new Date);
     * // => true
     */
    function isDate(value) {
      return value && typeof value == 'object' && toString.call(value) == dateClass || false;
    }

    /**
     * Checks if `value` is a DOM element.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a DOM element, else `false`.
     * @example
     *
     * _.isElement(document.body);
     * // => true
     */
    function isElement(value) {
      return value && value.nodeType === 1 || false;
    }

    /**
     * Checks if `value` is empty. Arrays, strings, or `arguments` objects with a
     * length of `0` and objects with no own enumerable properties are considered
     * "empty".
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Array|Object|string} value The value to inspect.
     * @returns {boolean} Returns `true` if the `value` is empty, else `false`.
     * @example
     *
     * _.isEmpty([1, 2, 3]);
     * // => false
     *
     * _.isEmpty({});
     * // => true
     *
     * _.isEmpty('');
     * // => true
     */
    function isEmpty(value) {
      var result = true;
      if (!value) {
        return result;
      }
      var className = toString.call(value),
          length = value.length;

      if ((className == arrayClass || className == stringClass || className == argsClass ) ||
          (className == objectClass && typeof length == 'number' && isFunction(value.splice))) {
        return !length;
      }
      forOwn(value, function() {
        return (result = false);
      });
      return result;
    }

    /**
     * Performs a deep comparison between two values to determine if they are
     * equivalent to each other. If a callback is provided it will be executed
     * to compare values. If the callback returns `undefined` comparisons will
     * be handled by the method instead. The callback is bound to `thisArg` and
     * invoked with two arguments; (a, b).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} a The value to compare.
     * @param {*} b The other value to compare.
     * @param {Function} [callback] The function to customize comparing values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'name': 'fred' };
     * var copy = { 'name': 'fred' };
     *
     * object == copy;
     * // => false
     *
     * _.isEqual(object, copy);
     * // => true
     *
     * var words = ['hello', 'goodbye'];
     * var otherWords = ['hi', 'goodbye'];
     *
     * _.isEqual(words, otherWords, function(a, b) {
     *   var reGreet = /^(?:hello|hi)$/i,
     *       aGreet = _.isString(a) && reGreet.test(a),
     *       bGreet = _.isString(b) && reGreet.test(b);
     *
     *   return (aGreet || bGreet) ? (aGreet == bGreet) : undefined;
     * });
     * // => true
     */
    function isEqual(a, b, callback, thisArg) {
      return baseIsEqual(a, b, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 2));
    }

    /**
     * Checks if `value` is, or can be coerced to, a finite number.
     *
     * Note: This is not the same as native `isFinite` which will return true for
     * booleans and empty strings. See http://es5.github.io/#x15.1.2.5.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is finite, else `false`.
     * @example
     *
     * _.isFinite(-101);
     * // => true
     *
     * _.isFinite('10');
     * // => true
     *
     * _.isFinite(true);
     * // => false
     *
     * _.isFinite('');
     * // => false
     *
     * _.isFinite(Infinity);
     * // => false
     */
    function isFinite(value) {
      return nativeIsFinite(value) && !nativeIsNaN(parseFloat(value));
    }

    /**
     * Checks if `value` is a function.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     */
    function isFunction(value) {
      return typeof value == 'function';
    }

    /**
     * Checks if `value` is the language type of Object.
     * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(1);
     * // => false
     */
    function isObject(value) {
      // check if the value is the ECMAScript language type of Object
      // http://es5.github.io/#x8
      // and avoid a V8 bug
      // http://code.google.com/p/v8/issues/detail?id=2291
      return !!(value && objectTypes[typeof value]);
    }

    /**
     * Checks if `value` is `NaN`.
     *
     * Note: This is not the same as native `isNaN` which will return `true` for
     * `undefined` and other non-numeric values. See http://es5.github.io/#x15.1.2.4.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `NaN`, else `false`.
     * @example
     *
     * _.isNaN(NaN);
     * // => true
     *
     * _.isNaN(new Number(NaN));
     * // => true
     *
     * isNaN(undefined);
     * // => true
     *
     * _.isNaN(undefined);
     * // => false
     */
    function isNaN(value) {
      // `NaN` as a primitive is the only value that is not equal to itself
      // (perform the [[Class]] check first to avoid errors with some host objects in IE)
      return isNumber(value) && value != +value;
    }

    /**
     * Checks if `value` is `null`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `null`, else `false`.
     * @example
     *
     * _.isNull(null);
     * // => true
     *
     * _.isNull(undefined);
     * // => false
     */
    function isNull(value) {
      return value === null;
    }

    /**
     * Checks if `value` is a number.
     *
     * Note: `NaN` is considered a number. See http://es5.github.io/#x8.5.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a number, else `false`.
     * @example
     *
     * _.isNumber(8.4 * 5);
     * // => true
     */
    function isNumber(value) {
      return typeof value == 'number' ||
        value && typeof value == 'object' && toString.call(value) == numberClass || false;
    }

    /**
     * Checks if `value` is an object created by the `Object` constructor.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * _.isPlainObject(new Shape);
     * // => false
     *
     * _.isPlainObject([1, 2, 3]);
     * // => false
     *
     * _.isPlainObject({ 'x': 0, 'y': 0 });
     * // => true
     */
    var isPlainObject = !getPrototypeOf ? shimIsPlainObject : function(value) {
      if (!(value && toString.call(value) == objectClass)) {
        return false;
      }
      var valueOf = value.valueOf,
          objProto = isNative(valueOf) && (objProto = getPrototypeOf(valueOf)) && getPrototypeOf(objProto);

      return objProto
        ? (value == objProto || getPrototypeOf(value) == objProto)
        : shimIsPlainObject(value);
    };

    /**
     * Checks if `value` is a regular expression.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a regular expression, else `false`.
     * @example
     *
     * _.isRegExp(/fred/);
     * // => true
     */
    function isRegExp(value) {
      return value && typeof value == 'object' && toString.call(value) == regexpClass || false;
    }

    /**
     * Checks if `value` is a string.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a string, else `false`.
     * @example
     *
     * _.isString('fred');
     * // => true
     */
    function isString(value) {
      return typeof value == 'string' ||
        value && typeof value == 'object' && toString.call(value) == stringClass || false;
    }

    /**
     * Checks if `value` is `undefined`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `undefined`, else `false`.
     * @example
     *
     * _.isUndefined(void 0);
     * // => true
     */
    function isUndefined(value) {
      return typeof value == 'undefined';
    }

    /**
     * Creates an object with the same keys as `object` and values generated by
     * running each own enumerable property of `object` through the callback.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new object with values of the results of each `callback` execution.
     * @example
     *
     * _.mapValues({ 'a': 1, 'b': 2, 'c': 3} , function(num) { return num * 3; });
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     *
     * var characters = {
     *   'fred': { 'name': 'fred', 'age': 40 },
     *   'pebbles': { 'name': 'pebbles', 'age': 1 }
     * };
     *
     * // using "_.pluck" callback shorthand
     * _.mapValues(characters, 'age');
     * // => { 'fred': 40, 'pebbles': 1 }
     */
    function mapValues(object, callback, thisArg) {
      var result = {};
      callback = lodash.createCallback(callback, thisArg, 3);

      forOwn(object, function(value, key, object) {
        result[key] = callback(value, key, object);
      });
      return result;
    }

    /**
     * Recursively merges own enumerable properties of the source object(s), that
     * don't resolve to `undefined` into the destination object. Subsequent sources
     * will overwrite property assignments of previous sources. If a callback is
     * provided it will be executed to produce the merged values of the destination
     * and source properties. If the callback returns `undefined` merging will
     * be handled by the method instead. The callback is bound to `thisArg` and
     * invoked with two arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param {Function} [callback] The function to customize merging properties.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var names = {
     *   'characters': [
     *     { 'name': 'barney' },
     *     { 'name': 'fred' }
     *   ]
     * };
     *
     * var ages = {
     *   'characters': [
     *     { 'age': 36 },
     *     { 'age': 40 }
     *   ]
     * };
     *
     * _.merge(names, ages);
     * // => { 'characters': [{ 'name': 'barney', 'age': 36 }, { 'name': 'fred', 'age': 40 }] }
     *
     * var food = {
     *   'fruits': ['apple'],
     *   'vegetables': ['beet']
     * };
     *
     * var otherFood = {
     *   'fruits': ['banana'],
     *   'vegetables': ['carrot']
     * };
     *
     * _.merge(food, otherFood, function(a, b) {
     *   return _.isArray(a) ? a.concat(b) : undefined;
     * });
     * // => { 'fruits': ['apple', 'banana'], 'vegetables': ['beet', 'carrot] }
     */
    function merge(object) {
      var args = arguments,
          length = 2;

      if (!isObject(object)) {
        return object;
      }
      // allows working with `_.reduce` and `_.reduceRight` without using
      // their `index` and `collection` arguments
      if (typeof args[2] != 'number') {
        length = args.length;
      }
      if (length > 3 && typeof args[length - 2] == 'function') {
        var callback = baseCreateCallback(args[--length - 1], args[length--], 2);
      } else if (length > 2 && typeof args[length - 1] == 'function') {
        callback = args[--length];
      }
      var sources = slice(arguments, 1, length),
          index = -1,
          stackA = getArray(),
          stackB = getArray();

      while (++index < length) {
        baseMerge(object, sources[index], callback, stackA, stackB);
      }
      releaseArray(stackA);
      releaseArray(stackB);
      return object;
    }

    /**
     * Creates a shallow clone of `object` excluding the specified properties.
     * Property names may be specified as individual arguments or as arrays of
     * property names. If a callback is provided it will be executed for each
     * property of `object` omitting the properties the callback returns truey
     * for. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Function|...string|string[]} [callback] The properties to omit or the
     *  function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object without the omitted properties.
     * @example
     *
     * _.omit({ 'name': 'fred', 'age': 40 }, 'age');
     * // => { 'name': 'fred' }
     *
     * _.omit({ 'name': 'fred', 'age': 40 }, function(value) {
     *   return typeof value == 'number';
     * });
     * // => { 'name': 'fred' }
     */
    function omit(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var props = [];
        forIn(object, function(value, key) {
          props.push(key);
        });
        props = baseDifference(props, baseFlatten(arguments, true, false, 1));

        var index = -1,
            length = props.length;

        while (++index < length) {
          var key = props[index];
          result[key] = object[key];
        }
      } else {
        callback = lodash.createCallback(callback, thisArg, 3);
        forIn(object, function(value, key, object) {
          if (!callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }

    /**
     * Creates a two dimensional array of an object's key-value pairs,
     * i.e. `[[key1, value1], [key2, value2]]`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns new array of key-value pairs.
     * @example
     *
     * _.pairs({ 'barney': 36, 'fred': 40 });
     * // => [['barney', 36], ['fred', 40]] (property order is not guaranteed across environments)
     */
    function pairs(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        var key = props[index];
        result[index] = [key, object[key]];
      }
      return result;
    }

    /**
     * Creates a shallow clone of `object` composed of the specified properties.
     * Property names may be specified as individual arguments or as arrays of
     * property names. If a callback is provided it will be executed for each
     * property of `object` picking the properties the callback returns truey
     * for. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Function|...string|string[]} [callback] The function called per
     *  iteration or property names to pick, specified as individual property
     *  names or arrays of property names.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object composed of the picked properties.
     * @example
     *
     * _.pick({ 'name': 'fred', '_userid': 'fred1' }, 'name');
     * // => { 'name': 'fred' }
     *
     * _.pick({ 'name': 'fred', '_userid': 'fred1' }, function(value, key) {
     *   return key.charAt(0) != '_';
     * });
     * // => { 'name': 'fred' }
     */
    function pick(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var index = -1,
            props = baseFlatten(arguments, true, false, 1),
            length = isObject(object) ? props.length : 0;

        while (++index < length) {
          var key = props[index];
          if (key in object) {
            result[key] = object[key];
          }
        }
      } else {
        callback = lodash.createCallback(callback, thisArg, 3);
        forIn(object, function(value, key, object) {
          if (callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }

    /**
     * An alternative to `_.reduce` this method transforms `object` to a new
     * `accumulator` object which is the result of running each of its own
     * enumerable properties through a callback, with each callback execution
     * potentially mutating the `accumulator` object. The callback is bound to
     * `thisArg` and invoked with four arguments; (accumulator, value, key, object).
     * Callbacks may exit iteration early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Array|Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] The custom accumulator value.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var squares = _.transform([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], function(result, num) {
     *   num *= num;
     *   if (num % 2) {
     *     return result.push(num) < 3;
     *   }
     * });
     * // => [1, 9, 25]
     *
     * var mapped = _.transform({ 'a': 1, 'b': 2, 'c': 3 }, function(result, num, key) {
     *   result[key] = num * 3;
     * });
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     */
    function transform(object, callback, accumulator, thisArg) {
      var isArr = isArray(object);
      if (accumulator == null) {
        if (isArr) {
          accumulator = [];
        } else {
          var ctor = object && object.constructor,
              proto = ctor && ctor.prototype;

          accumulator = baseCreate(proto);
        }
      }
      if (callback) {
        callback = lodash.createCallback(callback, thisArg, 4);
        (isArr ? forEach : forOwn)(object, function(value, index, object) {
          return callback(accumulator, value, index, object);
        });
      }
      return accumulator;
    }

    /**
     * Creates an array composed of the own enumerable property values of `object`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property values.
     * @example
     *
     * _.values({ 'one': 1, 'two': 2, 'three': 3 });
     * // => [1, 2, 3] (property order is not guaranteed across environments)
     */
    function values(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        result[index] = object[props[index]];
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array of elements from the specified indexes, or keys, of the
     * `collection`. Indexes may be specified as individual arguments or as arrays
     * of indexes.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {...(number|number[]|string|string[])} [index] The indexes of `collection`
     *   to retrieve, specified as individual indexes or arrays of indexes.
     * @returns {Array} Returns a new array of elements corresponding to the
     *  provided indexes.
     * @example
     *
     * _.at(['a', 'b', 'c', 'd', 'e'], [0, 2, 4]);
     * // => ['a', 'c', 'e']
     *
     * _.at(['fred', 'barney', 'pebbles'], 0, 2);
     * // => ['fred', 'pebbles']
     */
    function at(collection) {
      var args = arguments,
          index = -1,
          props = baseFlatten(args, true, false, 1),
          length = (args[2] && args[2][args[1]] === collection) ? 1 : props.length,
          result = Array(length);

      while(++index < length) {
        result[index] = collection[props[index]];
      }
      return result;
    }

    /**
     * Checks if a given value is present in a collection using strict equality
     * for comparisons, i.e. `===`. If `fromIndex` is negative, it is used as the
     * offset from the end of the collection.
     *
     * @static
     * @memberOf _
     * @alias include
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {*} target The value to check for.
     * @param {number} [fromIndex=0] The index to search from.
     * @returns {boolean} Returns `true` if the `target` element is found, else `false`.
     * @example
     *
     * _.contains([1, 2, 3], 1);
     * // => true
     *
     * _.contains([1, 2, 3], 1, 2);
     * // => false
     *
     * _.contains({ 'name': 'fred', 'age': 40 }, 'fred');
     * // => true
     *
     * _.contains('pebbles', 'eb');
     * // => true
     */
    function contains(collection, target, fromIndex) {
      var index = -1,
          indexOf = getIndexOf(),
          length = collection ? collection.length : 0,
          result = false;

      fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex) || 0;
      if (isArray(collection)) {
        result = indexOf(collection, target, fromIndex) > -1;
      } else if (typeof length == 'number') {
        result = (isString(collection) ? collection.indexOf(target, fromIndex) : indexOf(collection, target, fromIndex)) > -1;
      } else {
        forOwn(collection, function(value) {
          if (++index >= fromIndex) {
            return !(result = value === target);
          }
        });
      }
      return result;
    }

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of `collection` through the callback. The corresponding value
     * of each key is the number of times the key was returned by the callback.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy(['one', 'two', 'three'], 'length');
     * // => { '3': 2, '5': 1 }
     */
    var countBy = createAggregator(function(result, value, key) {
      (hasOwnProperty.call(result, key) ? result[key]++ : result[key] = 1);
    });

    /**
     * Checks if the given callback returns truey value for **all** elements of
     * a collection. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias all
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if all elements passed the callback check,
     *  else `false`.
     * @example
     *
     * _.every([true, 1, null, 'yes']);
     * // => false
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.every(characters, 'age');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.every(characters, { 'age': 36 });
     * // => false
     */
    function every(collection, callback, thisArg) {
      var result = true;
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          if (!(result = !!callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          return (result = !!callback(value, index, collection));
        });
      }
      return result;
    }

    /**
     * Iterates over elements of a collection, returning an array of all elements
     * the callback returns truey for. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias select
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that passed the callback check.
     * @example
     *
     * var evens = _.filter([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [2, 4, 6]
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.filter(characters, 'blocked');
     * // => [{ 'name': 'fred', 'age': 40, 'blocked': true }]
     *
     * // using "_.where" callback shorthand
     * _.filter(characters, { 'age': 36 });
     * // => [{ 'name': 'barney', 'age': 36, 'blocked': false }]
     */
    function filter(collection, callback, thisArg) {
      var result = [];
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            result.push(value);
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result.push(value);
          }
        });
      }
      return result;
    }

    /**
     * Iterates over elements of a collection, returning the first element that
     * the callback returns truey for. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias detect, findWhere
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the found element, else `undefined`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': false },
     *   { 'name': 'fred',    'age': 40, 'blocked': true },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': false }
     * ];
     *
     * _.find(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => { 'name': 'barney', 'age': 36, 'blocked': false }
     *
     * // using "_.where" callback shorthand
     * _.find(characters, { 'age': 1 });
     * // =>  { 'name': 'pebbles', 'age': 1, 'blocked': false }
     *
     * // using "_.pluck" callback shorthand
     * _.find(characters, 'blocked');
     * // => { 'name': 'fred', 'age': 40, 'blocked': true }
     */
    function find(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            return value;
          }
        }
      } else {
        var result;
        forOwn(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result = value;
            return false;
          }
        });
        return result;
      }
    }

    /**
     * This method is like `_.find` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the found element, else `undefined`.
     * @example
     *
     * _.findLast([1, 2, 3, 4], function(num) {
     *   return num % 2 == 1;
     * });
     * // => 3
     */
    function findLast(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forEachRight(collection, function(value, index, collection) {
        if (callback(value, index, collection)) {
          result = value;
          return false;
        }
      });
      return result;
    }

    /**
     * Iterates over elements of a collection, executing the callback for each
     * element. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection). Callbacks may exit iteration early by
     * explicitly returning `false`.
     *
     * Note: As with other "Collections" methods, objects with a `length` property
     * are iterated like arrays. To avoid this behavior `_.forIn` or `_.forOwn`
     * may be used for object iteration.
     *
     * @static
     * @memberOf _
     * @alias each
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array|Object|string} Returns `collection`.
     * @example
     *
     * _([1, 2, 3]).forEach(function(num) { console.log(num); }).join(',');
     * // => logs each number and returns '1,2,3'
     *
     * _.forEach({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { console.log(num); });
     * // => logs each number and returns the object (property order is not guaranteed across environments)
     */
    function forEach(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0;

      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        while (++index < length) {
          if (callback(collection[index], index, collection) === false) {
            break;
          }
        }
      } else {
        forOwn(collection, callback);
      }
      return collection;
    }

    /**
     * This method is like `_.forEach` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @alias eachRight
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array|Object|string} Returns `collection`.
     * @example
     *
     * _([1, 2, 3]).forEachRight(function(num) { console.log(num); }).join(',');
     * // => logs each number from right to left and returns '3,2,1'
     */
    function forEachRight(collection, callback, thisArg) {
      var length = collection ? collection.length : 0;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        while (length--) {
          if (callback(collection[length], length, collection) === false) {
            break;
          }
        }
      } else {
        var props = keys(collection);
        length = props.length;
        forOwn(collection, function(value, key, collection) {
          key = props ? props[--length] : --length;
          return callback(collection[key], key, collection);
        });
      }
      return collection;
    }

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of a collection through the callback. The corresponding value
     * of each key is an array of the elements responsible for generating the key.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * // using "_.pluck" callback shorthand
     * _.groupBy(['one', 'two', 'three'], 'length');
     * // => { '3': ['one', 'two'], '5': ['three'] }
     */
    var groupBy = createAggregator(function(result, value, key) {
      (hasOwnProperty.call(result, key) ? result[key] : result[key] = []).push(value);
    });

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of the collection through the given callback. The corresponding
     * value of each key is the last element responsible for generating the key.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * var keys = [
     *   { 'dir': 'left', 'code': 97 },
     *   { 'dir': 'right', 'code': 100 }
     * ];
     *
     * _.indexBy(keys, 'dir');
     * // => { 'left': { 'dir': 'left', 'code': 97 }, 'right': { 'dir': 'right', 'code': 100 } }
     *
     * _.indexBy(keys, function(key) { return String.fromCharCode(key.code); });
     * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
     *
     * _.indexBy(characters, function(key) { this.fromCharCode(key.code); }, String);
     * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
     */
    var indexBy = createAggregator(function(result, value, key) {
      result[key] = value;
    });

    /**
     * Invokes the method named by `methodName` on each element in the `collection`
     * returning an array of the results of each invoked method. Additional arguments
     * will be provided to each invoked method. If `methodName` is a function it
     * will be invoked for, and `this` bound to, each element in the `collection`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|string} methodName The name of the method to invoke or
     *  the function invoked per iteration.
     * @param {...*} [arg] Arguments to invoke the method with.
     * @returns {Array} Returns a new array of the results of each invoked method.
     * @example
     *
     * _.invoke([[5, 1, 7], [3, 2, 1]], 'sort');
     * // => [[1, 5, 7], [1, 2, 3]]
     *
     * _.invoke([123, 456], String.prototype.split, '');
     * // => [['1', '2', '3'], ['4', '5', '6']]
     */
    function invoke(collection, methodName) {
      var args = slice(arguments, 2),
          index = -1,
          isFunc = typeof methodName == 'function',
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        result[++index] = (isFunc ? methodName : value[methodName]).apply(value, args);
      });
      return result;
    }

    /**
     * Creates an array of values by running each element in the collection
     * through the callback. The callback is bound to `thisArg` and invoked with
     * three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias collect
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of the results of each `callback` execution.
     * @example
     *
     * _.map([1, 2, 3], function(num) { return num * 3; });
     * // => [3, 6, 9]
     *
     * _.map({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { return num * 3; });
     * // => [3, 6, 9] (property order is not guaranteed across environments)
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.map(characters, 'name');
     * // => ['barney', 'fred']
     */
    function map(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0;

      callback = lodash.createCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        var result = Array(length);
        while (++index < length) {
          result[index] = callback(collection[index], index, collection);
        }
      } else {
        result = [];
        forOwn(collection, function(value, key, collection) {
          result[++index] = callback(value, key, collection);
        });
      }
      return result;
    }

    /**
     * Retrieves the maximum value of a collection. If the collection is empty or
     * falsey `-Infinity` is returned. If a callback is provided it will be executed
     * for each value in the collection to generate the criterion by which the value
     * is ranked. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the maximum value.
     * @example
     *
     * _.max([4, 2, 8, 6]);
     * // => 8
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.max(characters, function(chr) { return chr.age; });
     * // => { 'name': 'fred', 'age': 40 };
     *
     * // using "_.pluck" callback shorthand
     * _.max(characters, 'age');
     * // => { 'name': 'fred', 'age': 40 };
     */
    function max(collection, callback, thisArg) {
      var computed = -Infinity,
          result = computed;

      // allows working with functions like `_.map` without using
      // their `index` argument as a callback
      if (typeof callback != 'function' && thisArg && thisArg[callback] === collection) {
        callback = null;
      }
      if (callback == null && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value > result) {
            result = value;
          }
        }
      } else {
        callback = (callback == null && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg, 3);

        forEach(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current > computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the minimum value of a collection. If the collection is empty or
     * falsey `Infinity` is returned. If a callback is provided it will be executed
     * for each value in the collection to generate the criterion by which the value
     * is ranked. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the minimum value.
     * @example
     *
     * _.min([4, 2, 8, 6]);
     * // => 2
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.min(characters, function(chr) { return chr.age; });
     * // => { 'name': 'barney', 'age': 36 };
     *
     * // using "_.pluck" callback shorthand
     * _.min(characters, 'age');
     * // => { 'name': 'barney', 'age': 36 };
     */
    function min(collection, callback, thisArg) {
      var computed = Infinity,
          result = computed;

      // allows working with functions like `_.map` without using
      // their `index` argument as a callback
      if (typeof callback != 'function' && thisArg && thisArg[callback] === collection) {
        callback = null;
      }
      if (callback == null && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value < result) {
            result = value;
          }
        }
      } else {
        callback = (callback == null && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg, 3);

        forEach(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current < computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the value of a specified property from all elements in the collection.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {string} property The name of the property to pluck.
     * @returns {Array} Returns a new array of property values.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.pluck(characters, 'name');
     * // => ['barney', 'fred']
     */
    var pluck = map;

    /**
     * Reduces a collection to a value which is the accumulated result of running
     * each element in the collection through the callback, where each successive
     * callback execution consumes the return value of the previous execution. If
     * `accumulator` is not provided the first element of the collection will be
     * used as the initial `accumulator` value. The callback is bound to `thisArg`
     * and invoked with four arguments; (accumulator, value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @alias foldl, inject
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] Initial value of the accumulator.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var sum = _.reduce([1, 2, 3], function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * var mapped = _.reduce({ 'a': 1, 'b': 2, 'c': 3 }, function(result, num, key) {
     *   result[key] = num * 3;
     *   return result;
     * }, {});
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     */
    function reduce(collection, callback, accumulator, thisArg) {
      if (!collection) return accumulator;
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);

      var index = -1,
          length = collection.length;

      if (typeof length == 'number') {
        if (noaccum) {
          accumulator = collection[++index];
        }
        while (++index < length) {
          accumulator = callback(accumulator, collection[index], index, collection);
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          accumulator = noaccum
            ? (noaccum = false, value)
            : callback(accumulator, value, index, collection)
        });
      }
      return accumulator;
    }

    /**
     * This method is like `_.reduce` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @alias foldr
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] Initial value of the accumulator.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var list = [[0, 1], [2, 3], [4, 5]];
     * var flat = _.reduceRight(list, function(a, b) { return a.concat(b); }, []);
     * // => [4, 5, 2, 3, 0, 1]
     */
    function reduceRight(collection, callback, accumulator, thisArg) {
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);
      forEachRight(collection, function(value, index, collection) {
        accumulator = noaccum
          ? (noaccum = false, value)
          : callback(accumulator, value, index, collection);
      });
      return accumulator;
    }

    /**
     * The opposite of `_.filter` this method returns the elements of a
     * collection that the callback does **not** return truey for.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that failed the callback check.
     * @example
     *
     * var odds = _.reject([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [1, 3, 5]
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.reject(characters, 'blocked');
     * // => [{ 'name': 'barney', 'age': 36, 'blocked': false }]
     *
     * // using "_.where" callback shorthand
     * _.reject(characters, { 'age': 36 });
     * // => [{ 'name': 'fred', 'age': 40, 'blocked': true }]
     */
    function reject(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg, 3);
      return filter(collection, function(value, index, collection) {
        return !callback(value, index, collection);
      });
    }

    /**
     * Retrieves a random element or `n` random elements from a collection.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to sample.
     * @param {number} [n] The number of elements to sample.
     * @param- {Object} [guard] Allows working with functions like `_.map`
     *  without using their `index` arguments as `n`.
     * @returns {Array} Returns the random sample(s) of `collection`.
     * @example
     *
     * _.sample([1, 2, 3, 4]);
     * // => 2
     *
     * _.sample([1, 2, 3, 4], 2);
     * // => [3, 1]
     */
    function sample(collection, n, guard) {
      if (collection && typeof collection.length != 'number') {
        collection = values(collection);
      }
      if (n == null || guard) {
        return collection ? collection[baseRandom(0, collection.length - 1)] : undefined;
      }
      var result = shuffle(collection);
      result.length = nativeMin(nativeMax(0, n), result.length);
      return result;
    }

    /**
     * Creates an array of shuffled values, using a version of the Fisher-Yates
     * shuffle. See http://en.wikipedia.org/wiki/Fisher-Yates_shuffle.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to shuffle.
     * @returns {Array} Returns a new shuffled collection.
     * @example
     *
     * _.shuffle([1, 2, 3, 4, 5, 6]);
     * // => [4, 1, 6, 3, 5, 2]
     */
    function shuffle(collection) {
      var index = -1,
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        var rand = baseRandom(0, ++index);
        result[index] = result[rand];
        result[rand] = value;
      });
      return result;
    }

    /**
     * Gets the size of the `collection` by returning `collection.length` for arrays
     * and array-like objects or the number of own enumerable properties for objects.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to inspect.
     * @returns {number} Returns `collection.length` or number of own enumerable properties.
     * @example
     *
     * _.size([1, 2]);
     * // => 2
     *
     * _.size({ 'one': 1, 'two': 2, 'three': 3 });
     * // => 3
     *
     * _.size('pebbles');
     * // => 7
     */
    function size(collection) {
      var length = collection ? collection.length : 0;
      return typeof length == 'number' ? length : keys(collection).length;
    }

    /**
     * Checks if the callback returns a truey value for **any** element of a
     * collection. The function returns as soon as it finds a passing value and
     * does not iterate over the entire collection. The callback is bound to
     * `thisArg` and invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias any
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if any element passed the callback check,
     *  else `false`.
     * @example
     *
     * _.some([null, 0, 'yes', false], Boolean);
     * // => true
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.some(characters, 'blocked');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.some(characters, { 'age': 1 });
     * // => false
     */
    function some(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          if ((result = callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          return !(result = callback(value, index, collection));
        });
      }
      return !!result;
    }

    /**
     * Creates an array of elements, sorted in ascending order by the results of
     * running each element in a collection through the callback. This method
     * performs a stable sort, that is, it will preserve the original sort order
     * of equal elements. The callback is bound to `thisArg` and invoked with
     * three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an array of property names is provided for `callback` the collection
     * will be sorted by each property value.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Array|Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of sorted elements.
     * @example
     *
     * _.sortBy([1, 2, 3], function(num) { return Math.sin(num); });
     * // => [3, 1, 2]
     *
     * _.sortBy([1, 2, 3], function(num) { return this.sin(num); }, Math);
     * // => [3, 1, 2]
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36 },
     *   { 'name': 'fred',    'age': 40 },
     *   { 'name': 'barney',  'age': 26 },
     *   { 'name': 'fred',    'age': 30 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.map(_.sortBy(characters, 'age'), _.values);
     * // => [['barney', 26], ['fred', 30], ['barney', 36], ['fred', 40]]
     *
     * // sorting by multiple properties
     * _.map(_.sortBy(characters, ['name', 'age']), _.values);
     * // = > [['barney', 26], ['barney', 36], ['fred', 30], ['fred', 40]]
     */
    function sortBy(collection, callback, thisArg) {
      var index = -1,
          isArr = isArray(callback),
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      if (!isArr) {
        callback = lodash.createCallback(callback, thisArg, 3);
      }
      forEach(collection, function(value, key, collection) {
        var object = result[++index] = getObject();
        if (isArr) {
          object.criteria = map(callback, function(key) { return value[key]; });
        } else {
          (object.criteria = getArray())[0] = callback(value, key, collection);
        }
        object.index = index;
        object.value = value;
      });

      length = result.length;
      result.sort(compareAscending);
      while (length--) {
        var object = result[length];
        result[length] = object.value;
        if (!isArr) {
          releaseArray(object.criteria);
        }
        releaseObject(object);
      }
      return result;
    }

    /**
     * Converts the `collection` to an array.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to convert.
     * @returns {Array} Returns the new converted array.
     * @example
     *
     * (function() { return _.toArray(arguments).slice(1); })(1, 2, 3, 4);
     * // => [2, 3, 4]
     */
    function toArray(collection) {
      if (collection && typeof collection.length == 'number') {
        return slice(collection);
      }
      return values(collection);
    }

    /**
     * Performs a deep comparison of each element in a `collection` to the given
     * `properties` object, returning an array of all elements that have equivalent
     * property values.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Object} props The object of property values to filter by.
     * @returns {Array} Returns a new array of elements that have the given properties.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'pets': ['hoppy'] },
     *   { 'name': 'fred',   'age': 40, 'pets': ['baby puss', 'dino'] }
     * ];
     *
     * _.where(characters, { 'age': 36 });
     * // => [{ 'name': 'barney', 'age': 36, 'pets': ['hoppy'] }]
     *
     * _.where(characters, { 'pets': ['dino'] });
     * // => [{ 'name': 'fred', 'age': 40, 'pets': ['baby puss', 'dino'] }]
     */
    var where = filter;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array with all falsey values removed. The values `false`, `null`,
     * `0`, `""`, `undefined`, and `NaN` are all falsey.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to compact.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.compact([0, 1, false, 2, '', 3]);
     * // => [1, 2, 3]
     */
    function compact(array) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      while (++index < length) {
        var value = array[index];
        if (value) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * Creates an array excluding all values of the provided arrays using strict
     * equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {...Array} [values] The arrays of values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
     * // => [1, 3, 4]
     */
    function difference(array) {
      return baseDifference(array, baseFlatten(arguments, true, true, 1));
    }

    /**
     * This method is like `_.find` except that it returns the index of the first
     * element that passes the callback check, instead of the element itself.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index of the found element, else `-1`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': false },
     *   { 'name': 'fred',    'age': 40, 'blocked': true },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': false }
     * ];
     *
     * _.findIndex(characters, function(chr) {
     *   return chr.age < 20;
     * });
     * // => 2
     *
     * // using "_.where" callback shorthand
     * _.findIndex(characters, { 'age': 36 });
     * // => 0
     *
     * // using "_.pluck" callback shorthand
     * _.findIndex(characters, 'blocked');
     * // => 1
     */
    function findIndex(array, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0;

      callback = lodash.createCallback(callback, thisArg, 3);
      while (++index < length) {
        if (callback(array[index], index, array)) {
          return index;
        }
      }
      return -1;
    }

    /**
     * This method is like `_.findIndex` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index of the found element, else `-1`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': true },
     *   { 'name': 'fred',    'age': 40, 'blocked': false },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': true }
     * ];
     *
     * _.findLastIndex(characters, function(chr) {
     *   return chr.age > 30;
     * });
     * // => 1
     *
     * // using "_.where" callback shorthand
     * _.findLastIndex(characters, { 'age': 36 });
     * // => 0
     *
     * // using "_.pluck" callback shorthand
     * _.findLastIndex(characters, 'blocked');
     * // => 2
     */
    function findLastIndex(array, callback, thisArg) {
      var length = array ? array.length : 0;
      callback = lodash.createCallback(callback, thisArg, 3);
      while (length--) {
        if (callback(array[length], length, array)) {
          return length;
        }
      }
      return -1;
    }

    /**
     * Gets the first element or first `n` elements of an array. If a callback
     * is provided elements at the beginning of the array are returned as long
     * as the callback returns truey. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias head, take
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the first element(s) of `array`.
     * @example
     *
     * _.first([1, 2, 3]);
     * // => 1
     *
     * _.first([1, 2, 3], 2);
     * // => [1, 2]
     *
     * _.first([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [1, 2]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': true,  'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': false, 'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.first(characters, 'blocked');
     * // => [{ 'name': 'barney', 'blocked': true, 'employer': 'slate' }]
     *
     * // using "_.where" callback shorthand
     * _.pluck(_.first(characters, { 'employer': 'slate' }), 'name');
     * // => ['barney', 'fred']
     */
    function first(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = -1;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = callback;
        if (n == null || thisArg) {
          return array ? array[0] : undefined;
        }
      }
      return slice(array, 0, nativeMin(nativeMax(0, n), length));
    }

    /**
     * Flattens a nested array (the nesting can be to any depth). If `isShallow`
     * is truey, the array will only be flattened a single level. If a callback
     * is provided each element of the array is passed through the callback before
     * flattening. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to flatten.
     * @param {boolean} [isShallow=false] A flag to restrict flattening to a single level.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new flattened array.
     * @example
     *
     * _.flatten([1, [2], [3, [[4]]]]);
     * // => [1, 2, 3, 4];
     *
     * _.flatten([1, [2], [3, [[4]]]], true);
     * // => [1, 2, 3, [[4]]];
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 30, 'pets': ['hoppy'] },
     *   { 'name': 'fred',   'age': 40, 'pets': ['baby puss', 'dino'] }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.flatten(characters, 'pets');
     * // => ['hoppy', 'baby puss', 'dino']
     */
    function flatten(array, isShallow, callback, thisArg) {
      // juggle arguments
      if (typeof isShallow != 'boolean' && isShallow != null) {
        thisArg = callback;
        callback = (typeof isShallow != 'function' && thisArg && thisArg[isShallow] === array) ? null : isShallow;
        isShallow = false;
      }
      if (callback != null) {
        array = map(array, callback, thisArg);
      }
      return baseFlatten(array, isShallow);
    }

    /**
     * Gets the index at which the first occurrence of `value` is found using
     * strict equality for comparisons, i.e. `===`. If the array is already sorted
     * providing `true` for `fromIndex` will run a faster binary search.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @param {boolean|number} [fromIndex=0] The index to search from or `true`
     *  to perform a binary search on a sorted array.
     * @returns {number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 1
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 4
     *
     * _.indexOf([1, 1, 2, 2, 3, 3], 2, true);
     * // => 2
     */
    function indexOf(array, value, fromIndex) {
      if (typeof fromIndex == 'number') {
        var length = array ? array.length : 0;
        fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex || 0);
      } else if (fromIndex) {
        var index = sortedIndex(array, value);
        return array[index] === value ? index : -1;
      }
      return baseIndexOf(array, value, fromIndex);
    }

    /**
     * Gets all but the last element or last `n` elements of an array. If a
     * callback is provided elements at the end of the array are excluded from
     * the result as long as the callback returns truey. The callback is bound
     * to `thisArg` and invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.initial([1, 2, 3]);
     * // => [1, 2]
     *
     * _.initial([1, 2, 3], 2);
     * // => [1]
     *
     * _.initial([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [1]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': false, 'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': true,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.initial(characters, 'blocked');
     * // => [{ 'name': 'barney',  'blocked': false, 'employer': 'slate' }]
     *
     * // using "_.where" callback shorthand
     * _.pluck(_.initial(characters, { 'employer': 'na' }), 'name');
     * // => ['barney', 'fred']
     */
    function initial(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : callback || n;
      }
      return slice(array, 0, nativeMin(nativeMax(0, length - n), length));
    }

    /**
     * Creates an array of unique values present in all provided arrays using
     * strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of shared values.
     * @example
     *
     * _.intersection([1, 2, 3], [5, 2, 1, 4], [2, 1]);
     * // => [1, 2]
     */
    function intersection() {
      var args = [],
          argsIndex = -1,
          argsLength = arguments.length,
          caches = getArray(),
          indexOf = getIndexOf(),
          trustIndexOf = indexOf === baseIndexOf,
          seen = getArray();

      while (++argsIndex < argsLength) {
        var value = arguments[argsIndex];
        if (isArray(value) || isArguments(value)) {
          args.push(value);
          caches.push(trustIndexOf && value.length >= largeArraySize &&
            createCache(argsIndex ? args[argsIndex] : seen));
        }
      }
      var array = args[0],
          index = -1,
          length = array ? array.length : 0,
          result = [];

      outer:
      while (++index < length) {
        var cache = caches[0];
        value = array[index];

        if ((cache ? cacheIndexOf(cache, value) : indexOf(seen, value)) < 0) {
          argsIndex = argsLength;
          (cache || seen).push(value);
          while (--argsIndex) {
            cache = caches[argsIndex];
            if ((cache ? cacheIndexOf(cache, value) : indexOf(args[argsIndex], value)) < 0) {
              continue outer;
            }
          }
          result.push(value);
        }
      }
      while (argsLength--) {
        cache = caches[argsLength];
        if (cache) {
          releaseObject(cache);
        }
      }
      releaseArray(caches);
      releaseArray(seen);
      return result;
    }

    /**
     * Gets the last element or last `n` elements of an array. If a callback is
     * provided elements at the end of the array are returned as long as the
     * callback returns truey. The callback is bound to `thisArg` and invoked
     * with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the last element(s) of `array`.
     * @example
     *
     * _.last([1, 2, 3]);
     * // => 3
     *
     * _.last([1, 2, 3], 2);
     * // => [2, 3]
     *
     * _.last([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [2, 3]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': false, 'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': true,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.pluck(_.last(characters, 'blocked'), 'name');
     * // => ['fred', 'pebbles']
     *
     * // using "_.where" callback shorthand
     * _.last(characters, { 'employer': 'na' });
     * // => [{ 'name': 'pebbles', 'blocked': true, 'employer': 'na' }]
     */
    function last(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = callback;
        if (n == null || thisArg) {
          return array ? array[length - 1] : undefined;
        }
      }
      return slice(array, nativeMax(0, length - n));
    }

    /**
     * Gets the index at which the last occurrence of `value` is found using strict
     * equality for comparisons, i.e. `===`. If `fromIndex` is negative, it is used
     * as the offset from the end of the collection.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @param {number} [fromIndex=array.length-1] The index to search from.
     * @returns {number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 4
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 1
     */
    function lastIndexOf(array, value, fromIndex) {
      var index = array ? array.length : 0;
      if (typeof fromIndex == 'number') {
        index = (fromIndex < 0 ? nativeMax(0, index + fromIndex) : nativeMin(fromIndex, index - 1)) + 1;
      }
      while (index--) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }

    /**
     * Removes all provided values from the given array using strict equality for
     * comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to modify.
     * @param {...*} [value] The values to remove.
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = [1, 2, 3, 1, 2, 3];
     * _.pull(array, 2, 3);
     * console.log(array);
     * // => [1, 1]
     */
    function pull(array) {
      var args = arguments,
          argsIndex = 0,
          argsLength = args.length,
          length = array ? array.length : 0;

      while (++argsIndex < argsLength) {
        var index = -1,
            value = args[argsIndex];
        while (++index < length) {
          if (array[index] === value) {
            splice.call(array, index--, 1);
            length--;
          }
        }
      }
      return array;
    }

    /**
     * Creates an array of numbers (positive and/or negative) progressing from
     * `start` up to but not including `end`. If `start` is less than `stop` a
     * zero-length range is created unless a negative `step` is specified.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {number} [start=0] The start of the range.
     * @param {number} end The end of the range.
     * @param {number} [step=1] The value to increment or decrement by.
     * @returns {Array} Returns a new range array.
     * @example
     *
     * _.range(4);
     * // => [0, 1, 2, 3]
     *
     * _.range(1, 5);
     * // => [1, 2, 3, 4]
     *
     * _.range(0, 20, 5);
     * // => [0, 5, 10, 15]
     *
     * _.range(0, -4, -1);
     * // => [0, -1, -2, -3]
     *
     * _.range(1, 4, 0);
     * // => [1, 1, 1]
     *
     * _.range(0);
     * // => []
     */
    function range(start, end, step) {
      start = +start || 0;
      step = typeof step == 'number' ? step : (+step || 1);

      if (end == null) {
        end = start;
        start = 0;
      }
      // use `Array(length)` so engines like Chakra and V8 avoid slower modes
      // http://youtu.be/XAqIpGU8ZZk#t=17m25s
      var index = -1,
          length = nativeMax(0, ceil((end - start) / (step || 1))),
          result = Array(length);

      while (++index < length) {
        result[index] = start;
        start += step;
      }
      return result;
    }

    /**
     * Removes all elements from an array that the callback returns truey for
     * and returns an array of removed elements. The callback is bound to `thisArg`
     * and invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to modify.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of removed elements.
     * @example
     *
     * var array = [1, 2, 3, 4, 5, 6];
     * var evens = _.remove(array, function(num) { return num % 2 == 0; });
     *
     * console.log(array);
     * // => [1, 3, 5]
     *
     * console.log(evens);
     * // => [2, 4, 6]
     */
    function remove(array, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      callback = lodash.createCallback(callback, thisArg, 3);
      while (++index < length) {
        var value = array[index];
        if (callback(value, index, array)) {
          result.push(value);
          splice.call(array, index--, 1);
          length--;
        }
      }
      return result;
    }

    /**
     * The opposite of `_.initial` this method gets all but the first element or
     * first `n` elements of an array. If a callback function is provided elements
     * at the beginning of the array are excluded from the result as long as the
     * callback returns truey. The callback is bound to `thisArg` and invoked
     * with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias drop, tail
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.rest([1, 2, 3]);
     * // => [2, 3]
     *
     * _.rest([1, 2, 3], 2);
     * // => [3]
     *
     * _.rest([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [3]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': true,  'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': false,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true, 'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.pluck(_.rest(characters, 'blocked'), 'name');
     * // => ['fred', 'pebbles']
     *
     * // using "_.where" callback shorthand
     * _.rest(characters, { 'employer': 'slate' });
     * // => [{ 'name': 'pebbles', 'blocked': true, 'employer': 'na' }]
     */
    function rest(array, callback, thisArg) {
      if (typeof callback != 'number' && callback != null) {
        var n = 0,
            index = -1,
            length = array ? array.length : 0;

        callback = lodash.createCallback(callback, thisArg, 3);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : nativeMax(0, callback);
      }
      return slice(array, n);
    }

    /**
     * Uses a binary search to determine the smallest index at which a value
     * should be inserted into a given sorted array in order to maintain the sort
     * order of the array. If a callback is provided it will be executed for
     * `value` and each element of `array` to compute their sort ranking. The
     * callback is bound to `thisArg` and invoked with one argument; (value).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to inspect.
     * @param {*} value The value to evaluate.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index at which `value` should be inserted
     *  into `array`.
     * @example
     *
     * _.sortedIndex([20, 30, 50], 40);
     * // => 2
     *
     * // using "_.pluck" callback shorthand
     * _.sortedIndex([{ 'x': 20 }, { 'x': 30 }, { 'x': 50 }], { 'x': 40 }, 'x');
     * // => 2
     *
     * var dict = {
     *   'wordToNumber': { 'twenty': 20, 'thirty': 30, 'fourty': 40, 'fifty': 50 }
     * };
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return dict.wordToNumber[word];
     * });
     * // => 2
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return this.wordToNumber[word];
     * }, dict);
     * // => 2
     */
    function sortedIndex(array, value, callback, thisArg) {
      var low = 0,
          high = array ? array.length : low;

      // explicitly reference `identity` for better inlining in Firefox
      callback = callback ? lodash.createCallback(callback, thisArg, 1) : identity;
      value = callback(value);

      while (low < high) {
        var mid = (low + high) >>> 1;
        (callback(array[mid]) < value)
          ? low = mid + 1
          : high = mid;
      }
      return low;
    }

    /**
     * Creates an array of unique values, in order, of the provided arrays using
     * strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of combined values.
     * @example
     *
     * _.union([1, 2, 3], [5, 2, 1, 4], [2, 1]);
     * // => [1, 2, 3, 5, 4]
     */
    function union() {
      return baseUniq(baseFlatten(arguments, true, true));
    }

    /**
     * Creates a duplicate-value-free version of an array using strict equality
     * for comparisons, i.e. `===`. If the array is sorted, providing
     * `true` for `isSorted` will use a faster algorithm. If a callback is provided
     * each element of `array` is passed through the callback before uniqueness
     * is computed. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias unique
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {boolean} [isSorted=false] A flag to indicate that `array` is sorted.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a duplicate-value-free array.
     * @example
     *
     * _.uniq([1, 2, 1, 3, 1]);
     * // => [1, 2, 3]
     *
     * _.uniq([1, 1, 2, 2, 3], true);
     * // => [1, 2, 3]
     *
     * _.uniq(['A', 'b', 'C', 'a', 'B', 'c'], function(letter) { return letter.toLowerCase(); });
     * // => ['A', 'b', 'C']
     *
     * _.uniq([1, 2.5, 3, 1.5, 2, 3.5], function(num) { return this.floor(num); }, Math);
     * // => [1, 2.5, 3]
     *
     * // using "_.pluck" callback shorthand
     * _.uniq([{ 'x': 1 }, { 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 1 }, { 'x': 2 }]
     */
    function uniq(array, isSorted, callback, thisArg) {
      // juggle arguments
      if (typeof isSorted != 'boolean' && isSorted != null) {
        thisArg = callback;
        callback = (typeof isSorted != 'function' && thisArg && thisArg[isSorted] === array) ? null : isSorted;
        isSorted = false;
      }
      if (callback != null) {
        callback = lodash.createCallback(callback, thisArg, 3);
      }
      return baseUniq(array, isSorted, callback);
    }

    /**
     * Creates an array excluding all provided values using strict equality for
     * comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to filter.
     * @param {...*} [value] The values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
     * // => [2, 3, 4]
     */
    function without(array) {
      return baseDifference(array, slice(arguments, 1));
    }

    /**
     * Creates an array that is the symmetric difference of the provided arrays.
     * See http://en.wikipedia.org/wiki/Symmetric_difference.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of values.
     * @example
     *
     * _.xor([1, 2, 3], [5, 2, 1, 4]);
     * // => [3, 5, 4]
     *
     * _.xor([1, 2, 5], [2, 3, 5], [3, 4, 5]);
     * // => [1, 4, 5]
     */
    function xor() {
      var index = -1,
          length = arguments.length;

      while (++index < length) {
        var array = arguments[index];
        if (isArray(array) || isArguments(array)) {
          var result = result
            ? baseUniq(baseDifference(result, array).concat(baseDifference(array, result)))
            : array;
        }
      }
      return result || [];
    }

    /**
     * Creates an array of grouped elements, the first of which contains the first
     * elements of the given arrays, the second of which contains the second
     * elements of the given arrays, and so on.
     *
     * @static
     * @memberOf _
     * @alias unzip
     * @category Arrays
     * @param {...Array} [array] Arrays to process.
     * @returns {Array} Returns a new array of grouped elements.
     * @example
     *
     * _.zip(['fred', 'barney'], [30, 40], [true, false]);
     * // => [['fred', 30, true], ['barney', 40, false]]
     */
    function zip() {
      var array = arguments.length > 1 ? arguments : arguments[0],
          index = -1,
          length = array ? max(pluck(array, 'length')) : 0,
          result = Array(length < 0 ? 0 : length);

      while (++index < length) {
        result[index] = pluck(array, index);
      }
      return result;
    }

    /**
     * Creates an object composed from arrays of `keys` and `values`. Provide
     * either a single two dimensional array, i.e. `[[key1, value1], [key2, value2]]`
     * or two arrays, one of `keys` and one of corresponding `values`.
     *
     * @static
     * @memberOf _
     * @alias object
     * @category Arrays
     * @param {Array} keys The array of keys.
     * @param {Array} [values=[]] The array of values.
     * @returns {Object} Returns an object composed of the given keys and
     *  corresponding values.
     * @example
     *
     * _.zipObject(['fred', 'barney'], [30, 40]);
     * // => { 'fred': 30, 'barney': 40 }
     */
    function zipObject(keys, values) {
      var index = -1,
          length = keys ? keys.length : 0,
          result = {};

      if (!values && length && !isArray(keys[0])) {
        values = [];
      }
      while (++index < length) {
        var key = keys[index];
        if (values) {
          result[key] = values[index];
        } else if (key) {
          result[key[0]] = key[1];
        }
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a function that executes `func`, with  the `this` binding and
     * arguments of the created function, only after being called `n` times.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {number} n The number of times the function must be called before
     *  `func` is executed.
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var saves = ['profile', 'settings'];
     *
     * var done = _.after(saves.length, function() {
     *   console.log('Done saving!');
     * });
     *
     * _.forEach(saves, function(type) {
     *   asyncSave({ 'type': type, 'complete': done });
     * });
     * // => logs 'Done saving!', after all saves have completed
     */
    function after(n, func) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      return function() {
        if (--n < 1) {
          return func.apply(this, arguments);
        }
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with the `this`
     * binding of `thisArg` and prepends any additional `bind` arguments to those
     * provided to the bound function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to bind.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var func = function(greeting) {
     *   return greeting + ' ' + this.name;
     * };
     *
     * func = _.bind(func, { 'name': 'fred' }, 'hi');
     * func();
     * // => 'hi fred'
     */
    function bind(func, thisArg) {
      return arguments.length > 2
        ? createWrapper(func, 17, slice(arguments, 2), null, thisArg)
        : createWrapper(func, 1, null, null, thisArg);
    }

    /**
     * Binds methods of an object to the object itself, overwriting the existing
     * method. Method names may be specified as individual arguments or as arrays
     * of method names. If no method names are provided all the function properties
     * of `object` will be bound.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object to bind and assign the bound methods to.
     * @param {...string} [methodName] The object method names to
     *  bind, specified as individual method names or arrays of method names.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var view = {
     *   'label': 'docs',
     *   'onClick': function() { console.log('clicked ' + this.label); }
     * };
     *
     * _.bindAll(view);
     * jQuery('#docs').on('click', view.onClick);
     * // => logs 'clicked docs', when the button is clicked
     */
    function bindAll(object) {
      var funcs = arguments.length > 1 ? baseFlatten(arguments, true, false, 1) : functions(object),
          index = -1,
          length = funcs.length;

      while (++index < length) {
        var key = funcs[index];
        object[key] = createWrapper(object[key], 1, null, null, object);
      }
      return object;
    }

    /**
     * Creates a function that, when called, invokes the method at `object[key]`
     * and prepends any additional `bindKey` arguments to those provided to the bound
     * function. This method differs from `_.bind` by allowing bound functions to
     * reference methods that will be redefined or don't yet exist.
     * See http://michaux.ca/articles/lazy-function-definition-pattern.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object the method belongs to.
     * @param {string} key The key of the method.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var object = {
     *   'name': 'fred',
     *   'greet': function(greeting) {
     *     return greeting + ' ' + this.name;
     *   }
     * };
     *
     * var func = _.bindKey(object, 'greet', 'hi');
     * func();
     * // => 'hi fred'
     *
     * object.greet = function(greeting) {
     *   return greeting + 'ya ' + this.name + '!';
     * };
     *
     * func();
     * // => 'hiya fred!'
     */
    function bindKey(object, key) {
      return arguments.length > 2
        ? createWrapper(key, 19, slice(arguments, 2), null, object)
        : createWrapper(key, 3, null, null, object);
    }

    /**
     * Creates a function that is the composition of the provided functions,
     * where each function consumes the return value of the function that follows.
     * For example, composing the functions `f()`, `g()`, and `h()` produces `f(g(h()))`.
     * Each function is executed with the `this` binding of the composed function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {...Function} [func] Functions to compose.
     * @returns {Function} Returns the new composed function.
     * @example
     *
     * var realNameMap = {
     *   'pebbles': 'penelope'
     * };
     *
     * var format = function(name) {
     *   name = realNameMap[name.toLowerCase()] || name;
     *   return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
     * };
     *
     * var greet = function(formatted) {
     *   return 'Hiya ' + formatted + '!';
     * };
     *
     * var welcome = _.compose(greet, format);
     * welcome('pebbles');
     * // => 'Hiya Penelope!'
     */
    function compose() {
      var funcs = arguments,
          length = funcs.length;

      while (length--) {
        if (!isFunction(funcs[length])) {
          throw new TypeError;
        }
      }
      return function() {
        var args = arguments,
            length = funcs.length;

        while (length--) {
          args = [funcs[length].apply(this, args)];
        }
        return args[0];
      };
    }

    /**
     * Creates a function which accepts one or more arguments of `func` that when
     * invoked either executes `func` returning its result, if all `func` arguments
     * have been provided, or returns a function that accepts one or more of the
     * remaining `func` arguments, and so on. The arity of `func` can be specified
     * if `func.length` is not sufficient.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to curry.
     * @param {number} [arity=func.length] The arity of `func`.
     * @returns {Function} Returns the new curried function.
     * @example
     *
     * var curried = _.curry(function(a, b, c) {
     *   console.log(a + b + c);
     * });
     *
     * curried(1)(2)(3);
     * // => 6
     *
     * curried(1, 2)(3);
     * // => 6
     *
     * curried(1, 2, 3);
     * // => 6
     */
    function curry(func, arity) {
      arity = typeof arity == 'number' ? arity : (+arity || func.length);
      return createWrapper(func, 4, null, null, null, arity);
    }

    /**
     * Creates a function that will delay the execution of `func` until after
     * `wait` milliseconds have elapsed since the last time it was invoked.
     * Provide an options object to indicate that `func` should be invoked on
     * the leading and/or trailing edge of the `wait` timeout. Subsequent calls
     * to the debounced function will return the result of the last `func` call.
     *
     * Note: If `leading` and `trailing` options are `true` `func` will be called
     * on the trailing edge of the timeout only if the the debounced function is
     * invoked more than once during the `wait` timeout.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to debounce.
     * @param {number} wait The number of milliseconds to delay.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.leading=false] Specify execution on the leading edge of the timeout.
     * @param {number} [options.maxWait] The maximum time `func` is allowed to be delayed before it's called.
     * @param {boolean} [options.trailing=true] Specify execution on the trailing edge of the timeout.
     * @returns {Function} Returns the new debounced function.
     * @example
     *
     * // avoid costly calculations while the window size is in flux
     * var lazyLayout = _.debounce(calculateLayout, 150);
     * jQuery(window).on('resize', lazyLayout);
     *
     * // execute `sendMail` when the click event is fired, debouncing subsequent calls
     * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
     *   'leading': true,
     *   'trailing': false
     * });
     *
     * // ensure `batchLog` is executed once after 1 second of debounced calls
     * var source = new EventSource('/stream');
     * source.addEventListener('message', _.debounce(batchLog, 250, {
     *   'maxWait': 1000
     * }, false);
     */
    function debounce(func, wait, options) {
      var args,
          maxTimeoutId,
          result,
          stamp,
          thisArg,
          timeoutId,
          trailingCall,
          lastCalled = 0,
          maxWait = false,
          trailing = true;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      wait = nativeMax(0, wait) || 0;
      if (options === true) {
        var leading = true;
        trailing = false;
      } else if (isObject(options)) {
        leading = options.leading;
        maxWait = 'maxWait' in options && (nativeMax(wait, options.maxWait) || 0);
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      var delayed = function() {
        var remaining = wait - (now() - stamp);
        if (remaining <= 0) {
          if (maxTimeoutId) {
            clearTimeout(maxTimeoutId);
          }
          var isCalled = trailingCall;
          maxTimeoutId = timeoutId = trailingCall = undefined;
          if (isCalled) {
            lastCalled = now();
            result = func.apply(thisArg, args);
            if (!timeoutId && !maxTimeoutId) {
              args = thisArg = null;
            }
          }
        } else {
          timeoutId = setTimeout(delayed, remaining);
        }
      };

      var maxDelayed = function() {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        maxTimeoutId = timeoutId = trailingCall = undefined;
        if (trailing || (maxWait !== wait)) {
          lastCalled = now();
          result = func.apply(thisArg, args);
          if (!timeoutId && !maxTimeoutId) {
            args = thisArg = null;
          }
        }
      };

      return function() {
        args = arguments;
        stamp = now();
        thisArg = this;
        trailingCall = trailing && (timeoutId || !leading);

        if (maxWait === false) {
          var leadingCall = leading && !timeoutId;
        } else {
          if (!maxTimeoutId && !leading) {
            lastCalled = stamp;
          }
          var remaining = maxWait - (stamp - lastCalled),
              isCalled = remaining <= 0;

          if (isCalled) {
            if (maxTimeoutId) {
              maxTimeoutId = clearTimeout(maxTimeoutId);
            }
            lastCalled = stamp;
            result = func.apply(thisArg, args);
          }
          else if (!maxTimeoutId) {
            maxTimeoutId = setTimeout(maxDelayed, remaining);
          }
        }
        if (isCalled && timeoutId) {
          timeoutId = clearTimeout(timeoutId);
        }
        else if (!timeoutId && wait !== maxWait) {
          timeoutId = setTimeout(delayed, wait);
        }
        if (leadingCall) {
          isCalled = true;
          result = func.apply(thisArg, args);
        }
        if (isCalled && !timeoutId && !maxTimeoutId) {
          args = thisArg = null;
        }
        return result;
      };
    }

    /**
     * Defers executing the `func` function until the current call stack has cleared.
     * Additional arguments will be provided to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to defer.
     * @param {...*} [arg] Arguments to invoke the function with.
     * @returns {number} Returns the timer id.
     * @example
     *
     * _.defer(function(text) { console.log(text); }, 'deferred');
     * // logs 'deferred' after one or more milliseconds
     */
    function defer(func) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var args = slice(arguments, 1);
      return setTimeout(function() { func.apply(undefined, args); }, 1);
    }

    /**
     * Executes the `func` function after `wait` milliseconds. Additional arguments
     * will be provided to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to delay.
     * @param {number} wait The number of milliseconds to delay execution.
     * @param {...*} [arg] Arguments to invoke the function with.
     * @returns {number} Returns the timer id.
     * @example
     *
     * _.delay(function(text) { console.log(text); }, 1000, 'later');
     * // => logs 'later' after one second
     */
    function delay(func, wait) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var args = slice(arguments, 2);
      return setTimeout(function() { func.apply(undefined, args); }, wait);
    }

    /**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * provided it will be used to determine the cache key for storing the result
     * based on the arguments provided to the memoized function. By default, the
     * first argument provided to the memoized function is used as the cache key.
     * The `func` is executed with the `this` binding of the memoized function.
     * The result cache is exposed as the `cache` property on the memoized function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] A function used to resolve the cache key.
     * @returns {Function} Returns the new memoizing function.
     * @example
     *
     * var fibonacci = _.memoize(function(n) {
     *   return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
     * });
     *
     * fibonacci(9)
     * // => 34
     *
     * var data = {
     *   'fred': { 'name': 'fred', 'age': 40 },
     *   'pebbles': { 'name': 'pebbles', 'age': 1 }
     * };
     *
     * // modifying the result cache
     * var get = _.memoize(function(name) { return data[name]; }, _.identity);
     * get('pebbles');
     * // => { 'name': 'pebbles', 'age': 1 }
     *
     * get.cache.pebbles.name = 'penelope';
     * get('pebbles');
     * // => { 'name': 'penelope', 'age': 1 }
     */
    function memoize(func, resolver) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var memoized = function() {
        var cache = memoized.cache,
            key = resolver ? resolver.apply(this, arguments) : keyPrefix + arguments[0];

        return hasOwnProperty.call(cache, key)
          ? cache[key]
          : (cache[key] = func.apply(this, arguments));
      }
      memoized.cache = {};
      return memoized;
    }

    /**
     * Creates a function that is restricted to execute `func` once. Repeat calls to
     * the function will return the value of the first call. The `func` is executed
     * with the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var initialize = _.once(createApplication);
     * initialize();
     * initialize();
     * // `initialize` executes `createApplication` once
     */
    function once(func) {
      var ran,
          result;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      return function() {
        if (ran) {
          return result;
        }
        ran = true;
        result = func.apply(this, arguments);

        // clear the `func` variable so the function may be garbage collected
        func = null;
        return result;
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with any additional
     * `partial` arguments prepended to those provided to the new function. This
     * method is similar to `_.bind` except it does **not** alter the `this` binding.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var greet = function(greeting, name) { return greeting + ' ' + name; };
     * var hi = _.partial(greet, 'hi');
     * hi('fred');
     * // => 'hi fred'
     */
    function partial(func) {
      return createWrapper(func, 16, slice(arguments, 1));
    }

    /**
     * This method is like `_.partial` except that `partial` arguments are
     * appended to those provided to the new function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var defaultsDeep = _.partialRight(_.merge, _.defaults);
     *
     * var options = {
     *   'variable': 'data',
     *   'imports': { 'jq': $ }
     * };
     *
     * defaultsDeep(options, _.templateSettings);
     *
     * options.variable
     * // => 'data'
     *
     * options.imports
     * // => { '_': _, 'jq': $ }
     */
    function partialRight(func) {
      return createWrapper(func, 32, null, slice(arguments, 1));
    }

    /**
     * Creates a function that, when executed, will only call the `func` function
     * at most once per every `wait` milliseconds. Provide an options object to
     * indicate that `func` should be invoked on the leading and/or trailing edge
     * of the `wait` timeout. Subsequent calls to the throttled function will
     * return the result of the last `func` call.
     *
     * Note: If `leading` and `trailing` options are `true` `func` will be called
     * on the trailing edge of the timeout only if the the throttled function is
     * invoked more than once during the `wait` timeout.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to throttle.
     * @param {number} wait The number of milliseconds to throttle executions to.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.leading=true] Specify execution on the leading edge of the timeout.
     * @param {boolean} [options.trailing=true] Specify execution on the trailing edge of the timeout.
     * @returns {Function} Returns the new throttled function.
     * @example
     *
     * // avoid excessively updating the position while scrolling
     * var throttled = _.throttle(updatePosition, 100);
     * jQuery(window).on('scroll', throttled);
     *
     * // execute `renewToken` when the click event is fired, but not more than once every 5 minutes
     * jQuery('.interactive').on('click', _.throttle(renewToken, 300000, {
     *   'trailing': false
     * }));
     */
    function throttle(func, wait, options) {
      var leading = true,
          trailing = true;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      if (options === false) {
        leading = false;
      } else if (isObject(options)) {
        leading = 'leading' in options ? options.leading : leading;
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      debounceOptions.leading = leading;
      debounceOptions.maxWait = wait;
      debounceOptions.trailing = trailing;

      return debounce(func, wait, debounceOptions);
    }

    /**
     * Creates a function that provides `value` to the wrapper function as its
     * first argument. Additional arguments provided to the function are appended
     * to those provided to the wrapper function. The wrapper is executed with
     * the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {*} value The value to wrap.
     * @param {Function} wrapper The wrapper function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var p = _.wrap(_.escape, function(func, text) {
     *   return '<p>' + func(text) + '</p>';
     * });
     *
     * p('Fred, Wilma, & Pebbles');
     * // => '<p>Fred, Wilma, &amp; Pebbles</p>'
     */
    function wrap(value, wrapper) {
      return createWrapper(wrapper, 16, [value]);
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a function that returns `value`.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} value The value to return from the new function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var object = { 'name': 'fred' };
     * var getter = _.constant(object);
     * getter() === object;
     * // => true
     */
    function constant(value) {
      return function() {
        return value;
      };
    }

    /**
     * Produces a callback bound to an optional `thisArg`. If `func` is a property
     * name the created callback will return the property value for a given element.
     * If `func` is an object the created callback will return `true` for elements
     * that contain the equivalent object properties, otherwise it will return `false`.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} [func=identity] The value to convert to a callback.
     * @param {*} [thisArg] The `this` binding of the created callback.
     * @param {number} [argCount] The number of arguments the callback accepts.
     * @returns {Function} Returns a callback function.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // wrap to create custom callback shorthands
     * _.createCallback = _.wrap(_.createCallback, function(func, callback, thisArg) {
     *   var match = /^(.+?)__([gl]t)(.+)$/.exec(callback);
     *   return !match ? func(callback, thisArg) : function(object) {
     *     return match[2] == 'gt' ? object[match[1]] > match[3] : object[match[1]] < match[3];
     *   };
     * });
     *
     * _.filter(characters, 'age__gt38');
     * // => [{ 'name': 'fred', 'age': 40 }]
     */
    function createCallback(func, thisArg, argCount) {
      var type = typeof func;
      if (func == null || type == 'function') {
        return baseCreateCallback(func, thisArg, argCount);
      }
      // handle "_.pluck" style callback shorthands
      if (type != 'object') {
        return property(func);
      }
      var props = keys(func),
          key = props[0],
          a = func[key];

      // handle "_.where" style callback shorthands
      if (props.length == 1 && a === a && !isObject(a)) {
        // fast path the common case of providing an object with a single
        // property containing a primitive value
        return function(object) {
          var b = object[key];
          return a === b && (a !== 0 || (1 / a == 1 / b));
        };
      }
      return function(object) {
        var length = props.length,
            result = false;

        while (length--) {
          if (!(result = baseIsEqual(object[props[length]], func[props[length]], null, true))) {
            break;
          }
        }
        return result;
      };
    }

    /**
     * Converts the characters `&`, `<`, `>`, `"`, and `'` in `string` to their
     * corresponding HTML entities.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} string The string to escape.
     * @returns {string} Returns the escaped string.
     * @example
     *
     * _.escape('Fred, Wilma, & Pebbles');
     * // => 'Fred, Wilma, &amp; Pebbles'
     */
    function escape(string) {
      return string == null ? '' : String(string).replace(reUnescapedHtml, escapeHtmlChar);
    }

    /**
     * This method returns the first argument provided to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} value Any value.
     * @returns {*} Returns `value`.
     * @example
     *
     * var object = { 'name': 'fred' };
     * _.identity(object) === object;
     * // => true
     */
    function identity(value) {
      return value;
    }

    /**
     * Adds function properties of a source object to the destination object.
     * If `object` is a function methods will be added to its prototype as well.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Function|Object} [object=lodash] object The destination object.
     * @param {Object} source The object of functions to add.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.chain=true] Specify whether the functions added are chainable.
     * @example
     *
     * function capitalize(string) {
     *   return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
     * }
     *
     * _.mixin({ 'capitalize': capitalize });
     * _.capitalize('fred');
     * // => 'Fred'
     *
     * _('fred').capitalize().value();
     * // => 'Fred'
     *
     * _.mixin({ 'capitalize': capitalize }, { 'chain': false });
     * _('fred').capitalize();
     * // => 'Fred'
     */
    function mixin(object, source, options) {
      var chain = true,
          methodNames = source && functions(source);

      if (!source || (!options && !methodNames.length)) {
        if (options == null) {
          options = source;
        }
        ctor = lodashWrapper;
        source = object;
        object = lodash;
        methodNames = functions(source);
      }
      if (options === false) {
        chain = false;
      } else if (isObject(options) && 'chain' in options) {
        chain = options.chain;
      }
      var ctor = object,
          isFunc = isFunction(ctor);

      forEach(methodNames, function(methodName) {
        var func = object[methodName] = source[methodName];
        if (isFunc) {
          ctor.prototype[methodName] = function() {
            var chainAll = this.__chain__,
                value = this.__wrapped__,
                args = [value];

            push.apply(args, arguments);
            var result = func.apply(object, args);
            if (chain || chainAll) {
              if (value === result && isObject(result)) {
                return this;
              }
              result = new ctor(result);
              result.__chain__ = chainAll;
            }
            return result;
          };
        }
      });
    }

    /**
     * Reverts the '_' variable to its previous value and returns a reference to
     * the `lodash` function.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @returns {Function} Returns the `lodash` function.
     * @example
     *
     * var lodash = _.noConflict();
     */
    function noConflict() {
      context._ = oldDash;
      return this;
    }

    /**
     * A no-operation function.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @example
     *
     * var object = { 'name': 'fred' };
     * _.noop(object) === undefined;
     * // => true
     */
    function noop() {
      // no operation performed
    }

    /**
     * Gets the number of milliseconds that have elapsed since the Unix epoch
     * (1 January 1970 00:00:00 UTC).
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @example
     *
     * var stamp = _.now();
     * _.defer(function() { console.log(_.now() - stamp); });
     * // => logs the number of milliseconds it took for the deferred function to be called
     */
    var now = isNative(now = Date.now) && now || function() {
      return new Date().getTime();
    };

    /**
     * Converts the given value into an integer of the specified radix.
     * If `radix` is `undefined` or `0` a `radix` of `10` is used unless the
     * `value` is a hexadecimal, in which case a `radix` of `16` is used.
     *
     * Note: This method avoids differences in native ES3 and ES5 `parseInt`
     * implementations. See http://es5.github.io/#E.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} value The value to parse.
     * @param {number} [radix] The radix used to interpret the value to parse.
     * @returns {number} Returns the new integer value.
     * @example
     *
     * _.parseInt('08');
     * // => 8
     */
    var parseInt = nativeParseInt(whitespace + '08') == 8 ? nativeParseInt : function(value, radix) {
      // Firefox < 21 and Opera < 15 follow the ES3 specified implementation of `parseInt`
      return nativeParseInt(isString(value) ? value.replace(reLeadingSpacesAndZeros, '') : value, radix || 0);
    };

    /**
     * Creates a "_.pluck" style function, which returns the `key` value of a
     * given object.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} key The name of the property to retrieve.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var characters = [
     *   { 'name': 'fred',   'age': 40 },
     *   { 'name': 'barney', 'age': 36 }
     * ];
     *
     * var getName = _.property('name');
     *
     * _.map(characters, getName);
     * // => ['barney', 'fred']
     *
     * _.sortBy(characters, getName);
     * // => [{ 'name': 'barney', 'age': 36 }, { 'name': 'fred',   'age': 40 }]
     */
    function property(key) {
      return function(object) {
        return object[key];
      };
    }

    /**
     * Produces a random number between `min` and `max` (inclusive). If only one
     * argument is provided a number between `0` and the given number will be
     * returned. If `floating` is truey or either `min` or `max` are floats a
     * floating-point number will be returned instead of an integer.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {number} [min=0] The minimum possible value.
     * @param {number} [max=1] The maximum possible value.
     * @param {boolean} [floating=false] Specify returning a floating-point number.
     * @returns {number} Returns a random number.
     * @example
     *
     * _.random(0, 5);
     * // => an integer between 0 and 5
     *
     * _.random(5);
     * // => also an integer between 0 and 5
     *
     * _.random(5, true);
     * // => a floating-point number between 0 and 5
     *
     * _.random(1.2, 5.2);
     * // => a floating-point number between 1.2 and 5.2
     */
    function random(min, max, floating) {
      var noMin = min == null,
          noMax = max == null;

      if (floating == null) {
        if (typeof min == 'boolean' && noMax) {
          floating = min;
          min = 1;
        }
        else if (!noMax && typeof max == 'boolean') {
          floating = max;
          noMax = true;
        }
      }
      if (noMin && noMax) {
        max = 1;
      }
      min = +min || 0;
      if (noMax) {
        max = min;
        min = 0;
      } else {
        max = +max || 0;
      }
      if (floating || min % 1 || max % 1) {
        var rand = nativeRandom();
        return nativeMin(min + (rand * (max - min + parseFloat('1e-' + ((rand +'').length - 1)))), max);
      }
      return baseRandom(min, max);
    }

    /**
     * Resolves the value of property `key` on `object`. If `key` is a function
     * it will be invoked with the `this` binding of `object` and its result returned,
     * else the property value is returned. If `object` is falsey then `undefined`
     * is returned.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Object} object The object to inspect.
     * @param {string} key The name of the property to resolve.
     * @returns {*} Returns the resolved value.
     * @example
     *
     * var object = {
     *   'cheese': 'crumpets',
     *   'stuff': function() {
     *     return 'nonsense';
     *   }
     * };
     *
     * _.result(object, 'cheese');
     * // => 'crumpets'
     *
     * _.result(object, 'stuff');
     * // => 'nonsense'
     */
    function result(object, key) {
      if (object) {
        var value = object[key];
        return isFunction(value) ? object[key]() : value;
      }
    }

    /**
     * A micro-templating method that handles arbitrary delimiters, preserves
     * whitespace, and correctly escapes quotes within interpolated code.
     *
     * Note: In the development build, `_.template` utilizes sourceURLs for easier
     * debugging. See http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
     *
     * For more information on precompiling templates see:
     * http://lodash.com/custom-builds
     *
     * For more information on Chrome extension sandboxes see:
     * http://developer.chrome.com/stable/extensions/sandboxingEval.html
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} text The template text.
     * @param {Object} data The data object used to populate the text.
     * @param {Object} [options] The options object.
     * @param {RegExp} [options.escape] The "escape" delimiter.
     * @param {RegExp} [options.evaluate] The "evaluate" delimiter.
     * @param {Object} [options.imports] An object to import into the template as local variables.
     * @param {RegExp} [options.interpolate] The "interpolate" delimiter.
     * @param {string} [sourceURL] The sourceURL of the template's compiled source.
     * @param {string} [variable] The data object variable name.
     * @returns {Function|string} Returns a compiled function when no `data` object
     *  is given, else it returns the interpolated text.
     * @example
     *
     * // using the "interpolate" delimiter to create a compiled template
     * var compiled = _.template('hello <%= name %>');
     * compiled({ 'name': 'fred' });
     * // => 'hello fred'
     *
     * // using the "escape" delimiter to escape HTML in data property values
     * _.template('<b><%- value %></b>', { 'value': '<script>' });
     * // => '<b>&lt;script&gt;</b>'
     *
     * // using the "evaluate" delimiter to generate HTML
     * var list = '<% _.forEach(people, function(name) { %><li><%- name %></li><% }); %>';
     * _.template(list, { 'people': ['fred', 'barney'] });
     * // => '<li>fred</li><li>barney</li>'
     *
     * // using the ES6 delimiter as an alternative to the default "interpolate" delimiter
     * _.template('hello ${ name }', { 'name': 'pebbles' });
     * // => 'hello pebbles'
     *
     * // using the internal `print` function in "evaluate" delimiters
     * _.template('<% print("hello " + name); %>!', { 'name': 'barney' });
     * // => 'hello barney!'
     *
     * // using a custom template delimiters
     * _.templateSettings = {
     *   'interpolate': /{{([\s\S]+?)}}/g
     * };
     *
     * _.template('hello {{ name }}!', { 'name': 'mustache' });
     * // => 'hello mustache!'
     *
     * // using the `imports` option to import jQuery
     * var list = '<% jq.each(people, function(name) { %><li><%- name %></li><% }); %>';
     * _.template(list, { 'people': ['fred', 'barney'] }, { 'imports': { 'jq': jQuery } });
     * // => '<li>fred</li><li>barney</li>'
     *
     * // using the `sourceURL` option to specify a custom sourceURL for the template
     * var compiled = _.template('hello <%= name %>', null, { 'sourceURL': '/basic/greeting.jst' });
     * compiled(data);
     * // => find the source of "greeting.jst" under the Sources tab or Resources panel of the web inspector
     *
     * // using the `variable` option to ensure a with-statement isn't used in the compiled template
     * var compiled = _.template('hi <%= data.name %>!', null, { 'variable': 'data' });
     * compiled.source;
     * // => function(data) {
     *   var __t, __p = '', __e = _.escape;
     *   __p += 'hi ' + ((__t = ( data.name )) == null ? '' : __t) + '!';
     *   return __p;
     * }
     *
     * // using the `source` property to inline compiled templates for meaningful
     * // line numbers in error messages and a stack trace
     * fs.writeFileSync(path.join(cwd, 'jst.js'), '\
     *   var JST = {\
     *     "main": ' + _.template(mainText).source + '\
     *   };\
     * ');
     */
    function template(text, data, options) {
      // based on John Resig's `tmpl` implementation
      // http://ejohn.org/blog/javascript-micro-templating/
      // and Laura Doktorova's doT.js
      // https://github.com/olado/doT
      var settings = lodash.templateSettings;
      text = String(text || '');

      // avoid missing dependencies when `iteratorTemplate` is not defined
      options = defaults({}, options, settings);

      var imports = defaults({}, options.imports, settings.imports),
          importsKeys = keys(imports),
          importsValues = values(imports);

      var isEvaluating,
          index = 0,
          interpolate = options.interpolate || reNoMatch,
          source = "__p += '";

      // compile the regexp to match each delimiter
      var reDelimiters = RegExp(
        (options.escape || reNoMatch).source + '|' +
        interpolate.source + '|' +
        (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + '|' +
        (options.evaluate || reNoMatch).source + '|$'
      , 'g');

      text.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
        interpolateValue || (interpolateValue = esTemplateValue);

        // escape characters that cannot be included in string literals
        source += text.slice(index, offset).replace(reUnescapedString, escapeStringChar);

        // replace delimiters with snippets
        if (escapeValue) {
          source += "' +\n__e(" + escapeValue + ") +\n'";
        }
        if (evaluateValue) {
          isEvaluating = true;
          source += "';\n" + evaluateValue + ";\n__p += '";
        }
        if (interpolateValue) {
          source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
        }
        index = offset + match.length;

        // the JS engine embedded in Adobe products requires returning the `match`
        // string in order to produce the correct `offset` value
        return match;
      });

      source += "';\n";

      // if `variable` is not specified, wrap a with-statement around the generated
      // code to add the data object to the top of the scope chain
      var variable = options.variable,
          hasVariable = variable;

      if (!hasVariable) {
        variable = 'obj';
        source = 'with (' + variable + ') {\n' + source + '\n}\n';
      }
      // cleanup code by stripping empty strings
      source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source)
        .replace(reEmptyStringMiddle, '$1')
        .replace(reEmptyStringTrailing, '$1;');

      // frame code as the function body
      source = 'function(' + variable + ') {\n' +
        (hasVariable ? '' : variable + ' || (' + variable + ' = {});\n') +
        "var __t, __p = '', __e = _.escape" +
        (isEvaluating
          ? ', __j = Array.prototype.join;\n' +
            "function print() { __p += __j.call(arguments, '') }\n"
          : ';\n'
        ) +
        source +
        'return __p\n}';

      // Use a sourceURL for easier debugging.
      // http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
      var sourceURL = '\n/*\n//# sourceURL=' + (options.sourceURL || '/lodash/template/source[' + (templateCounter++) + ']') + '\n*/';

      try {
        var result = Function(importsKeys, 'return ' + source + sourceURL).apply(undefined, importsValues);
      } catch(e) {
        e.source = source;
        throw e;
      }
      if (data) {
        return result(data);
      }
      // provide the compiled function's source by its `toString` method, in
      // supported environments, or the `source` property as a convenience for
      // inlining compiled templates during the build process
      result.source = source;
      return result;
    }

    /**
     * Executes the callback `n` times, returning an array of the results
     * of each callback execution. The callback is bound to `thisArg` and invoked
     * with one argument; (index).
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {number} n The number of times to execute the callback.
     * @param {Function} callback The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns an array of the results of each `callback` execution.
     * @example
     *
     * var diceRolls = _.times(3, _.partial(_.random, 1, 6));
     * // => [3, 6, 4]
     *
     * _.times(3, function(n) { mage.castSpell(n); });
     * // => calls `mage.castSpell(n)` three times, passing `n` of `0`, `1`, and `2` respectively
     *
     * _.times(3, function(n) { this.cast(n); }, mage);
     * // => also calls `mage.castSpell(n)` three times
     */
    function times(n, callback, thisArg) {
      n = (n = +n) > -1 ? n : 0;
      var index = -1,
          result = Array(n);

      callback = baseCreateCallback(callback, thisArg, 1);
      while (++index < n) {
        result[index] = callback(index);
      }
      return result;
    }

    /**
     * The inverse of `_.escape` this method converts the HTML entities
     * `&amp;`, `&lt;`, `&gt;`, `&quot;`, and `&#39;` in `string` to their
     * corresponding characters.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} string The string to unescape.
     * @returns {string} Returns the unescaped string.
     * @example
     *
     * _.unescape('Fred, Barney &amp; Pebbles');
     * // => 'Fred, Barney & Pebbles'
     */
    function unescape(string) {
      return string == null ? '' : String(string).replace(reEscapedHtml, unescapeHtmlChar);
    }

    /**
     * Generates a unique ID. If `prefix` is provided the ID will be appended to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} [prefix] The value to prefix the ID with.
     * @returns {string} Returns the unique ID.
     * @example
     *
     * _.uniqueId('contact_');
     * // => 'contact_104'
     *
     * _.uniqueId();
     * // => '105'
     */
    function uniqueId(prefix) {
      var id = ++idCounter;
      return String(prefix == null ? '' : prefix) + id;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object that wraps the given value with explicit
     * method chaining enabled.
     *
     * @static
     * @memberOf _
     * @category Chaining
     * @param {*} value The value to wrap.
     * @returns {Object} Returns the wrapper object.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36 },
     *   { 'name': 'fred',    'age': 40 },
     *   { 'name': 'pebbles', 'age': 1 }
     * ];
     *
     * var youngest = _.chain(characters)
     *     .sortBy('age')
     *     .map(function(chr) { return chr.name + ' is ' + chr.age; })
     *     .first()
     *     .value();
     * // => 'pebbles is 1'
     */
    function chain(value) {
      value = new lodashWrapper(value);
      value.__chain__ = true;
      return value;
    }

    /**
     * Invokes `interceptor` with the `value` as the first argument and then
     * returns `value`. The purpose of this method is to "tap into" a method
     * chain in order to perform operations on intermediate results within
     * the chain.
     *
     * @static
     * @memberOf _
     * @category Chaining
     * @param {*} value The value to provide to `interceptor`.
     * @param {Function} interceptor The function to invoke.
     * @returns {*} Returns `value`.
     * @example
     *
     * _([1, 2, 3, 4])
     *  .tap(function(array) { array.pop(); })
     *  .reverse()
     *  .value();
     * // => [3, 2, 1]
     */
    function tap(value, interceptor) {
      interceptor(value);
      return value;
    }

    /**
     * Enables explicit method chaining on the wrapper object.
     *
     * @name chain
     * @memberOf _
     * @category Chaining
     * @returns {*} Returns the wrapper object.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // without explicit chaining
     * _(characters).first();
     * // => { 'name': 'barney', 'age': 36 }
     *
     * // with explicit chaining
     * _(characters).chain()
     *   .first()
     *   .pick('age')
     *   .value();
     * // => { 'age': 36 }
     */
    function wrapperChain() {
      this.__chain__ = true;
      return this;
    }

    /**
     * Produces the `toString` result of the wrapped value.
     *
     * @name toString
     * @memberOf _
     * @category Chaining
     * @returns {string} Returns the string result.
     * @example
     *
     * _([1, 2, 3]).toString();
     * // => '1,2,3'
     */
    function wrapperToString() {
      return String(this.__wrapped__);
    }

    /**
     * Extracts the wrapped value.
     *
     * @name valueOf
     * @memberOf _
     * @alias value
     * @category Chaining
     * @returns {*} Returns the wrapped value.
     * @example
     *
     * _([1, 2, 3]).valueOf();
     * // => [1, 2, 3]
     */
    function wrapperValueOf() {
      return this.__wrapped__;
    }

    /*--------------------------------------------------------------------------*/

    // add functions that return wrapped values when chaining
    lodash.after = after;
    lodash.assign = assign;
    lodash.at = at;
    lodash.bind = bind;
    lodash.bindAll = bindAll;
    lodash.bindKey = bindKey;
    lodash.chain = chain;
    lodash.compact = compact;
    lodash.compose = compose;
    lodash.constant = constant;
    lodash.countBy = countBy;
    lodash.create = create;
    lodash.createCallback = createCallback;
    lodash.curry = curry;
    lodash.debounce = debounce;
    lodash.defaults = defaults;
    lodash.defer = defer;
    lodash.delay = delay;
    lodash.difference = difference;
    lodash.filter = filter;
    lodash.flatten = flatten;
    lodash.forEach = forEach;
    lodash.forEachRight = forEachRight;
    lodash.forIn = forIn;
    lodash.forInRight = forInRight;
    lodash.forOwn = forOwn;
    lodash.forOwnRight = forOwnRight;
    lodash.functions = functions;
    lodash.groupBy = groupBy;
    lodash.indexBy = indexBy;
    lodash.initial = initial;
    lodash.intersection = intersection;
    lodash.invert = invert;
    lodash.invoke = invoke;
    lodash.keys = keys;
    lodash.map = map;
    lodash.mapValues = mapValues;
    lodash.max = max;
    lodash.memoize = memoize;
    lodash.merge = merge;
    lodash.min = min;
    lodash.omit = omit;
    lodash.once = once;
    lodash.pairs = pairs;
    lodash.partial = partial;
    lodash.partialRight = partialRight;
    lodash.pick = pick;
    lodash.pluck = pluck;
    lodash.property = property;
    lodash.pull = pull;
    lodash.range = range;
    lodash.reject = reject;
    lodash.remove = remove;
    lodash.rest = rest;
    lodash.shuffle = shuffle;
    lodash.sortBy = sortBy;
    lodash.tap = tap;
    lodash.throttle = throttle;
    lodash.times = times;
    lodash.toArray = toArray;
    lodash.transform = transform;
    lodash.union = union;
    lodash.uniq = uniq;
    lodash.values = values;
    lodash.where = where;
    lodash.without = without;
    lodash.wrap = wrap;
    lodash.xor = xor;
    lodash.zip = zip;
    lodash.zipObject = zipObject;

    // add aliases
    lodash.collect = map;
    lodash.drop = rest;
    lodash.each = forEach;
    lodash.eachRight = forEachRight;
    lodash.extend = assign;
    lodash.methods = functions;
    lodash.object = zipObject;
    lodash.select = filter;
    lodash.tail = rest;
    lodash.unique = uniq;
    lodash.unzip = zip;

    // add functions to `lodash.prototype`
    mixin(lodash);

    /*--------------------------------------------------------------------------*/

    // add functions that return unwrapped values when chaining
    lodash.clone = clone;
    lodash.cloneDeep = cloneDeep;
    lodash.contains = contains;
    lodash.escape = escape;
    lodash.every = every;
    lodash.find = find;
    lodash.findIndex = findIndex;
    lodash.findKey = findKey;
    lodash.findLast = findLast;
    lodash.findLastIndex = findLastIndex;
    lodash.findLastKey = findLastKey;
    lodash.has = has;
    lodash.identity = identity;
    lodash.indexOf = indexOf;
    lodash.isArguments = isArguments;
    lodash.isArray = isArray;
    lodash.isBoolean = isBoolean;
    lodash.isDate = isDate;
    lodash.isElement = isElement;
    lodash.isEmpty = isEmpty;
    lodash.isEqual = isEqual;
    lodash.isFinite = isFinite;
    lodash.isFunction = isFunction;
    lodash.isNaN = isNaN;
    lodash.isNull = isNull;
    lodash.isNumber = isNumber;
    lodash.isObject = isObject;
    lodash.isPlainObject = isPlainObject;
    lodash.isRegExp = isRegExp;
    lodash.isString = isString;
    lodash.isUndefined = isUndefined;
    lodash.lastIndexOf = lastIndexOf;
    lodash.mixin = mixin;
    lodash.noConflict = noConflict;
    lodash.noop = noop;
    lodash.now = now;
    lodash.parseInt = parseInt;
    lodash.random = random;
    lodash.reduce = reduce;
    lodash.reduceRight = reduceRight;
    lodash.result = result;
    lodash.runInContext = runInContext;
    lodash.size = size;
    lodash.some = some;
    lodash.sortedIndex = sortedIndex;
    lodash.template = template;
    lodash.unescape = unescape;
    lodash.uniqueId = uniqueId;

    // add aliases
    lodash.all = every;
    lodash.any = some;
    lodash.detect = find;
    lodash.findWhere = find;
    lodash.foldl = reduce;
    lodash.foldr = reduceRight;
    lodash.include = contains;
    lodash.inject = reduce;

    mixin(function() {
      var source = {}
      forOwn(lodash, function(func, methodName) {
        if (!lodash.prototype[methodName]) {
          source[methodName] = func;
        }
      });
      return source;
    }(), false);

    /*--------------------------------------------------------------------------*/

    // add functions capable of returning wrapped and unwrapped values when chaining
    lodash.first = first;
    lodash.last = last;
    lodash.sample = sample;

    // add aliases
    lodash.take = first;
    lodash.head = first;

    forOwn(lodash, function(func, methodName) {
      var callbackable = methodName !== 'sample';
      if (!lodash.prototype[methodName]) {
        lodash.prototype[methodName]= function(n, guard) {
          var chainAll = this.__chain__,
              result = func(this.__wrapped__, n, guard);

          return !chainAll && (n == null || (guard && !(callbackable && typeof n == 'function')))
            ? result
            : new lodashWrapper(result, chainAll);
        };
      }
    });

    /*--------------------------------------------------------------------------*/

    /**
     * The semantic version number.
     *
     * @static
     * @memberOf _
     * @type string
     */
    lodash.VERSION = '2.4.1';

    // add "Chaining" functions to the wrapper
    lodash.prototype.chain = wrapperChain;
    lodash.prototype.toString = wrapperToString;
    lodash.prototype.value = wrapperValueOf;
    lodash.prototype.valueOf = wrapperValueOf;

    // add `Array` functions that return unwrapped values
    forEach(['join', 'pop', 'shift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        var chainAll = this.__chain__,
            result = func.apply(this.__wrapped__, arguments);

        return chainAll
          ? new lodashWrapper(result, chainAll)
          : result;
      };
    });

    // add `Array` functions that return the existing wrapped value
    forEach(['push', 'reverse', 'sort', 'unshift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        func.apply(this.__wrapped__, arguments);
        return this;
      };
    });

    // add `Array` functions that return new wrapped values
    forEach(['concat', 'slice', 'splice'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        return new lodashWrapper(func.apply(this.__wrapped__, arguments), this.__chain__);
      };
    });

    return lodash;
  }

  /*--------------------------------------------------------------------------*/

  // expose Lo-Dash
  var _ = runInContext();

  // some AMD build optimizers like r.js check for condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose Lo-Dash to the global object even when an AMD loader is present in
    // case Lo-Dash is loaded with a RequireJS shim config.
    // See http://requirejs.org/docs/api.html#config-shim
    root._ = _;

    // define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module
    define(function() {
      return _;
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports && freeModule) {
    // in Node.js or RingoJS
    if (moduleExports) {
      (freeModule.exports = _)._ = _;
    }
    // in Narwhal or Rhino -require
    else {
      freeExports._ = _;
    }
  }
  else {
    // in a browser or Rhino
    root._ = _;
  }
}.call(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],46:[function(require,module,exports){
module.exports = function (str) {
    return String(str).replace(/(\W)/g, '\\$1');
};

},{}],47:[function(require,module,exports){
module.exports = v;
v.Vec3 = Vec3;

var re = /\((-?[.\d]+), (-?[.\d]+), (-?[.\d]+)\)/;

function Vec3(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
}

function v(x, y, z) {
  if (x == null) {
    return new Vec3(0, 0, 0);
  } else if (Array.isArray(x)) {
    return new Vec3(parseFloat(x[0], 10), parseFloat(x[1], 10), parseFloat(x[2], 10));
  } else if (typeof x === 'object') {
    return new Vec3(parseFloat(x.x, 10), parseFloat(x.y, 10), parseFloat(x.z, 10));
  } else if (typeof x === 'string' && y == null) {
    var match = x.match(re);
    if (match) {
      return new Vec3(
          parseFloat(match[1], 10),
          parseFloat(match[2], 10),
          parseFloat(match[3], 10));
    } else {
      throw new Error("vec3: cannot parse: " + x);
    }
  } else {
    return new Vec3(parseFloat(x, 10), parseFloat(y, 10), parseFloat(z, 10));
  }
}

Vec3.prototype.set = function(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
  return this;
};

Vec3.prototype.update = function(other) {
  this.x = other.x;
  this.y = other.y;
  this.z = other.z;
  return this;
};

Vec3.prototype.floored = function() {
  return new Vec3(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z));
};

Vec3.prototype.floor = function() {
  this.x = Math.floor(this.x);
  this.y = Math.floor(this.y);
  this.z = Math.floor(this.z);
  return this;
};

Vec3.prototype.offset = function(dx, dy, dz) {
  return new Vec3(this.x + dx, this.y + dy, this.z + dz);
};
Vec3.prototype.translate = function(dx, dy, dz) {
  this.x += dx;
  this.y += dy;
  this.z += dz;
  return this;
};
Vec3.prototype.add = function(other) {
  this.x += other.x;
  this.y += other.y;
  this.z += other.z;
  return this;
};
Vec3.prototype.subtract = function(other) {
  this.x -= other.x;
  this.y -= other.y;
  this.z -= other.z;
  return this;
};
Vec3.prototype.plus = function(other) {
  return this.offset(other.x, other.y, other.z);
};
Vec3.prototype.minus = function(other) {
  return this.offset(-other.x, -other.y, -other.z);
};
Vec3.prototype.scaled = function(scalar) {
  return new Vec3(this.x * scalar, this.y * scalar, this.z * scalar);
};
Vec3.prototype.abs = function() {
  return new Vec3(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
};
Vec3.prototype.volume = function() {
  return this.x * this.y * this.z;
};
Vec3.prototype.modulus = function(other) {
  return new Vec3(
    euclideanMod(this.x, other.x),
    euclideanMod(this.y, other.y),
    euclideanMod(this.z, other.z));
};
Vec3.prototype.distanceTo = function(other) {
  var dx = other.x - this.x;
  var dy = other.y - this.y;
  var dz = other.z - this.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};
Vec3.prototype.equals = function(other) {
  return this.x === other.x && this.y === other.y && this.z === other.z;
};
Vec3.prototype.toString = function() {
  return "(" + this.x + ", " + this.y + ", " + this.z + ")";
};
Vec3.prototype.clone = function() {
  return this.offset(0, 0, 0);
};
Vec3.prototype.min = function(other) {
  return new Vec3(Math.min(this.x, other.x), Math.min(this.y, other.y), Math.min(this.z, other.z));
};
Vec3.prototype.max = function(other) {
  return new Vec3(Math.max(this.x, other.x), Math.max(this.y, other.y), Math.max(this.z, other.z));
};

function euclideanMod(numerator, denominator) {
  var result = numerator % denominator;
  return result < 0 ? result + denominator : result;
}

},{}],48:[function(require,module,exports){
'use strict';

var colormc2html = {
  black: 'black',
  dark_blue: '#0000b2',
  dark_green: '#14ab00',
  dark_aqua: '#13aaab',
  dark_red: '#a90400',
  dark_purple: '#a900b2',
  gold: '#feac00',
  gray: 'gray',
  dark_gray: '#555555',
  blue: '#544cff',
  green: '#5cff00',
  aqua: '#5bffff',
  red: '#fd5650',
  light_purple: '#fd4dff',
  yellow: 'yellow',
  white: 'white'
};

var translations = {
  'chat.type.text': '<%s> %s',
  'chat.type.emote': '* %s %s',
  'chat.type.announcement': '[%s] %s',
  'chat.type.admin': '[%s: %s]',
  'chat.stream.text': '(%s) <%s> %s',
  'chat.stream.emote': '(%s) * %s %s'
};

var isTrue = function(x) {
  if (x === undefined) return false;
  if (x === 'false') return false;
  return true;
};

var parseRaw = function(raw, opts) {
  var json;

  opts = opts || {};

  if (typeof raw === 'string') {
    try {
      json = JSON.parse(raw);
    } catch (error) {
      console.log(raw);
      return document.createTextNode('Invalid JSON: ' + error);
    }
  } else {
    json = raw;
  }

  var parseObject = function(element) {
    if (typeof element === 'string') {
      return document.createTextNode(element);
    }

    var node = document.createElement('span');

    if ('color' in element) node.style.color = colormc2html[element.color];
    if (isTrue(element.bold)) node.style.fontWeight = 'bold';
    if (isTrue(element.italic)) node.style.fontStyle = 'italic';
    if (isTrue(element.underlined) || isTrue(element.strikethrough))
      node.style.textDecoration = 
        (isTrue(element.underlined) ? 'underline ' : '') + 
        (isTrue(element.strikethrough) ? 'line-through' : '');

    if ('clickEvent' in element) {
      if (opts.click) {
        node.addEventListener('click', function(ev) {
          opts.click(element, element.clickEvent, ev);
        });
      }
    }

    if ('hoverEvent' in element) {
      if (opts.hover) {
        node.addEventListener('mouseover', function(ev) {
          opts.hover(element, element.hoverEvent, ev);
        });
      }

      if (opts.hoverOut) {
        node.addEventListener('mouseout', function(ev) {
          opts.hoverOut(element, element.hoverEvent, ev);
        });
      }
    }

    if ('text' in element) node.textContent = element.text;
    if ('translate' in element) {
      var translate = translations[element.translate] || element.translate;
      var translateTexts = translate.split('%s');

      (element['with'] || []).forEach(function(x, i) {
        node.appendChild(document.createTextNode(translateTexts[i] || ' '));
        node.appendChild(parseObject(x));
      });

      if (!/%s$/.test(translateTexts))
        node.appendChild(document.createTextNode(translateTexts.splice(-1)[0]));
    }

    if ('extra' in element) {
      element.extra.forEach(function(x) {
        node.appendChild(parseObject(x));
      });
    }

    return node;
  };

  return parseObject(json);

  // references:
  // http://ezekielelin.com/minecraft/tellraw/
  // https://github.com/deathcap/node-minecraft-protocol/blob/986cf0af918768e98ec6b95a9dfcab46f5204e5e/examples/client_chat.js#L116
}
module.exports = parseRaw;



},{}],49:[function(require,module,exports){
(function (process,Buffer){
var stream = require('readable-stream')
var eos = require('end-of-stream')
var util = require('util')

var SIGNAL_FLUSH = new Buffer([0])

var onuncork = function(self, fn) {
  if (self._corked) self.once('uncork', fn)
  else fn()
}

var destroyer = function(self, end) {
  return function(err) {
    if (err) self.destroy(err.message === 'premature close' ? null : err)
    else if (end && !self._ended) self.end()
  }
}

var end = function(ws, fn) {
  if (!ws) return fn()
  if (ws._writableState && ws._writableState.finished) return fn()
  if (ws._writableState) return ws.end(fn)
  ws.end()
  fn()
}

var toStreams2 = function(rs) {
  return new (stream.Readable)({objectMode:true, highWaterMark:16}).wrap(rs)
}

var Duplexify = function(writable, readable, opts) {
  if (!(this instanceof Duplexify)) return new Duplexify(writable, readable, opts)
  stream.Duplex.call(this, opts)

  this._writable = null
  this._readable = null
  this._readable2 = null

  this._forwardDestroy = !opts || opts.destroy !== false
  this._corked = 1 // start corked
  this._ondrain = null
  this._drained = false
  this._forwarding = false
  this._unwrite = null
  this._unread = null
  this._ended = false

  this.destroyed = false

  if (writable) this.setWritable(writable)
  if (readable) this.setReadable(readable)
}

util.inherits(Duplexify, stream.Duplex)

Duplexify.obj = function(writable, readable, opts) {
  if (!opts) opts = {}
  opts.objectMode = true
  opts.highWaterMark = 16
  return new Duplexify(writable, readable, opts)
}

Duplexify.prototype.cork = function() {
  if (++this._corked === 1) this.emit('cork')
}

Duplexify.prototype.uncork = function() {
  if (this._corked && --this._corked === 0) this.emit('uncork')
}

Duplexify.prototype.setWritable = function(writable) {
  if (this._unwrite) this._unwrite()

  if (this.destroyed) {
    if (writable && writable.destroy) writable.destroy()
    return
  }

  if (writable === null || writable === false) {
    this.end()
    return
  }

  var self = this
  var unend = eos(writable, {writable:true, readable:false}, destroyer(this, true))

  var ondrain = function() {
    var ondrain = self._ondrain
    self._ondrain = null
    if (ondrain) ondrain()
  }

  var clear = function() {
    self._writable.removeListener('drain', ondrain)
    unend()
  }

  if (this._unwrite) process.nextTick(ondrain) // force a drain on stream reset to avoid livelocks

  this._writable = writable
  this._writable.on('drain', ondrain)
  this._unwrite = clear

  this.uncork() // always uncork setWritable
}

Duplexify.prototype.setReadable = function(readable) {
  if (this._unread) this._unread()

  if (this.destroyed) {
    if (readable && readable.destroy) readable.destroy()
    return
  }

  if (readable === null || readable === false) {
    this.push(null)
    this.resume()
    return
  }

  var self = this
  var unend = eos(readable, {writable:false, readable:true}, destroyer(this))

  var onreadable = function() {
    self._forward()
  }

  var onend = function() {
    self.push(null)
  }

  var clear = function() {
    self._readable2.removeListener('readable', onreadable)
    self._readable2.removeListener('end', onend)
    unend()
  }

  this._drained = true
  this._readable = readable
  this._readable2 = readable._readableState ? readable : toStreams2(readable)
  this._readable2.on('readable', onreadable)
  this._readable2.on('end', onend)
  this._unread = clear

  this._forward()
}

Duplexify.prototype._read = function() {
  this._drained = true
  this._forward()
}

Duplexify.prototype._forward = function() {
  if (this._forwarding || !this._readable2 || !this._drained) return
  this._forwarding = true

  var data
  while ((data = this._readable2.read()) !== null) {
    this._drained = this.push(data)
  }

  this._forwarding = false
}

Duplexify.prototype.destroy = function(err) {
  if (this.destroyed) return
  this.destroyed = true

  var self = this
  process.nextTick(function() {
    self._destroy(err)
  })
}

Duplexify.prototype._destroy = function(err) {
  if (err) {
    var ondrain = this._ondrain
    this._ondrain = null
    if (ondrain) ondrain(err)
    else this.emit('error', err)
  }

  if (this._forwardDestroy) {
    if (this._readable && this._readable.destroy) this._readable.destroy()
    if (this._writable && this._writable.destroy) this._writable.destroy()
  }

  this.emit('close')
}

Duplexify.prototype._write = function(data, enc, cb) {
  if (this.destroyed) return cb()
  if (this._corked) return onuncork(this, this._write.bind(this, data, enc, cb))
  if (data === SIGNAL_FLUSH) return this._finish(cb)
  if (!this._writable) return cb()

  if (this._writable.write(data) === false) this._ondrain = cb
  else cb()
}


Duplexify.prototype._finish = function(cb) {
  var self = this
  this.emit('preend')
  onuncork(this, function() {
    end(self._writable, function() {
      self.emit('prefinish')
      onuncork(self, cb)
    })
  })
}

Duplexify.prototype.end = function(data, enc, cb) {
  if (typeof data === 'function') return this.end(null, null, data)
  if (typeof enc === 'function') return this.end(data, null, enc)
  this._ended = true
  if (data) this.write(data)
  if (!this._writableState.ending) this.write(SIGNAL_FLUSH)
  return stream.Writable.prototype.end.call(this, cb)
}

module.exports = Duplexify
}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":98,"buffer":90,"end-of-stream":50,"readable-stream":61,"util":113}],50:[function(require,module,exports){
var once = require('once');

var noop = function() {};

var isRequest = function(stream) {
	return stream.setHeader && typeof stream.abort === 'function';
};

var eos = function(stream, opts, callback) {
	if (typeof opts === 'function') return eos(stream, null, opts);
	if (!opts) opts = {};

	callback = once(callback || noop);

	var ws = stream._writableState;
	var rs = stream._readableState;
	var readable = opts.readable || (opts.readable !== false && stream.readable);
	var writable = opts.writable || (opts.writable !== false && stream.writable);

	var onlegacyfinish = function() {
		if (!stream.writable) onfinish();
	};

	var onfinish = function() {
		writable = false;
		if (!readable) callback();
	};

	var onend = function() {
		readable = false;
		if (!writable) callback();
	};

	var onclose = function() {
		if (readable && !(rs && rs.ended)) return callback(new Error('premature close'));
		if (writable && !(ws && ws.ended)) return callback(new Error('premature close'));
	};

	var onrequest = function() {
		stream.req.on('finish', onfinish);
	};

	if (isRequest(stream)) {
		stream.on('complete', onfinish);
		stream.on('abort', onclose);
		if (stream.req) onrequest();
		else stream.on('request', onrequest);
	} else if (writable && !ws) { // legacy streams
		stream.on('end', onlegacyfinish);
		stream.on('close', onlegacyfinish);
	}

	stream.on('end', onend);
	stream.on('finish', onfinish);
	if (opts.error !== false) stream.on('error', callback);
	stream.on('close', onclose);

	return function() {
		stream.removeListener('complete', onfinish);
		stream.removeListener('abort', onclose);
		stream.removeListener('request', onrequest);
		if (stream.req) stream.req.removeListener('finish', onfinish);
		stream.removeListener('end', onlegacyfinish);
		stream.removeListener('close', onlegacyfinish);
		stream.removeListener('finish', onfinish);
		stream.removeListener('end', onend);
		stream.removeListener('error', callback);
		stream.removeListener('close', onclose);
	};
};

module.exports = eos;
},{"once":52}],51:[function(require,module,exports){
// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}

},{}],52:[function(require,module,exports){
var wrappy = require('wrappy')
module.exports = wrappy(once)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

},{"wrappy":51}],53:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

forEach(objectKeys(Writable.prototype), function(method) {
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
});

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(this.end.bind(this));
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

}).call(this,require('_process'))
},{"./_stream_readable":55,"./_stream_writable":57,"_process":98,"core-util-is":58,"inherits":62}],54:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./_stream_transform":56,"core-util-is":58,"inherits":62}],55:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

var Stream = require('stream');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var StringDecoder;

util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = false;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // In streams that never have any data, and do push(null) right away,
  // the consumer can miss the 'end' event if they do some I/O before
  // consuming the stream.  So, we don't emit('end') until some reading
  // happens.
  this.calledRead = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (typeof chunk === 'string' && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null || chunk === undefined) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      // update the buffer info.
      state.length += state.objectMode ? 1 : chunk.length;
      if (addToFront) {
        state.buffer.unshift(chunk);
      } else {
        state.reading = false;
        state.buffer.push(chunk);
      }

      if (state.needReadable)
        emitReadable(stream);

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (n === null || isNaN(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  var state = this._readableState;
  state.calledRead = true;
  var nOrig = n;
  var ret;

  if (typeof n !== 'number' || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    ret = null;

    // In cases where the decoder did not receive enough data
    // to produce a full chunk, then immediately received an
    // EOF, state.buffer will contain [<Buffer >, <Buffer 00 ...>].
    // howMuchToRead will see this and coerce the amount to
    // read to zero (because it's looking at the length of the
    // first <Buffer > in state.buffer), and we'll end up here.
    //
    // This can only happen via state.decoder -- no other venue
    // exists for pushing a zero-length chunk into state.buffer
    // and triggering this behavior. In this case, we return our
    // remaining data and end the stream, if appropriate.
    if (state.length > 0 && state.decoder) {
      ret = fromList(n, state);
      state.length -= ret.length;
    }

    if (state.length === 0)
      endReadable(this);

    return ret;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;

  // if we currently have less than the highWaterMark, then also read some
  if (state.length - n <= state.highWaterMark)
    doRead = true;

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading)
    doRead = false;

  if (doRead) {
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read called its callback synchronously, then `reading`
  // will be false, and we need to re-evaluate how much data we
  // can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we happened to read() exactly the remaining amount in the
  // buffer, and the EOF has been seen at this point, then make sure
  // that we emit 'end' on the very next tick.
  if (state.ended && !state.endEmitted && state.length === 0)
    endReadable(this);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // if we've ended and we have some data left, then emit
  // 'readable' now to make sure it gets picked up.
  if (state.length > 0)
    emitReadable(stream);
  else
    endReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (state.emittedReadable)
    return;

  state.emittedReadable = true;
  if (state.sync)
    process.nextTick(function() {
      emitReadable_(stream);
    });
  else
    emitReadable_(stream);
}

function emitReadable_(stream) {
  stream.emit('readable');
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    process.nextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    if (readable !== src) return;
    cleanup();
  }

  function onend() {
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (!dest._writableState || dest._writableState.needDrain)
      ondrain();
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    // the handler that waits for readable events after all
    // the data gets sucked out in flow.
    // This would be easier to follow with a .once() handler
    // in flow(), but that is too slow.
    this.on('readable', pipeOnReadable);

    state.flowing = true;
    process.nextTick(function() {
      flow(src);
    });
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var dest = this;
    var state = src._readableState;
    state.awaitDrain--;
    if (state.awaitDrain === 0)
      flow(src);
  };
}

function flow(src) {
  var state = src._readableState;
  var chunk;
  state.awaitDrain = 0;

  function write(dest, i, list) {
    var written = dest.write(chunk);
    if (false === written) {
      state.awaitDrain++;
    }
  }

  while (state.pipesCount && null !== (chunk = src.read())) {

    if (state.pipesCount === 1)
      write(state.pipes, 0, null);
    else
      forEach(state.pipes, write);

    src.emit('data', chunk);

    // if anyone needs a drain, then we have to wait for that.
    if (state.awaitDrain > 0)
      return;
  }

  // if every destination was unpiped, either before entering this
  // function, or in the while loop, then stop flowing.
  //
  // NB: This is a pretty rare edge case.
  if (state.pipesCount === 0) {
    state.flowing = false;

    // if there were data event listeners added, then switch to old mode.
    if (EE.listenerCount(src, 'data') > 0)
      emitDataEvents(src);
    return;
  }

  // at this point, no one needed a drain, so we just ran out of data
  // on the next readable event, start it over again.
  state.ranOut = true;
}

function pipeOnReadable() {
  if (this._readableState.ranOut) {
    this._readableState.ranOut = false;
    flow(this);
  }
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data' && !this._readableState.flowing)
    emitDataEvents(this);

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        this.read(0);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  emitDataEvents(this);
  this.read(0);
  this.emit('resume');
};

Readable.prototype.pause = function() {
  emitDataEvents(this, true);
  this.emit('pause');
};

function emitDataEvents(stream, startPaused) {
  var state = stream._readableState;

  if (state.flowing) {
    // https://github.com/isaacs/readable-stream/issues/16
    throw new Error('Cannot switch to old mode now.');
  }

  var paused = startPaused || false;
  var readable = false;

  // convert to an old-style stream.
  stream.readable = true;
  stream.pipe = Stream.prototype.pipe;
  stream.on = stream.addListener = Stream.prototype.on;

  stream.on('readable', function() {
    readable = true;

    var c;
    while (!paused && (null !== (c = stream.read())))
      stream.emit('data', c);

    if (c === null) {
      readable = false;
      stream._readableState.needReadable = true;
    }
  });

  stream.pause = function() {
    paused = true;
    this.emit('pause');
  };

  stream.resume = function() {
    paused = false;
    if (readable)
      process.nextTick(function() {
        stream.emit('readable');
      });
    else
      this.read(0);
    this.emit('resume');
  };

  // now make it start, just in case it hadn't already.
  stream.emit('readable');
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    if (state.decoder)
      chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    //if (state.objectMode && util.isNullOrUndefined(chunk))
    if (state.objectMode && (chunk === null || chunk === undefined))
      return;
    else if (!state.objectMode && (!chunk || !chunk.length))
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (typeof stream[i] === 'function' &&
        typeof this[i] === 'undefined') {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted && state.calledRead) {
    state.ended = true;
    process.nextTick(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require('_process'))
},{"_process":98,"buffer":90,"core-util-is":58,"events":94,"inherits":62,"isarray":59,"stream":110,"string_decoder/":60}],56:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined)
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  var ts = this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('finish', function() {
    if ('function' === typeof this._flush)
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var rs = stream._readableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./_stream_duplex":53,"core-util-is":58,"inherits":62}],57:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Stream = require('stream');

util.inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

function Writable(options) {
  var Duplex = require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  process.nextTick(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    process.nextTick(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (typeof cb !== 'function')
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb))
    ret = writeOrBuffer(this, state, chunk, encoding, cb);

  return ret;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    process.nextTick(function() {
      cb(er);
    });
  else
    cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished && !state.bufferProcessing && state.buffer.length)
      clearBuffer(stream, state);

    if (sync) {
      process.nextTick(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  cb();
  if (finished)
    finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  for (var c = 0; c < state.buffer.length; c++) {
    var entry = state.buffer[c];
    var chunk = entry.chunk;
    var encoding = entry.encoding;
    var cb = entry.callback;
    var len = state.objectMode ? 1 : chunk.length;

    doWrite(stream, state, len, chunk, encoding, cb);

    // if we didn't call the onwrite immediately, then
    // it means that we need to wait until it does.
    // also, that means that the chunk and cb are currently
    // being processed, so move the buffer counter past them.
    if (state.writing) {
      c++;
      break;
    }
  }

  state.bufferProcessing = false;
  if (c < state.buffer.length)
    state.buffer = state.buffer.slice(c);
  else
    state.buffer.length = 0;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (typeof chunk !== 'undefined' && chunk !== null)
    this.write(chunk, encoding);

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    state.finished = true;
    stream.emit('finish');
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      process.nextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

}).call(this,require('_process'))
},{"./_stream_duplex":53,"_process":98,"buffer":90,"core-util-is":58,"inherits":62,"stream":110}],58:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return Buffer.isBuffer(arg);
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}
}).call(this,require("buffer").Buffer)
},{"buffer":90}],59:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],60:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

},{"buffer":90}],61:[function(require,module,exports){
var Stream = require('stream'); // hack to fix a circular dependency issue when used with browserify
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = Stream;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":53,"./lib/_stream_passthrough.js":54,"./lib/_stream_readable.js":55,"./lib/_stream_transform.js":56,"./lib/_stream_writable.js":57,"stream":110}],62:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],63:[function(require,module,exports){
arguments[4][53][0].apply(exports,arguments)
},{"./_stream_readable":64,"./_stream_writable":66,"_process":98,"core-util-is":67,"dup":53,"inherits":62}],64:[function(require,module,exports){
arguments[4][55][0].apply(exports,arguments)
},{"_process":98,"buffer":90,"core-util-is":67,"dup":55,"events":94,"inherits":62,"isarray":68,"stream":110,"string_decoder/":69}],65:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"./_stream_duplex":63,"core-util-is":67,"dup":56,"inherits":62}],66:[function(require,module,exports){
arguments[4][57][0].apply(exports,arguments)
},{"./_stream_duplex":63,"_process":98,"buffer":90,"core-util-is":67,"dup":57,"inherits":62,"stream":110}],67:[function(require,module,exports){
arguments[4][58][0].apply(exports,arguments)
},{"buffer":90,"dup":58}],68:[function(require,module,exports){
arguments[4][59][0].apply(exports,arguments)
},{"dup":59}],69:[function(require,module,exports){
arguments[4][60][0].apply(exports,arguments)
},{"buffer":90,"dup":60}],70:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":65}],71:[function(require,module,exports){
(function (process){
var Transform = require('readable-stream/transform')
  , inherits  = require('util').inherits
  , xtend     = require('xtend')

function DestroyableTransform(opts) {
  Transform.call(this, opts)
  this._destroyed = false
}

inherits(DestroyableTransform, Transform)

DestroyableTransform.prototype.destroy = function(err) {
  if (this._destroyed) return
  this._destroyed = true
  
  var self = this
  process.nextTick(function() {
    if (err)
      self.emit('error', err)
    self.emit('close')
  })
}

// a noop _transform function
function noop (chunk, enc, callback) {
  callback(null, chunk)
}


// create a new export function, used by both the main export and
// the .ctor export, contains common logic for dealing with arguments
function through2 (construct) {
  return function (options, transform, flush) {
    if (typeof options == 'function') {
      flush     = transform
      transform = options
      options   = {}
    }

    if (typeof transform != 'function')
      transform = noop

    if (typeof flush != 'function')
      flush = null

    return construct(options, transform, flush)
  }
}


// main export, just make me a transform stream!
module.exports = through2(function (options, transform, flush) {
  var t2 = new DestroyableTransform(options)

  t2._transform = transform

  if (flush)
    t2._flush = flush

  return t2
})


// make me a reusable prototype that I can `new`, or implicitly `new`
// with a constructor call
module.exports.ctor = through2(function (options, transform, flush) {
  function Through2 (override) {
    if (!(this instanceof Through2))
      return new Through2(override)

    this.options = xtend(options, override)

    DestroyableTransform.call(this, this.options)
  }

  inherits(Through2, DestroyableTransform)

  Through2.prototype._transform = transform

  if (flush)
    Through2.prototype._flush = flush

  return Through2
})


module.exports.obj = through2(function (options, transform, flush) {
  var t2 = new DestroyableTransform(xtend({ objectMode: true, highWaterMark: 16 }, options))

  t2._transform = transform

  if (flush)
    t2._flush = flush

  return t2
})

}).call(this,require('_process'))
},{"_process":98,"readable-stream/transform":70,"util":113,"xtend":73}],72:[function(require,module,exports){

/**
 * Module dependencies.
 */

var global = (function() { return this; })();

/**
 * WebSocket constructor.
 */

var WebSocket = global.WebSocket || global.MozWebSocket;

/**
 * Module exports.
 */

module.exports = WebSocket ? ws : null;

/**
 * WebSocket constructor.
 *
 * The third `opts` options object gets ignored in web browsers, since it's
 * non-standard, and throws a TypeError if passed to the constructor.
 * See: https://github.com/einaros/ws/issues/227
 *
 * @param {String} uri
 * @param {Array} protocols (optional)
 * @param {Object) opts (optional)
 * @api public
 */

function ws(uri, protocols, opts) {
  var instance;
  if (protocols) {
    instance = new WebSocket(uri, protocols);
  } else {
    instance = new WebSocket(uri);
  }
  return instance;
}

if (WebSocket) ws.prototype = WebSocket.prototype;

},{}],73:[function(require,module,exports){
module.exports = extend

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],74:[function(require,module,exports){
(function (process,Buffer){
var through = require('through2')
var duplexify = require('duplexify')
var WS = require('ws')

module.exports = WebSocketStream

function WebSocketStream(target, protocols) {
  var stream, socket
  var socketWrite = process.title === 'browser' ? socketWriteBrowser : socketWriteNode
  var proxy = through(socketWrite, socketEnd)

  // use existing WebSocket object that was passed in
  if (typeof target === 'object') {
    socket = target
  // otherwise make a new one
  } else {
    socket = new WS(target, protocols)
    socket.binaryType = 'arraybuffer'
  }

  // was already open when passed in
  if (socket.readyState === 1) {
    stream = proxy
  } else {
    stream = duplexify()
    socket.addEventListener("open", onready)
  }

  stream.socket = socket

  socket.addEventListener("close", onclose)
  socket.addEventListener("error", onerror)
  socket.addEventListener("message", onmessage)

  proxy.on('close', destroy)

  function socketWriteNode(chunk, enc, next) {
    socket.send(chunk, next)
  }

  function socketWriteBrowser(chunk, enc, next) {
    try {
      socket.send(chunk)
    } catch(err) {
      return next(err)
    }

    next()
  }

  function socketEnd(done) {
    socket.close()
    done()
  }

  function onready() {
    stream.setReadable(proxy)
    stream.setWritable(proxy)
    stream.emit('connect')
  }

  function onclose() {
    stream.destroy()
  }

  function onerror(err) {
    stream.destroy(err)
  }

  function onmessage(event) {
    var data = event.data
    if (data instanceof ArrayBuffer) data = new Buffer(new Uint8Array(data))
    proxy.push(data)
  }

  function destroy() {
    socket.close()
  }

  return stream
}

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":98,"buffer":90,"duplexify":49,"through2":71,"ws":72}],75:[function(require,module,exports){

},{}],76:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && !isFinite(value)) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b)) {
    return a === b;
  }
  var aIsArgs = isArguments(a),
      bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  var ka = objectKeys(a),
      kb = objectKeys(b),
      key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":113}],77:[function(require,module,exports){
'use strict';


var TYPED_OK =  (typeof Uint8Array !== 'undefined') &&
                (typeof Uint16Array !== 'undefined') &&
                (typeof Int32Array !== 'undefined');


exports.assign = function (obj /*from1, from2, from3, ...*/) {
  var sources = Array.prototype.slice.call(arguments, 1);
  while (sources.length) {
    var source = sources.shift();
    if (!source) { continue; }

    if (typeof(source) !== 'object') {
      throw new TypeError(source + 'must be non-object');
    }

    for (var p in source) {
      if (source.hasOwnProperty(p)) {
        obj[p] = source[p];
      }
    }
  }

  return obj;
};


// reduce buffer size, avoiding mem copy
exports.shrinkBuf = function (buf, size) {
  if (buf.length === size) { return buf; }
  if (buf.subarray) { return buf.subarray(0, size); }
  buf.length = size;
  return buf;
};


var fnTyped = {
  arraySet: function (dest, src, src_offs, len, dest_offs) {
    if (src.subarray && dest.subarray) {
      dest.set(src.subarray(src_offs, src_offs+len), dest_offs);
      return;
    }
    // Fallback to ordinary array
    for(var i=0; i<len; i++) {
      dest[dest_offs + i] = src[src_offs + i];
    }
  },
  // Join array of chunks to single array.
  flattenChunks: function(chunks) {
    var i, l, len, pos, chunk, result;

    // calculate data length
    len = 0;
    for (i=0, l=chunks.length; i<l; i++) {
      len += chunks[i].length;
    }

    // join chunks
    result = new Uint8Array(len);
    pos = 0;
    for (i=0, l=chunks.length; i<l; i++) {
      chunk = chunks[i];
      result.set(chunk, pos);
      pos += chunk.length;
    }

    return result;
  }
};

var fnUntyped = {
  arraySet: function (dest, src, src_offs, len, dest_offs) {
    for(var i=0; i<len; i++) {
      dest[dest_offs + i] = src[src_offs + i];
    }
  },
  // Join array of chunks to single array.
  flattenChunks: function(chunks) {
    return [].concat.apply([], chunks);
  }
};


// Enable/Disable typed arrays use, for testing
//
exports.setTyped = function (on) {
  if (on) {
    exports.Buf8  = Uint8Array;
    exports.Buf16 = Uint16Array;
    exports.Buf32 = Int32Array;
    exports.assign(exports, fnTyped);
  } else {
    exports.Buf8  = Array;
    exports.Buf16 = Array;
    exports.Buf32 = Array;
    exports.assign(exports, fnUntyped);
  }
};

exports.setTyped(TYPED_OK);
},{}],78:[function(require,module,exports){
'use strict';

// Note: adler32 takes 12% for level 0 and 2% for level 6.
// It doesn't worth to make additional optimizationa as in original.
// Small size is preferable.

function adler32(adler, buf, len, pos) {
  var s1 = (adler & 0xffff) |0
    , s2 = ((adler >>> 16) & 0xffff) |0
    , n = 0;

  while (len !== 0) {
    // Set limit ~ twice less than 5552, to keep
    // s2 in 31-bits, because we force signed ints.
    // in other case %= will fail.
    n = len > 2000 ? 2000 : len;
    len -= n;

    do {
      s1 = (s1 + buf[pos++]) |0;
      s2 = (s2 + s1) |0;
    } while (--n);

    s1 %= 65521;
    s2 %= 65521;
  }

  return (s1 | (s2 << 16)) |0;
}


module.exports = adler32;
},{}],79:[function(require,module,exports){
module.exports = {

  /* Allowed flush values; see deflate() and inflate() below for details */
  Z_NO_FLUSH:         0,
  Z_PARTIAL_FLUSH:    1,
  Z_SYNC_FLUSH:       2,
  Z_FULL_FLUSH:       3,
  Z_FINISH:           4,
  Z_BLOCK:            5,
  Z_TREES:            6,

  /* Return codes for the compression/decompression functions. Negative values
  * are errors, positive values are used for special but normal events.
  */
  Z_OK:               0,
  Z_STREAM_END:       1,
  Z_NEED_DICT:        2,
  Z_ERRNO:           -1,
  Z_STREAM_ERROR:    -2,
  Z_DATA_ERROR:      -3,
  //Z_MEM_ERROR:     -4,
  Z_BUF_ERROR:       -5,
  //Z_VERSION_ERROR: -6,

  /* compression levels */
  Z_NO_COMPRESSION:         0,
  Z_BEST_SPEED:             1,
  Z_BEST_COMPRESSION:       9,
  Z_DEFAULT_COMPRESSION:   -1,


  Z_FILTERED:               1,
  Z_HUFFMAN_ONLY:           2,
  Z_RLE:                    3,
  Z_FIXED:                  4,
  Z_DEFAULT_STRATEGY:       0,

  /* Possible values of the data_type field (though see inflate()) */
  Z_BINARY:                 0,
  Z_TEXT:                   1,
  //Z_ASCII:                1, // = Z_TEXT (deprecated)
  Z_UNKNOWN:                2,

  /* The deflate compression method */
  Z_DEFLATED:               8
  //Z_NULL:                 null // Use -1 or null inline, depending on var type
};
},{}],80:[function(require,module,exports){
'use strict';

// Note: we can't get significant speed boost here.
// So write code to minimize size - no pregenerated tables
// and array tools dependencies.


// Use ordinary array, since untyped makes no boost here
function makeTable() {
  var c, table = [];

  for(var n =0; n < 256; n++){
    c = n;
    for(var k =0; k < 8; k++){
      c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }

  return table;
}

// Create table on load. Just 255 signed longs. Not a problem.
var crcTable = makeTable();


function crc32(crc, buf, len, pos) {
  var t = crcTable
    , end = pos + len;

  crc = crc ^ (-1);

  for (var i = pos; i < end; i++ ) {
    crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
  }

  return (crc ^ (-1)); // >>> 0;
}


module.exports = crc32;
},{}],81:[function(require,module,exports){
'use strict';

var utils   = require('../utils/common');
var trees   = require('./trees');
var adler32 = require('./adler32');
var crc32   = require('./crc32');
var msg   = require('./messages');

/* Public constants ==========================================================*/
/* ===========================================================================*/


/* Allowed flush values; see deflate() and inflate() below for details */
var Z_NO_FLUSH      = 0;
var Z_PARTIAL_FLUSH = 1;
//var Z_SYNC_FLUSH    = 2;
var Z_FULL_FLUSH    = 3;
var Z_FINISH        = 4;
var Z_BLOCK         = 5;
//var Z_TREES         = 6;


/* Return codes for the compression/decompression functions. Negative values
 * are errors, positive values are used for special but normal events.
 */
var Z_OK            = 0;
var Z_STREAM_END    = 1;
//var Z_NEED_DICT     = 2;
//var Z_ERRNO         = -1;
var Z_STREAM_ERROR  = -2;
var Z_DATA_ERROR    = -3;
//var Z_MEM_ERROR     = -4;
var Z_BUF_ERROR     = -5;
//var Z_VERSION_ERROR = -6;


/* compression levels */
//var Z_NO_COMPRESSION      = 0;
//var Z_BEST_SPEED          = 1;
//var Z_BEST_COMPRESSION    = 9;
var Z_DEFAULT_COMPRESSION = -1;


var Z_FILTERED            = 1;
var Z_HUFFMAN_ONLY        = 2;
var Z_RLE                 = 3;
var Z_FIXED               = 4;
var Z_DEFAULT_STRATEGY    = 0;

/* Possible values of the data_type field (though see inflate()) */
//var Z_BINARY              = 0;
//var Z_TEXT                = 1;
//var Z_ASCII               = 1; // = Z_TEXT
var Z_UNKNOWN             = 2;


/* The deflate compression method */
var Z_DEFLATED  = 8;

/*============================================================================*/


var MAX_MEM_LEVEL = 9;
/* Maximum value for memLevel in deflateInit2 */
var MAX_WBITS = 15;
/* 32K LZ77 window */
var DEF_MEM_LEVEL = 8;


var LENGTH_CODES  = 29;
/* number of length codes, not counting the special END_BLOCK code */
var LITERALS      = 256;
/* number of literal bytes 0..255 */
var L_CODES       = LITERALS + 1 + LENGTH_CODES;
/* number of Literal or Length codes, including the END_BLOCK code */
var D_CODES       = 30;
/* number of distance codes */
var BL_CODES      = 19;
/* number of codes used to transfer the bit lengths */
var HEAP_SIZE     = 2*L_CODES + 1;
/* maximum heap size */
var MAX_BITS  = 15;
/* All codes must not exceed MAX_BITS bits */

var MIN_MATCH = 3;
var MAX_MATCH = 258;
var MIN_LOOKAHEAD = (MAX_MATCH + MIN_MATCH + 1);

var PRESET_DICT = 0x20;

var INIT_STATE = 42;
var EXTRA_STATE = 69;
var NAME_STATE = 73;
var COMMENT_STATE = 91;
var HCRC_STATE = 103;
var BUSY_STATE = 113;
var FINISH_STATE = 666;

var BS_NEED_MORE      = 1; /* block not completed, need more input or more output */
var BS_BLOCK_DONE     = 2; /* block flush performed */
var BS_FINISH_STARTED = 3; /* finish started, need only more output at next deflate */
var BS_FINISH_DONE    = 4; /* finish done, accept no more input or output */

var OS_CODE = 0x03; // Unix :) . Don't detect, use this default.

function err(strm, errorCode) {
  strm.msg = msg[errorCode];
  return errorCode;
}

function rank(f) {
  return ((f) << 1) - ((f) > 4 ? 9 : 0);
}

function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }


/* =========================================================================
 * Flush as much pending output as possible. All deflate() output goes
 * through this function so some applications may wish to modify it
 * to avoid allocating a large strm->output buffer and copying into it.
 * (See also read_buf()).
 */
function flush_pending(strm) {
  var s = strm.state;

  //_tr_flush_bits(s);
  var len = s.pending;
  if (len > strm.avail_out) {
    len = strm.avail_out;
  }
  if (len === 0) { return; }

  utils.arraySet(strm.output, s.pending_buf, s.pending_out, len, strm.next_out);
  strm.next_out += len;
  s.pending_out += len;
  strm.total_out += len;
  strm.avail_out -= len;
  s.pending -= len;
  if (s.pending === 0) {
    s.pending_out = 0;
  }
}


function flush_block_only (s, last) {
  trees._tr_flush_block(s, (s.block_start >= 0 ? s.block_start : -1), s.strstart - s.block_start, last);
  s.block_start = s.strstart;
  flush_pending(s.strm);
}


function put_byte(s, b) {
  s.pending_buf[s.pending++] = b;
}


/* =========================================================================
 * Put a short in the pending buffer. The 16-bit value is put in MSB order.
 * IN assertion: the stream state is correct and there is enough room in
 * pending_buf.
 */
function putShortMSB(s, b) {
//  put_byte(s, (Byte)(b >> 8));
//  put_byte(s, (Byte)(b & 0xff));
  s.pending_buf[s.pending++] = (b >>> 8) & 0xff;
  s.pending_buf[s.pending++] = b & 0xff;
}


/* ===========================================================================
 * Read a new buffer from the current input stream, update the adler32
 * and total number of bytes read.  All deflate() input goes through
 * this function so some applications may wish to modify it to avoid
 * allocating a large strm->input buffer and copying from it.
 * (See also flush_pending()).
 */
function read_buf(strm, buf, start, size) {
  var len = strm.avail_in;

  if (len > size) { len = size; }
  if (len === 0) { return 0; }

  strm.avail_in -= len;

  utils.arraySet(buf, strm.input, strm.next_in, len, start);
  if (strm.state.wrap === 1) {
    strm.adler = adler32(strm.adler, buf, len, start);
  }

  else if (strm.state.wrap === 2) {
    strm.adler = crc32(strm.adler, buf, len, start);
  }

  strm.next_in += len;
  strm.total_in += len;

  return len;
}


/* ===========================================================================
 * Set match_start to the longest match starting at the given string and
 * return its length. Matches shorter or equal to prev_length are discarded,
 * in which case the result is equal to prev_length and match_start is
 * garbage.
 * IN assertions: cur_match is the head of the hash chain for the current
 *   string (strstart) and its distance is <= MAX_DIST, and prev_length >= 1
 * OUT assertion: the match length is not greater than s->lookahead.
 */
function longest_match(s, cur_match) {
  var chain_length = s.max_chain_length;      /* max hash chain length */
  var scan = s.strstart; /* current string */
  var match;                       /* matched string */
  var len;                           /* length of current match */
  var best_len = s.prev_length;              /* best match length so far */
  var nice_match = s.nice_match;             /* stop if match long enough */
  var limit = (s.strstart > (s.w_size - MIN_LOOKAHEAD)) ?
      s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0/*NIL*/;

  var _win = s.window; // shortcut

  var wmask = s.w_mask;
  var prev  = s.prev;

  /* Stop when cur_match becomes <= limit. To simplify the code,
   * we prevent matches with the string of window index 0.
   */

  var strend = s.strstart + MAX_MATCH;
  var scan_end1  = _win[scan + best_len - 1];
  var scan_end   = _win[scan + best_len];

  /* The code is optimized for HASH_BITS >= 8 and MAX_MATCH-2 multiple of 16.
   * It is easy to get rid of this optimization if necessary.
   */
  // Assert(s->hash_bits >= 8 && MAX_MATCH == 258, "Code too clever");

  /* Do not waste too much time if we already have a good match: */
  if (s.prev_length >= s.good_match) {
    chain_length >>= 2;
  }
  /* Do not look for matches beyond the end of the input. This is necessary
   * to make deflate deterministic.
   */
  if (nice_match > s.lookahead) { nice_match = s.lookahead; }

  // Assert((ulg)s->strstart <= s->window_size-MIN_LOOKAHEAD, "need lookahead");

  do {
    // Assert(cur_match < s->strstart, "no future");
    match = cur_match;

    /* Skip to next match if the match length cannot increase
     * or if the match length is less than 2.  Note that the checks below
     * for insufficient lookahead only occur occasionally for performance
     * reasons.  Therefore uninitialized memory will be accessed, and
     * conditional jumps will be made that depend on those values.
     * However the length of the match is limited to the lookahead, so
     * the output of deflate is not affected by the uninitialized values.
     */

    if (_win[match + best_len]     !== scan_end  ||
        _win[match + best_len - 1] !== scan_end1 ||
        _win[match]                !== _win[scan] ||
        _win[++match]              !== _win[scan + 1]) {
      continue;
    }

    /* The check at best_len-1 can be removed because it will be made
     * again later. (This heuristic is not always a win.)
     * It is not necessary to compare scan[2] and match[2] since they
     * are always equal when the other bytes match, given that
     * the hash keys are equal and that HASH_BITS >= 8.
     */
    scan += 2;
    match++;
    // Assert(*scan == *match, "match[2]?");

    /* We check for insufficient lookahead only every 8th comparison;
     * the 256th check will be made at strstart+258.
     */
    do {
      /*jshint noempty:false*/
    } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             scan < strend);

    // Assert(scan <= s->window+(unsigned)(s->window_size-1), "wild scan");

    len = MAX_MATCH - (strend - scan);
    scan = strend - MAX_MATCH;

    if (len > best_len) {
      s.match_start = cur_match;
      best_len = len;
      if (len >= nice_match) {
        break;
      }
      scan_end1  = _win[scan + best_len - 1];
      scan_end   = _win[scan + best_len];
    }
  } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);

  if (best_len <= s.lookahead) {
    return best_len;
  }
  return s.lookahead;
}


/* ===========================================================================
 * Fill the window when the lookahead becomes insufficient.
 * Updates strstart and lookahead.
 *
 * IN assertion: lookahead < MIN_LOOKAHEAD
 * OUT assertions: strstart <= window_size-MIN_LOOKAHEAD
 *    At least one byte has been read, or avail_in == 0; reads are
 *    performed for at least two bytes (required for the zip translate_eol
 *    option -- not supported here).
 */
function fill_window(s) {
  var _w_size = s.w_size;
  var p, n, m, more, str;

  //Assert(s->lookahead < MIN_LOOKAHEAD, "already enough lookahead");

  do {
    more = s.window_size - s.lookahead - s.strstart;

    // JS ints have 32 bit, block below not needed
    /* Deal with !@#$% 64K limit: */
    //if (sizeof(int) <= 2) {
    //    if (more == 0 && s->strstart == 0 && s->lookahead == 0) {
    //        more = wsize;
    //
    //  } else if (more == (unsigned)(-1)) {
    //        /* Very unlikely, but possible on 16 bit machine if
    //         * strstart == 0 && lookahead == 1 (input done a byte at time)
    //         */
    //        more--;
    //    }
    //}


    /* If the window is almost full and there is insufficient lookahead,
     * move the upper half to the lower one to make room in the upper half.
     */
    if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {

      utils.arraySet(s.window, s.window, _w_size, _w_size, 0);
      s.match_start -= _w_size;
      s.strstart -= _w_size;
      /* we now have strstart >= MAX_DIST */
      s.block_start -= _w_size;

      /* Slide the hash table (could be avoided with 32 bit values
       at the expense of memory usage). We slide even when level == 0
       to keep the hash table consistent if we switch back to level > 0
       later. (Using level 0 permanently is not an optimal usage of
       zlib, so we don't care about this pathological case.)
       */

      n = s.hash_size;
      p = n;
      do {
        m = s.head[--p];
        s.head[p] = (m >= _w_size ? m - _w_size : 0);
      } while (--n);

      n = _w_size;
      p = n;
      do {
        m = s.prev[--p];
        s.prev[p] = (m >= _w_size ? m - _w_size : 0);
        /* If n is not on any hash chain, prev[n] is garbage but
         * its value will never be used.
         */
      } while (--n);

      more += _w_size;
    }
    if (s.strm.avail_in === 0) {
      break;
    }

    /* If there was no sliding:
     *    strstart <= WSIZE+MAX_DIST-1 && lookahead <= MIN_LOOKAHEAD - 1 &&
     *    more == window_size - lookahead - strstart
     * => more >= window_size - (MIN_LOOKAHEAD-1 + WSIZE + MAX_DIST-1)
     * => more >= window_size - 2*WSIZE + 2
     * In the BIG_MEM or MMAP case (not yet supported),
     *   window_size == input_size + MIN_LOOKAHEAD  &&
     *   strstart + s->lookahead <= input_size => more >= MIN_LOOKAHEAD.
     * Otherwise, window_size == 2*WSIZE so more >= 2.
     * If there was sliding, more >= WSIZE. So in all cases, more >= 2.
     */
    //Assert(more >= 2, "more < 2");
    n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
    s.lookahead += n;

    /* Initialize the hash value now that we have some input: */
    if (s.lookahead + s.insert >= MIN_MATCH) {
      str = s.strstart - s.insert;
      s.ins_h = s.window[str];

      /* UPDATE_HASH(s, s->ins_h, s->window[str + 1]); */
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + 1]) & s.hash_mask;
//#if MIN_MATCH != 3
//        Call update_hash() MIN_MATCH-3 more times
//#endif
      while (s.insert) {
        /* UPDATE_HASH(s, s->ins_h, s->window[str + MIN_MATCH-1]); */
        s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + MIN_MATCH-1]) & s.hash_mask;

        s.prev[str & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = str;
        str++;
        s.insert--;
        if (s.lookahead + s.insert < MIN_MATCH) {
          break;
        }
      }
    }
    /* If the whole input has less than MIN_MATCH bytes, ins_h is garbage,
     * but this is not important since only literal bytes will be emitted.
     */

  } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);

  /* If the WIN_INIT bytes after the end of the current data have never been
   * written, then zero those bytes in order to avoid memory check reports of
   * the use of uninitialized (or uninitialised as Julian writes) bytes by
   * the longest match routines.  Update the high water mark for the next
   * time through here.  WIN_INIT is set to MAX_MATCH since the longest match
   * routines allow scanning to strstart + MAX_MATCH, ignoring lookahead.
   */
//  if (s.high_water < s.window_size) {
//    var curr = s.strstart + s.lookahead;
//    var init = 0;
//
//    if (s.high_water < curr) {
//      /* Previous high water mark below current data -- zero WIN_INIT
//       * bytes or up to end of window, whichever is less.
//       */
//      init = s.window_size - curr;
//      if (init > WIN_INIT)
//        init = WIN_INIT;
//      zmemzero(s->window + curr, (unsigned)init);
//      s->high_water = curr + init;
//    }
//    else if (s->high_water < (ulg)curr + WIN_INIT) {
//      /* High water mark at or above current data, but below current data
//       * plus WIN_INIT -- zero out to current data plus WIN_INIT, or up
//       * to end of window, whichever is less.
//       */
//      init = (ulg)curr + WIN_INIT - s->high_water;
//      if (init > s->window_size - s->high_water)
//        init = s->window_size - s->high_water;
//      zmemzero(s->window + s->high_water, (unsigned)init);
//      s->high_water += init;
//    }
//  }
//
//  Assert((ulg)s->strstart <= s->window_size - MIN_LOOKAHEAD,
//    "not enough room for search");
}

/* ===========================================================================
 * Copy without compression as much as possible from the input stream, return
 * the current block state.
 * This function does not insert new strings in the dictionary since
 * uncompressible data is probably not useful. This function is used
 * only for the level=0 compression option.
 * NOTE: this function should be optimized to avoid extra copying from
 * window to pending_buf.
 */
function deflate_stored(s, flush) {
  /* Stored blocks are limited to 0xffff bytes, pending_buf is limited
   * to pending_buf_size, and each stored block has a 5 byte header:
   */
  var max_block_size = 0xffff;

  if (max_block_size > s.pending_buf_size - 5) {
    max_block_size = s.pending_buf_size - 5;
  }

  /* Copy as much as possible from input to output: */
  for (;;) {
    /* Fill the window as much as possible: */
    if (s.lookahead <= 1) {

      //Assert(s->strstart < s->w_size+MAX_DIST(s) ||
      //  s->block_start >= (long)s->w_size, "slide too late");
//      if (!(s.strstart < s.w_size + (s.w_size - MIN_LOOKAHEAD) ||
//        s.block_start >= s.w_size)) {
//        throw  new Error("slide too late");
//      }

      fill_window(s);
      if (s.lookahead === 0 && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }

      if (s.lookahead === 0) {
        break;
      }
      /* flush the current block */
    }
    //Assert(s->block_start >= 0L, "block gone");
//    if (s.block_start < 0) throw new Error("block gone");

    s.strstart += s.lookahead;
    s.lookahead = 0;

    /* Emit a stored block if pending_buf will be full: */
    var max_start = s.block_start + max_block_size;

    if (s.strstart === 0 || s.strstart >= max_start) {
      /* strstart == 0 is possible when wraparound on 16-bit machine */
      s.lookahead = s.strstart - max_start;
      s.strstart = max_start;
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/


    }
    /* Flush if we may have to slide, otherwise block_start may become
     * negative and the data will be gone:
     */
    if (s.strstart - s.block_start >= (s.w_size - MIN_LOOKAHEAD)) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }

  s.insert = 0;

  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }

  if (s.strstart > s.block_start) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }

  return BS_NEED_MORE;
}

/* ===========================================================================
 * Compress as much as possible from the input stream, return the current
 * block state.
 * This function does not perform lazy evaluation of matches and inserts
 * new strings in the dictionary only for unmatched strings or for short
 * matches. It is used only for the fast compression options.
 */
function deflate_fast(s, flush) {
  var hash_head;        /* head of the hash chain */
  var bflush;           /* set if current block must be flushed */

  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the next match, plus MIN_MATCH bytes to insert the
     * string following the next match.
     */
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break; /* flush the current block */
      }
    }

    /* Insert the string window[strstart .. strstart+2] in the
     * dictionary, and set hash_head to the head of the hash chain:
     */
    hash_head = 0/*NIL*/;
    if (s.lookahead >= MIN_MATCH) {
      /*** INSERT_STRING(s, s.strstart, hash_head); ***/
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
      /***/
    }

    /* Find the longest match, discarding those <= prev_length.
     * At this point we have always match_length < MIN_MATCH
     */
    if (hash_head !== 0/*NIL*/ && ((s.strstart - hash_head) <= (s.w_size - MIN_LOOKAHEAD))) {
      /* To simplify the code, we prevent matches with the string
       * of window index 0 (in particular we have to avoid a match
       * of the string with itself at the start of the input file).
       */
      s.match_length = longest_match(s, hash_head);
      /* longest_match() sets match_start */
    }
    if (s.match_length >= MIN_MATCH) {
      // check_match(s, s.strstart, s.match_start, s.match_length); // for debug only

      /*** _tr_tally_dist(s, s.strstart - s.match_start,
                     s.match_length - MIN_MATCH, bflush); ***/
      bflush = trees._tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);

      s.lookahead -= s.match_length;

      /* Insert new strings in the hash table only if the match length
       * is not too large. This saves time but degrades compression.
       */
      if (s.match_length <= s.max_lazy_match/*max_insert_length*/ && s.lookahead >= MIN_MATCH) {
        s.match_length--; /* string at strstart already in table */
        do {
          s.strstart++;
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
          /* strstart never exceeds WSIZE-MAX_MATCH, so there are
           * always MIN_MATCH bytes ahead.
           */
        } while (--s.match_length !== 0);
        s.strstart++;
      } else
      {
        s.strstart += s.match_length;
        s.match_length = 0;
        s.ins_h = s.window[s.strstart];
        /* UPDATE_HASH(s, s.ins_h, s.window[s.strstart+1]); */
        s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + 1]) & s.hash_mask;

//#if MIN_MATCH != 3
//                Call UPDATE_HASH() MIN_MATCH-3 more times
//#endif
        /* If lookahead < MIN_MATCH, ins_h is garbage, but it does not
         * matter since it will be recomputed at next deflate call.
         */
      }
    } else {
      /* No match, output a literal byte */
      //Tracevv((stderr,"%c", s.window[s.strstart]));
      /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
      bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }
  s.insert = ((s.strstart < (MIN_MATCH-1)) ? s.strstart : MIN_MATCH-1);
  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }
  return BS_BLOCK_DONE;
}

/* ===========================================================================
 * Same as above, but achieves better compression. We use a lazy
 * evaluation for matches: a match is finally adopted only if there is
 * no better match at the next window position.
 */
function deflate_slow(s, flush) {
  var hash_head;          /* head of hash chain */
  var bflush;              /* set if current block must be flushed */

  var max_insert;

  /* Process the input block. */
  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the next match, plus MIN_MATCH bytes to insert the
     * string following the next match.
     */
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) { break; } /* flush the current block */
    }

    /* Insert the string window[strstart .. strstart+2] in the
     * dictionary, and set hash_head to the head of the hash chain:
     */
    hash_head = 0/*NIL*/;
    if (s.lookahead >= MIN_MATCH) {
      /*** INSERT_STRING(s, s.strstart, hash_head); ***/
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
      /***/
    }

    /* Find the longest match, discarding those <= prev_length.
     */
    s.prev_length = s.match_length;
    s.prev_match = s.match_start;
    s.match_length = MIN_MATCH-1;

    if (hash_head !== 0/*NIL*/ && s.prev_length < s.max_lazy_match &&
        s.strstart - hash_head <= (s.w_size-MIN_LOOKAHEAD)/*MAX_DIST(s)*/) {
      /* To simplify the code, we prevent matches with the string
       * of window index 0 (in particular we have to avoid a match
       * of the string with itself at the start of the input file).
       */
      s.match_length = longest_match(s, hash_head);
      /* longest_match() sets match_start */

      if (s.match_length <= 5 &&
         (s.strategy === Z_FILTERED || (s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096/*TOO_FAR*/))) {

        /* If prev_match is also MIN_MATCH, match_start is garbage
         * but we will ignore the current match anyway.
         */
        s.match_length = MIN_MATCH-1;
      }
    }
    /* If there was a match at the previous step and the current
     * match is not better, output the previous match:
     */
    if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
      max_insert = s.strstart + s.lookahead - MIN_MATCH;
      /* Do not insert strings in hash table beyond this. */

      //check_match(s, s.strstart-1, s.prev_match, s.prev_length);

      /***_tr_tally_dist(s, s.strstart - 1 - s.prev_match,
                     s.prev_length - MIN_MATCH, bflush);***/
      bflush = trees._tr_tally(s, s.strstart - 1- s.prev_match, s.prev_length - MIN_MATCH);
      /* Insert in hash table all strings up to the end of the match.
       * strstart-1 and strstart are already inserted. If there is not
       * enough lookahead, the last two strings are not inserted in
       * the hash table.
       */
      s.lookahead -= s.prev_length-1;
      s.prev_length -= 2;
      do {
        if (++s.strstart <= max_insert) {
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
        }
      } while (--s.prev_length !== 0);
      s.match_available = 0;
      s.match_length = MIN_MATCH-1;
      s.strstart++;

      if (bflush) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }

    } else if (s.match_available) {
      /* If there was no match at the previous position, output a
       * single literal. If there was a match but the current match
       * is longer, truncate the previous match to a single literal.
       */
      //Tracevv((stderr,"%c", s->window[s->strstart-1]));
      /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
      bflush = trees._tr_tally(s, 0, s.window[s.strstart-1]);

      if (bflush) {
        /*** FLUSH_BLOCK_ONLY(s, 0) ***/
        flush_block_only(s, false);
        /***/
      }
      s.strstart++;
      s.lookahead--;
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    } else {
      /* There is no previous match to compare with, wait for
       * the next step to decide.
       */
      s.match_available = 1;
      s.strstart++;
      s.lookahead--;
    }
  }
  //Assert (flush != Z_NO_FLUSH, "no flush?");
  if (s.match_available) {
    //Tracevv((stderr,"%c", s->window[s->strstart-1]));
    /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
    bflush = trees._tr_tally(s, 0, s.window[s.strstart-1]);

    s.match_available = 0;
  }
  s.insert = s.strstart < MIN_MATCH-1 ? s.strstart : MIN_MATCH-1;
  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }

  return BS_BLOCK_DONE;
}


/* ===========================================================================
 * For Z_RLE, simply look for runs of bytes, generate matches only of distance
 * one.  Do not maintain a hash table.  (It will be regenerated if this run of
 * deflate switches away from Z_RLE.)
 */
function deflate_rle(s, flush) {
  var bflush;            /* set if current block must be flushed */
  var prev;              /* byte at distance one to match */
  var scan, strend;      /* scan goes up to strend for length of run */

  var _win = s.window;

  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the longest run, plus one for the unrolled loop.
     */
    if (s.lookahead <= MAX_MATCH) {
      fill_window(s);
      if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) { break; } /* flush the current block */
    }

    /* See how many times the previous byte repeats */
    s.match_length = 0;
    if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
      scan = s.strstart - 1;
      prev = _win[scan];
      if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
        strend = s.strstart + MAX_MATCH;
        do {
          /*jshint noempty:false*/
        } while (prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 scan < strend);
        s.match_length = MAX_MATCH - (strend - scan);
        if (s.match_length > s.lookahead) {
          s.match_length = s.lookahead;
        }
      }
      //Assert(scan <= s->window+(uInt)(s->window_size-1), "wild scan");
    }

    /* Emit match if have run of MIN_MATCH or longer, else emit literal */
    if (s.match_length >= MIN_MATCH) {
      //check_match(s, s.strstart, s.strstart - 1, s.match_length);

      /*** _tr_tally_dist(s, 1, s.match_length - MIN_MATCH, bflush); ***/
      bflush = trees._tr_tally(s, 1, s.match_length - MIN_MATCH);

      s.lookahead -= s.match_length;
      s.strstart += s.match_length;
      s.match_length = 0;
    } else {
      /* No match, output a literal byte */
      //Tracevv((stderr,"%c", s->window[s->strstart]));
      /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
      bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }
  return BS_BLOCK_DONE;
}

/* ===========================================================================
 * For Z_HUFFMAN_ONLY, do not look for matches.  Do not maintain a hash table.
 * (It will be regenerated if this run of deflate switches away from Huffman.)
 */
function deflate_huff(s, flush) {
  var bflush;             /* set if current block must be flushed */

  for (;;) {
    /* Make sure that we have a literal to write. */
    if (s.lookahead === 0) {
      fill_window(s);
      if (s.lookahead === 0) {
        if (flush === Z_NO_FLUSH) {
          return BS_NEED_MORE;
        }
        break;      /* flush the current block */
      }
    }

    /* Output a literal byte */
    s.match_length = 0;
    //Tracevv((stderr,"%c", s->window[s->strstart]));
    /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
    bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
    s.lookahead--;
    s.strstart++;
    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }
  return BS_BLOCK_DONE;
}

/* Values for max_lazy_match, good_match and max_chain_length, depending on
 * the desired pack level (0..9). The values given below have been tuned to
 * exclude worst case performance for pathological files. Better values may be
 * found for specific files.
 */
var Config = function (good_length, max_lazy, nice_length, max_chain, func) {
  this.good_length = good_length;
  this.max_lazy = max_lazy;
  this.nice_length = nice_length;
  this.max_chain = max_chain;
  this.func = func;
};

var configuration_table;

configuration_table = [
  /*      good lazy nice chain */
  new Config(0, 0, 0, 0, deflate_stored),          /* 0 store only */
  new Config(4, 4, 8, 4, deflate_fast),            /* 1 max speed, no lazy matches */
  new Config(4, 5, 16, 8, deflate_fast),           /* 2 */
  new Config(4, 6, 32, 32, deflate_fast),          /* 3 */

  new Config(4, 4, 16, 16, deflate_slow),          /* 4 lazy matches */
  new Config(8, 16, 32, 32, deflate_slow),         /* 5 */
  new Config(8, 16, 128, 128, deflate_slow),       /* 6 */
  new Config(8, 32, 128, 256, deflate_slow),       /* 7 */
  new Config(32, 128, 258, 1024, deflate_slow),    /* 8 */
  new Config(32, 258, 258, 4096, deflate_slow)     /* 9 max compression */
];


/* ===========================================================================
 * Initialize the "longest match" routines for a new zlib stream
 */
function lm_init(s) {
  s.window_size = 2 * s.w_size;

  /*** CLEAR_HASH(s); ***/
  zero(s.head); // Fill with NIL (= 0);

  /* Set the default configuration parameters:
   */
  s.max_lazy_match = configuration_table[s.level].max_lazy;
  s.good_match = configuration_table[s.level].good_length;
  s.nice_match = configuration_table[s.level].nice_length;
  s.max_chain_length = configuration_table[s.level].max_chain;

  s.strstart = 0;
  s.block_start = 0;
  s.lookahead = 0;
  s.insert = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  s.ins_h = 0;
}


function DeflateState() {
  this.strm = null;            /* pointer back to this zlib stream */
  this.status = 0;            /* as the name implies */
  this.pending_buf = null;      /* output still pending */
  this.pending_buf_size = 0;  /* size of pending_buf */
  this.pending_out = 0;       /* next pending byte to output to the stream */
  this.pending = 0;           /* nb of bytes in the pending buffer */
  this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
  this.gzhead = null;         /* gzip header information to write */
  this.gzindex = 0;           /* where in extra, name, or comment */
  this.method = Z_DEFLATED; /* can only be DEFLATED */
  this.last_flush = -1;   /* value of flush param for previous deflate call */

  this.w_size = 0;  /* LZ77 window size (32K by default) */
  this.w_bits = 0;  /* log2(w_size)  (8..16) */
  this.w_mask = 0;  /* w_size - 1 */

  this.window = null;
  /* Sliding window. Input bytes are read into the second half of the window,
   * and move to the first half later to keep a dictionary of at least wSize
   * bytes. With this organization, matches are limited to a distance of
   * wSize-MAX_MATCH bytes, but this ensures that IO is always
   * performed with a length multiple of the block size.
   */

  this.window_size = 0;
  /* Actual size of window: 2*wSize, except when the user input buffer
   * is directly used as sliding window.
   */

  this.prev = null;
  /* Link to older string with same hash index. To limit the size of this
   * array to 64K, this link is maintained only for the last 32K strings.
   * An index in this array is thus a window index modulo 32K.
   */

  this.head = null;   /* Heads of the hash chains or NIL. */

  this.ins_h = 0;       /* hash index of string to be inserted */
  this.hash_size = 0;   /* number of elements in hash table */
  this.hash_bits = 0;   /* log2(hash_size) */
  this.hash_mask = 0;   /* hash_size-1 */

  this.hash_shift = 0;
  /* Number of bits by which ins_h must be shifted at each input
   * step. It must be such that after MIN_MATCH steps, the oldest
   * byte no longer takes part in the hash key, that is:
   *   hash_shift * MIN_MATCH >= hash_bits
   */

  this.block_start = 0;
  /* Window position at the beginning of the current output block. Gets
   * negative when the window is moved backwards.
   */

  this.match_length = 0;      /* length of best match */
  this.prev_match = 0;        /* previous match */
  this.match_available = 0;   /* set if previous match exists */
  this.strstart = 0;          /* start of string to insert */
  this.match_start = 0;       /* start of matching string */
  this.lookahead = 0;         /* number of valid bytes ahead in window */

  this.prev_length = 0;
  /* Length of the best match at previous step. Matches not greater than this
   * are discarded. This is used in the lazy match evaluation.
   */

  this.max_chain_length = 0;
  /* To speed up deflation, hash chains are never searched beyond this
   * length.  A higher limit improves compression ratio but degrades the
   * speed.
   */

  this.max_lazy_match = 0;
  /* Attempt to find a better match only when the current match is strictly
   * smaller than this value. This mechanism is used only for compression
   * levels >= 4.
   */
  // That's alias to max_lazy_match, don't use directly
  //this.max_insert_length = 0;
  /* Insert new strings in the hash table only if the match length is not
   * greater than this length. This saves time but degrades compression.
   * max_insert_length is used only for compression levels <= 3.
   */

  this.level = 0;     /* compression level (1..9) */
  this.strategy = 0;  /* favor or force Huffman coding*/

  this.good_match = 0;
  /* Use a faster search when the previous match is longer than this */

  this.nice_match = 0; /* Stop searching when current match exceeds this */

              /* used by trees.c: */

  /* Didn't use ct_data typedef below to suppress compiler warning */

  // struct ct_data_s dyn_ltree[HEAP_SIZE];   /* literal and length tree */
  // struct ct_data_s dyn_dtree[2*D_CODES+1]; /* distance tree */
  // struct ct_data_s bl_tree[2*BL_CODES+1];  /* Huffman tree for bit lengths */

  // Use flat array of DOUBLE size, with interleaved fata,
  // because JS does not support effective
  this.dyn_ltree  = new utils.Buf16(HEAP_SIZE * 2);
  this.dyn_dtree  = new utils.Buf16((2*D_CODES+1) * 2);
  this.bl_tree    = new utils.Buf16((2*BL_CODES+1) * 2);
  zero(this.dyn_ltree);
  zero(this.dyn_dtree);
  zero(this.bl_tree);

  this.l_desc   = null;         /* desc. for literal tree */
  this.d_desc   = null;         /* desc. for distance tree */
  this.bl_desc  = null;         /* desc. for bit length tree */

  //ush bl_count[MAX_BITS+1];
  this.bl_count = new utils.Buf16(MAX_BITS+1);
  /* number of codes at each bit length for an optimal tree */

  //int heap[2*L_CODES+1];      /* heap used to build the Huffman trees */
  this.heap = new utils.Buf16(2*L_CODES+1);  /* heap used to build the Huffman trees */
  zero(this.heap);

  this.heap_len = 0;               /* number of elements in the heap */
  this.heap_max = 0;               /* element of largest frequency */
  /* The sons of heap[n] are heap[2*n] and heap[2*n+1]. heap[0] is not used.
   * The same heap array is used to build all trees.
   */

  this.depth = new utils.Buf16(2*L_CODES+1); //uch depth[2*L_CODES+1];
  zero(this.depth);
  /* Depth of each subtree used as tie breaker for trees of equal frequency
   */

  this.l_buf = 0;          /* buffer index for literals or lengths */

  this.lit_bufsize = 0;
  /* Size of match buffer for literals/lengths.  There are 4 reasons for
   * limiting lit_bufsize to 64K:
   *   - frequencies can be kept in 16 bit counters
   *   - if compression is not successful for the first block, all input
   *     data is still in the window so we can still emit a stored block even
   *     when input comes from standard input.  (This can also be done for
   *     all blocks if lit_bufsize is not greater than 32K.)
   *   - if compression is not successful for a file smaller than 64K, we can
   *     even emit a stored file instead of a stored block (saving 5 bytes).
   *     This is applicable only for zip (not gzip or zlib).
   *   - creating new Huffman trees less frequently may not provide fast
   *     adaptation to changes in the input data statistics. (Take for
   *     example a binary file with poorly compressible code followed by
   *     a highly compressible string table.) Smaller buffer sizes give
   *     fast adaptation but have of course the overhead of transmitting
   *     trees more frequently.
   *   - I can't count above 4
   */

  this.last_lit = 0;      /* running index in l_buf */

  this.d_buf = 0;
  /* Buffer index for distances. To simplify the code, d_buf and l_buf have
   * the same number of elements. To use different lengths, an extra flag
   * array would be necessary.
   */

  this.opt_len = 0;       /* bit length of current block with optimal trees */
  this.static_len = 0;    /* bit length of current block with static trees */
  this.matches = 0;       /* number of string matches in current block */
  this.insert = 0;        /* bytes at end of window left to insert */


  this.bi_buf = 0;
  /* Output buffer. bits are inserted starting at the bottom (least
   * significant bits).
   */
  this.bi_valid = 0;
  /* Number of valid bits in bi_buf.  All bits above the last valid bit
   * are always zero.
   */

  // Used for window memory init. We safely ignore it for JS. That makes
  // sense only for pointers and memory check tools.
  //this.high_water = 0;
  /* High water mark offset in window for initialized bytes -- bytes above
   * this are set to zero in order to avoid memory check warnings when
   * longest match routines access bytes past the input.  This is then
   * updated to the new high water mark.
   */
}


function deflateResetKeep(strm) {
  var s;

  if (!strm || !strm.state) {
    return err(strm, Z_STREAM_ERROR);
  }

  strm.total_in = strm.total_out = 0;
  strm.data_type = Z_UNKNOWN;

  s = strm.state;
  s.pending = 0;
  s.pending_out = 0;

  if (s.wrap < 0) {
    s.wrap = -s.wrap;
    /* was made negative by deflate(..., Z_FINISH); */
  }
  s.status = (s.wrap ? INIT_STATE : BUSY_STATE);
  strm.adler = (s.wrap === 2) ?
    0  // crc32(0, Z_NULL, 0)
  :
    1; // adler32(0, Z_NULL, 0)
  s.last_flush = Z_NO_FLUSH;
  trees._tr_init(s);
  return Z_OK;
}


function deflateReset(strm) {
  var ret = deflateResetKeep(strm);
  if (ret === Z_OK) {
    lm_init(strm.state);
  }
  return ret;
}


function deflateSetHeader(strm, head) {
  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  if (strm.state.wrap !== 2) { return Z_STREAM_ERROR; }
  strm.state.gzhead = head;
  return Z_OK;
}


function deflateInit2(strm, level, method, windowBits, memLevel, strategy) {
  if (!strm) { // === Z_NULL
    return Z_STREAM_ERROR;
  }
  var wrap = 1;

  if (level === Z_DEFAULT_COMPRESSION) {
    level = 6;
  }

  if (windowBits < 0) { /* suppress zlib wrapper */
    wrap = 0;
    windowBits = -windowBits;
  }

  else if (windowBits > 15) {
    wrap = 2;           /* write gzip wrapper instead */
    windowBits -= 16;
  }


  if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED ||
    windowBits < 8 || windowBits > 15 || level < 0 || level > 9 ||
    strategy < 0 || strategy > Z_FIXED) {
    return err(strm, Z_STREAM_ERROR);
  }


  if (windowBits === 8) {
    windowBits = 9;
  }
  /* until 256-byte window bug fixed */

  var s = new DeflateState();

  strm.state = s;
  s.strm = strm;

  s.wrap = wrap;
  s.gzhead = null;
  s.w_bits = windowBits;
  s.w_size = 1 << s.w_bits;
  s.w_mask = s.w_size - 1;

  s.hash_bits = memLevel + 7;
  s.hash_size = 1 << s.hash_bits;
  s.hash_mask = s.hash_size - 1;
  s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);

  s.window = new utils.Buf8(s.w_size * 2);
  s.head = new utils.Buf16(s.hash_size);
  s.prev = new utils.Buf16(s.w_size);

  // Don't need mem init magic for JS.
  //s.high_water = 0;  /* nothing written to s->window yet */

  s.lit_bufsize = 1 << (memLevel + 6); /* 16K elements by default */

  s.pending_buf_size = s.lit_bufsize * 4;
  s.pending_buf = new utils.Buf8(s.pending_buf_size);

  s.d_buf = s.lit_bufsize >> 1;
  s.l_buf = (1 + 2) * s.lit_bufsize;

  s.level = level;
  s.strategy = strategy;
  s.method = method;

  return deflateReset(strm);
}

function deflateInit(strm, level) {
  return deflateInit2(strm, level, Z_DEFLATED, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY);
}


function deflate(strm, flush) {
  var old_flush, s;
  var beg, val; // for gzip header write only

  if (!strm || !strm.state ||
    flush > Z_BLOCK || flush < 0) {
    return strm ? err(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
  }

  s = strm.state;

  if (!strm.output ||
      (!strm.input && strm.avail_in !== 0) ||
      (s.status === FINISH_STATE && flush !== Z_FINISH)) {
    return err(strm, (strm.avail_out === 0) ? Z_BUF_ERROR : Z_STREAM_ERROR);
  }

  s.strm = strm; /* just in case */
  old_flush = s.last_flush;
  s.last_flush = flush;

  /* Write the header */
  if (s.status === INIT_STATE) {

    if (s.wrap === 2) { // GZIP header
      strm.adler = 0;  //crc32(0L, Z_NULL, 0);
      put_byte(s, 31);
      put_byte(s, 139);
      put_byte(s, 8);
      if (!s.gzhead) { // s->gzhead == Z_NULL
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, s.level === 9 ? 2 :
                    (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                     4 : 0));
        put_byte(s, OS_CODE);
        s.status = BUSY_STATE;
      }
      else {
        put_byte(s, (s.gzhead.text ? 1 : 0) +
                    (s.gzhead.hcrc ? 2 : 0) +
                    (!s.gzhead.extra ? 0 : 4) +
                    (!s.gzhead.name ? 0 : 8) +
                    (!s.gzhead.comment ? 0 : 16)
                );
        put_byte(s, s.gzhead.time & 0xff);
        put_byte(s, (s.gzhead.time >> 8) & 0xff);
        put_byte(s, (s.gzhead.time >> 16) & 0xff);
        put_byte(s, (s.gzhead.time >> 24) & 0xff);
        put_byte(s, s.level === 9 ? 2 :
                    (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                     4 : 0));
        put_byte(s, s.gzhead.os & 0xff);
        if (s.gzhead.extra && s.gzhead.extra.length) {
          put_byte(s, s.gzhead.extra.length & 0xff);
          put_byte(s, (s.gzhead.extra.length >> 8) & 0xff);
        }
        if (s.gzhead.hcrc) {
          strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
        }
        s.gzindex = 0;
        s.status = EXTRA_STATE;
      }
    }
    else // DEFLATE header
    {
      var header = (Z_DEFLATED + ((s.w_bits - 8) << 4)) << 8;
      var level_flags = -1;

      if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
        level_flags = 0;
      } else if (s.level < 6) {
        level_flags = 1;
      } else if (s.level === 6) {
        level_flags = 2;
      } else {
        level_flags = 3;
      }
      header |= (level_flags << 6);
      if (s.strstart !== 0) { header |= PRESET_DICT; }
      header += 31 - (header % 31);

      s.status = BUSY_STATE;
      putShortMSB(s, header);

      /* Save the adler32 of the preset dictionary: */
      if (s.strstart !== 0) {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 0xffff);
      }
      strm.adler = 1; // adler32(0L, Z_NULL, 0);
    }
  }

//#ifdef GZIP
  if (s.status === EXTRA_STATE) {
    if (s.gzhead.extra/* != Z_NULL*/) {
      beg = s.pending;  /* start of bytes to update crc */

      while (s.gzindex < (s.gzhead.extra.length & 0xffff)) {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            break;
          }
        }
        put_byte(s, s.gzhead.extra[s.gzindex] & 0xff);
        s.gzindex++;
      }
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (s.gzindex === s.gzhead.extra.length) {
        s.gzindex = 0;
        s.status = NAME_STATE;
      }
    }
    else {
      s.status = NAME_STATE;
    }
  }
  if (s.status === NAME_STATE) {
    if (s.gzhead.name/* != Z_NULL*/) {
      beg = s.pending;  /* start of bytes to update crc */
      //int val;

      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            val = 1;
            break;
          }
        }
        // JS specific: little magic to add zero terminator to end of string
        if (s.gzindex < s.gzhead.name.length) {
          val = s.gzhead.name.charCodeAt(s.gzindex++) & 0xff;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);

      if (s.gzhead.hcrc && s.pending > beg){
        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (val === 0) {
        s.gzindex = 0;
        s.status = COMMENT_STATE;
      }
    }
    else {
      s.status = COMMENT_STATE;
    }
  }
  if (s.status === COMMENT_STATE) {
    if (s.gzhead.comment/* != Z_NULL*/) {
      beg = s.pending;  /* start of bytes to update crc */
      //int val;

      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            val = 1;
            break;
          }
        }
        // JS specific: little magic to add zero terminator to end of string
        if (s.gzindex < s.gzhead.comment.length) {
          val = s.gzhead.comment.charCodeAt(s.gzindex++) & 0xff;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);

      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (val === 0) {
        s.status = HCRC_STATE;
      }
    }
    else {
      s.status = HCRC_STATE;
    }
  }
  if (s.status === HCRC_STATE) {
    if (s.gzhead.hcrc) {
      if (s.pending + 2 > s.pending_buf_size) {
        flush_pending(strm);
      }
      if (s.pending + 2 <= s.pending_buf_size) {
        put_byte(s, strm.adler & 0xff);
        put_byte(s, (strm.adler >> 8) & 0xff);
        strm.adler = 0; //crc32(0L, Z_NULL, 0);
        s.status = BUSY_STATE;
      }
    }
    else {
      s.status = BUSY_STATE;
    }
  }
//#endif

  /* Flush as much pending output as possible */
  if (s.pending !== 0) {
    flush_pending(strm);
    if (strm.avail_out === 0) {
      /* Since avail_out is 0, deflate will be called again with
       * more output space, but possibly with both pending and
       * avail_in equal to zero. There won't be anything to do,
       * but this is not an error situation so make sure we
       * return OK instead of BUF_ERROR at next call of deflate:
       */
      s.last_flush = -1;
      return Z_OK;
    }

    /* Make sure there is something to do and avoid duplicate consecutive
     * flushes. For repeated and useless calls with Z_FINISH, we keep
     * returning Z_STREAM_END instead of Z_BUF_ERROR.
     */
  } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) &&
    flush !== Z_FINISH) {
    return err(strm, Z_BUF_ERROR);
  }

  /* User must not provide more input after the first FINISH: */
  if (s.status === FINISH_STATE && strm.avail_in !== 0) {
    return err(strm, Z_BUF_ERROR);
  }

  /* Start a new block or continue the current one.
   */
  if (strm.avail_in !== 0 || s.lookahead !== 0 ||
    (flush !== Z_NO_FLUSH && s.status !== FINISH_STATE)) {
    var bstate = (s.strategy === Z_HUFFMAN_ONLY) ? deflate_huff(s, flush) :
      (s.strategy === Z_RLE ? deflate_rle(s, flush) :
        configuration_table[s.level].func(s, flush));

    if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
      s.status = FINISH_STATE;
    }
    if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
      if (strm.avail_out === 0) {
        s.last_flush = -1;
        /* avoid BUF_ERROR next call, see above */
      }
      return Z_OK;
      /* If flush != Z_NO_FLUSH && avail_out == 0, the next call
       * of deflate should use the same flush parameter to make sure
       * that the flush is complete. So we don't have to output an
       * empty block here, this will be done at next call. This also
       * ensures that for a very small output buffer, we emit at most
       * one empty block.
       */
    }
    if (bstate === BS_BLOCK_DONE) {
      if (flush === Z_PARTIAL_FLUSH) {
        trees._tr_align(s);
      }
      else if (flush !== Z_BLOCK) { /* FULL_FLUSH or SYNC_FLUSH */

        trees._tr_stored_block(s, 0, 0, false);
        /* For a full flush, this empty block will be recognized
         * as a special marker by inflate_sync().
         */
        if (flush === Z_FULL_FLUSH) {
          /*** CLEAR_HASH(s); ***/             /* forget history */
          zero(s.head); // Fill with NIL (= 0);

          if (s.lookahead === 0) {
            s.strstart = 0;
            s.block_start = 0;
            s.insert = 0;
          }
        }
      }
      flush_pending(strm);
      if (strm.avail_out === 0) {
        s.last_flush = -1; /* avoid BUF_ERROR at next call, see above */
        return Z_OK;
      }
    }
  }
  //Assert(strm->avail_out > 0, "bug2");
  //if (strm.avail_out <= 0) { throw new Error("bug2");}

  if (flush !== Z_FINISH) { return Z_OK; }
  if (s.wrap <= 0) { return Z_STREAM_END; }

  /* Write the trailer */
  if (s.wrap === 2) {
    put_byte(s, strm.adler & 0xff);
    put_byte(s, (strm.adler >> 8) & 0xff);
    put_byte(s, (strm.adler >> 16) & 0xff);
    put_byte(s, (strm.adler >> 24) & 0xff);
    put_byte(s, strm.total_in & 0xff);
    put_byte(s, (strm.total_in >> 8) & 0xff);
    put_byte(s, (strm.total_in >> 16) & 0xff);
    put_byte(s, (strm.total_in >> 24) & 0xff);
  }
  else
  {
    putShortMSB(s, strm.adler >>> 16);
    putShortMSB(s, strm.adler & 0xffff);
  }

  flush_pending(strm);
  /* If avail_out is zero, the application will call deflate again
   * to flush the rest.
   */
  if (s.wrap > 0) { s.wrap = -s.wrap; }
  /* write the trailer only once! */
  return s.pending !== 0 ? Z_OK : Z_STREAM_END;
}

function deflateEnd(strm) {
  var status;

  if (!strm/*== Z_NULL*/ || !strm.state/*== Z_NULL*/) {
    return Z_STREAM_ERROR;
  }

  status = strm.state.status;
  if (status !== INIT_STATE &&
    status !== EXTRA_STATE &&
    status !== NAME_STATE &&
    status !== COMMENT_STATE &&
    status !== HCRC_STATE &&
    status !== BUSY_STATE &&
    status !== FINISH_STATE
  ) {
    return err(strm, Z_STREAM_ERROR);
  }

  strm.state = null;

  return status === BUSY_STATE ? err(strm, Z_DATA_ERROR) : Z_OK;
}

/* =========================================================================
 * Copy the source state to the destination state
 */
//function deflateCopy(dest, source) {
//
//}

exports.deflateInit = deflateInit;
exports.deflateInit2 = deflateInit2;
exports.deflateReset = deflateReset;
exports.deflateResetKeep = deflateResetKeep;
exports.deflateSetHeader = deflateSetHeader;
exports.deflate = deflate;
exports.deflateEnd = deflateEnd;
exports.deflateInfo = 'pako deflate (from Nodeca project)';

/* Not implemented
exports.deflateBound = deflateBound;
exports.deflateCopy = deflateCopy;
exports.deflateSetDictionary = deflateSetDictionary;
exports.deflateParams = deflateParams;
exports.deflatePending = deflatePending;
exports.deflatePrime = deflatePrime;
exports.deflateTune = deflateTune;
*/
},{"../utils/common":77,"./adler32":78,"./crc32":80,"./messages":85,"./trees":86}],82:[function(require,module,exports){
'use strict';

// See state defs from inflate.js
var BAD = 30;       /* got a data error -- remain here until reset */
var TYPE = 12;      /* i: waiting for type bits, including last-flag bit */

/*
   Decode literal, length, and distance codes and write out the resulting
   literal and match bytes until either not enough input or output is
   available, an end-of-block is encountered, or a data error is encountered.
   When large enough input and output buffers are supplied to inflate(), for
   example, a 16K input buffer and a 64K output buffer, more than 95% of the
   inflate execution time is spent in this routine.

   Entry assumptions:

        state.mode === LEN
        strm.avail_in >= 6
        strm.avail_out >= 258
        start >= strm.avail_out
        state.bits < 8

   On return, state.mode is one of:

        LEN -- ran out of enough output space or enough available input
        TYPE -- reached end of block code, inflate() to interpret next block
        BAD -- error in block data

   Notes:

    - The maximum input bits used by a length/distance pair is 15 bits for the
      length code, 5 bits for the length extra, 15 bits for the distance code,
      and 13 bits for the distance extra.  This totals 48 bits, or six bytes.
      Therefore if strm.avail_in >= 6, then there is enough input to avoid
      checking for available input while decoding.

    - The maximum bytes that a single length/distance pair can output is 258
      bytes, which is the maximum length that can be coded.  inflate_fast()
      requires strm.avail_out >= 258 for each loop to avoid checking for
      output space.
 */
module.exports = function inflate_fast(strm, start) {
  var state;
  var _in;                    /* local strm.input */
  var last;                   /* have enough input while in < last */
  var _out;                   /* local strm.output */
  var beg;                    /* inflate()'s initial strm.output */
  var end;                    /* while out < end, enough space available */
//#ifdef INFLATE_STRICT
  var dmax;                   /* maximum distance from zlib header */
//#endif
  var wsize;                  /* window size or zero if not using window */
  var whave;                  /* valid bytes in the window */
  var wnext;                  /* window write index */
  var window;                 /* allocated sliding window, if wsize != 0 */
  var hold;                   /* local strm.hold */
  var bits;                   /* local strm.bits */
  var lcode;                  /* local strm.lencode */
  var dcode;                  /* local strm.distcode */
  var lmask;                  /* mask for first level of length codes */
  var dmask;                  /* mask for first level of distance codes */
  var here;                   /* retrieved table entry */
  var op;                     /* code bits, operation, extra bits, or */
                              /*  window position, window bytes to copy */
  var len;                    /* match length, unused bytes */
  var dist;                   /* match distance */
  var from;                   /* where to copy match from */
  var from_source;


  var input, output; // JS specific, because we have no pointers

  /* copy state to local variables */
  state = strm.state;
  //here = state.here;
  _in = strm.next_in;
  input = strm.input;
  last = _in + (strm.avail_in - 5);
  _out = strm.next_out;
  output = strm.output;
  beg = _out - (start - strm.avail_out);
  end = _out + (strm.avail_out - 257);
//#ifdef INFLATE_STRICT
  dmax = state.dmax;
//#endif
  wsize = state.wsize;
  whave = state.whave;
  wnext = state.wnext;
  window = state.window;
  hold = state.hold;
  bits = state.bits;
  lcode = state.lencode;
  dcode = state.distcode;
  lmask = (1 << state.lenbits) - 1;
  dmask = (1 << state.distbits) - 1;


  /* decode literals and length/distances until end-of-block or not enough
     input data or output space */

  top:
  do {
    if (bits < 15) {
      hold += input[_in++] << bits;
      bits += 8;
      hold += input[_in++] << bits;
      bits += 8;
    }

    here = lcode[hold & lmask];

    dolen:
    for (;;) { // Goto emulation
      op = here >>> 24/*here.bits*/;
      hold >>>= op;
      bits -= op;
      op = (here >>> 16) & 0xff/*here.op*/;
      if (op === 0) {                          /* literal */
        //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
        //        "inflate:         literal '%c'\n" :
        //        "inflate:         literal 0x%02x\n", here.val));
        output[_out++] = here & 0xffff/*here.val*/;
      }
      else if (op & 16) {                     /* length base */
        len = here & 0xffff/*here.val*/;
        op &= 15;                           /* number of extra bits */
        if (op) {
          if (bits < op) {
            hold += input[_in++] << bits;
            bits += 8;
          }
          len += hold & ((1 << op) - 1);
          hold >>>= op;
          bits -= op;
        }
        //Tracevv((stderr, "inflate:         length %u\n", len));
        if (bits < 15) {
          hold += input[_in++] << bits;
          bits += 8;
          hold += input[_in++] << bits;
          bits += 8;
        }
        here = dcode[hold & dmask];

        dodist:
        for (;;) { // goto emulation
          op = here >>> 24/*here.bits*/;
          hold >>>= op;
          bits -= op;
          op = (here >>> 16) & 0xff/*here.op*/;

          if (op & 16) {                      /* distance base */
            dist = here & 0xffff/*here.val*/;
            op &= 15;                       /* number of extra bits */
            if (bits < op) {
              hold += input[_in++] << bits;
              bits += 8;
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
            }
            dist += hold & ((1 << op) - 1);
//#ifdef INFLATE_STRICT
            if (dist > dmax) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD;
              break top;
            }
//#endif
            hold >>>= op;
            bits -= op;
            //Tracevv((stderr, "inflate:         distance %u\n", dist));
            op = _out - beg;                /* max distance in output */
            if (dist > op) {                /* see if copy from window */
              op = dist - op;               /* distance back in window */
              if (op > whave) {
                if (state.sane) {
                  strm.msg = 'invalid distance too far back';
                  state.mode = BAD;
                  break top;
                }

// (!) This block is disabled in zlib defailts,
// don't enable it for binary compatibility
//#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
//                if (len <= op - whave) {
//                  do {
//                    output[_out++] = 0;
//                  } while (--len);
//                  continue top;
//                }
//                len -= op - whave;
//                do {
//                  output[_out++] = 0;
//                } while (--op > whave);
//                if (op === 0) {
//                  from = _out - dist;
//                  do {
//                    output[_out++] = output[from++];
//                  } while (--len);
//                  continue top;
//                }
//#endif
              }
              from = 0; // window index
              from_source = window;
              if (wnext === 0) {           /* very common case */
                from += wsize - op;
                if (op < len) {         /* some from window */
                  len -= op;
                  do {
                    output[_out++] = window[from++];
                  } while (--op);
                  from = _out - dist;  /* rest from output */
                  from_source = output;
                }
              }
              else if (wnext < op) {      /* wrap around window */
                from += wsize + wnext - op;
                op -= wnext;
                if (op < len) {         /* some from end of window */
                  len -= op;
                  do {
                    output[_out++] = window[from++];
                  } while (--op);
                  from = 0;
                  if (wnext < len) {  /* some from start of window */
                    op = wnext;
                    len -= op;
                    do {
                      output[_out++] = window[from++];
                    } while (--op);
                    from = _out - dist;      /* rest from output */
                    from_source = output;
                  }
                }
              }
              else {                      /* contiguous in window */
                from += wnext - op;
                if (op < len) {         /* some from window */
                  len -= op;
                  do {
                    output[_out++] = window[from++];
                  } while (--op);
                  from = _out - dist;  /* rest from output */
                  from_source = output;
                }
              }
              while (len > 2) {
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                len -= 3;
              }
              if (len) {
                output[_out++] = from_source[from++];
                if (len > 1) {
                  output[_out++] = from_source[from++];
                }
              }
            }
            else {
              from = _out - dist;          /* copy direct from output */
              do {                        /* minimum length is three */
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                len -= 3;
              } while (len > 2);
              if (len) {
                output[_out++] = output[from++];
                if (len > 1) {
                  output[_out++] = output[from++];
                }
              }
            }
          }
          else if ((op & 64) === 0) {          /* 2nd level distance code */
            here = dcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
            continue dodist;
          }
          else {
            strm.msg = 'invalid distance code';
            state.mode = BAD;
            break top;
          }

          break; // need to emulate goto via "continue"
        }
      }
      else if ((op & 64) === 0) {              /* 2nd level length code */
        here = lcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
        continue dolen;
      }
      else if (op & 32) {                     /* end-of-block */
        //Tracevv((stderr, "inflate:         end of block\n"));
        state.mode = TYPE;
        break top;
      }
      else {
        strm.msg = 'invalid literal/length code';
        state.mode = BAD;
        break top;
      }

      break; // need to emulate goto via "continue"
    }
  } while (_in < last && _out < end);

  /* return unused bytes (on entry, bits < 8, so in won't go too far back) */
  len = bits >> 3;
  _in -= len;
  bits -= len << 3;
  hold &= (1 << bits) - 1;

  /* update state and return */
  strm.next_in = _in;
  strm.next_out = _out;
  strm.avail_in = (_in < last ? 5 + (last - _in) : 5 - (_in - last));
  strm.avail_out = (_out < end ? 257 + (end - _out) : 257 - (_out - end));
  state.hold = hold;
  state.bits = bits;
  return;
};

},{}],83:[function(require,module,exports){
'use strict';


var utils = require('../utils/common');
var adler32 = require('./adler32');
var crc32   = require('./crc32');
var inflate_fast = require('./inffast');
var inflate_table = require('./inftrees');

var CODES = 0;
var LENS = 1;
var DISTS = 2;

/* Public constants ==========================================================*/
/* ===========================================================================*/


/* Allowed flush values; see deflate() and inflate() below for details */
//var Z_NO_FLUSH      = 0;
//var Z_PARTIAL_FLUSH = 1;
//var Z_SYNC_FLUSH    = 2;
//var Z_FULL_FLUSH    = 3;
var Z_FINISH        = 4;
var Z_BLOCK         = 5;
var Z_TREES         = 6;


/* Return codes for the compression/decompression functions. Negative values
 * are errors, positive values are used for special but normal events.
 */
var Z_OK            = 0;
var Z_STREAM_END    = 1;
var Z_NEED_DICT     = 2;
//var Z_ERRNO         = -1;
var Z_STREAM_ERROR  = -2;
var Z_DATA_ERROR    = -3;
var Z_MEM_ERROR     = -4;
var Z_BUF_ERROR     = -5;
//var Z_VERSION_ERROR = -6;

/* The deflate compression method */
var Z_DEFLATED  = 8;


/* STATES ====================================================================*/
/* ===========================================================================*/


var    HEAD = 1;       /* i: waiting for magic header */
var    FLAGS = 2;      /* i: waiting for method and flags (gzip) */
var    TIME = 3;       /* i: waiting for modification time (gzip) */
var    OS = 4;         /* i: waiting for extra flags and operating system (gzip) */
var    EXLEN = 5;      /* i: waiting for extra length (gzip) */
var    EXTRA = 6;      /* i: waiting for extra bytes (gzip) */
var    NAME = 7;       /* i: waiting for end of file name (gzip) */
var    COMMENT = 8;    /* i: waiting for end of comment (gzip) */
var    HCRC = 9;       /* i: waiting for header crc (gzip) */
var    DICTID = 10;    /* i: waiting for dictionary check value */
var    DICT = 11;      /* waiting for inflateSetDictionary() call */
var        TYPE = 12;      /* i: waiting for type bits, including last-flag bit */
var        TYPEDO = 13;    /* i: same, but skip check to exit inflate on new block */
var        STORED = 14;    /* i: waiting for stored size (length and complement) */
var        COPY_ = 15;     /* i/o: same as COPY below, but only first time in */
var        COPY = 16;      /* i/o: waiting for input or output to copy stored block */
var        TABLE = 17;     /* i: waiting for dynamic block table lengths */
var        LENLENS = 18;   /* i: waiting for code length code lengths */
var        CODELENS = 19;  /* i: waiting for length/lit and distance code lengths */
var            LEN_ = 20;      /* i: same as LEN below, but only first time in */
var            LEN = 21;       /* i: waiting for length/lit/eob code */
var            LENEXT = 22;    /* i: waiting for length extra bits */
var            DIST = 23;      /* i: waiting for distance code */
var            DISTEXT = 24;   /* i: waiting for distance extra bits */
var            MATCH = 25;     /* o: waiting for output space to copy string */
var            LIT = 26;       /* o: waiting for output space to write literal */
var    CHECK = 27;     /* i: waiting for 32-bit check value */
var    LENGTH = 28;    /* i: waiting for 32-bit length (gzip) */
var    DONE = 29;      /* finished check, done -- remain here until reset */
var    BAD = 30;       /* got a data error -- remain here until reset */
var    MEM = 31;       /* got an inflate() memory error -- remain here until reset */
var    SYNC = 32;      /* looking for synchronization bytes to restart inflate() */

/* ===========================================================================*/



var ENOUGH_LENS = 852;
var ENOUGH_DISTS = 592;
//var ENOUGH =  (ENOUGH_LENS+ENOUGH_DISTS);

var MAX_WBITS = 15;
/* 32K LZ77 window */
var DEF_WBITS = MAX_WBITS;


function ZSWAP32(q) {
  return  (((q >>> 24) & 0xff) +
          ((q >>> 8) & 0xff00) +
          ((q & 0xff00) << 8) +
          ((q & 0xff) << 24));
}


function InflateState() {
  this.mode = 0;             /* current inflate mode */
  this.last = false;          /* true if processing last block */
  this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
  this.havedict = false;      /* true if dictionary provided */
  this.flags = 0;             /* gzip header method and flags (0 if zlib) */
  this.dmax = 0;              /* zlib header max distance (INFLATE_STRICT) */
  this.check = 0;             /* protected copy of check value */
  this.total = 0;             /* protected copy of output count */
  // TODO: may be {}
  this.head = null;           /* where to save gzip header information */

  /* sliding window */
  this.wbits = 0;             /* log base 2 of requested window size */
  this.wsize = 0;             /* window size or zero if not using window */
  this.whave = 0;             /* valid bytes in the window */
  this.wnext = 0;             /* window write index */
  this.window = null;         /* allocated sliding window, if needed */

  /* bit accumulator */
  this.hold = 0;              /* input bit accumulator */
  this.bits = 0;              /* number of bits in "in" */

  /* for string and stored block copying */
  this.length = 0;            /* literal or length of data to copy */
  this.offset = 0;            /* distance back to copy string from */

  /* for table and code decoding */
  this.extra = 0;             /* extra bits needed */

  /* fixed and dynamic code tables */
  this.lencode = null;          /* starting table for length/literal codes */
  this.distcode = null;         /* starting table for distance codes */
  this.lenbits = 0;           /* index bits for lencode */
  this.distbits = 0;          /* index bits for distcode */

  /* dynamic table building */
  this.ncode = 0;             /* number of code length code lengths */
  this.nlen = 0;              /* number of length code lengths */
  this.ndist = 0;             /* number of distance code lengths */
  this.have = 0;              /* number of code lengths in lens[] */
  this.next = null;              /* next available space in codes[] */

  this.lens = new utils.Buf16(320); /* temporary storage for code lengths */
  this.work = new utils.Buf16(288); /* work area for code table building */

  /*
   because we don't have pointers in js, we use lencode and distcode directly
   as buffers so we don't need codes
  */
  //this.codes = new utils.Buf32(ENOUGH);       /* space for code tables */
  this.lendyn = null;              /* dynamic table for length/literal codes (JS specific) */
  this.distdyn = null;             /* dynamic table for distance codes (JS specific) */
  this.sane = 0;                   /* if false, allow invalid distance too far */
  this.back = 0;                   /* bits back of last unprocessed length/lit */
  this.was = 0;                    /* initial length of match */
}

function inflateResetKeep(strm) {
  var state;

  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;
  strm.total_in = strm.total_out = state.total = 0;
  strm.msg = ''; /*Z_NULL*/
  if (state.wrap) {       /* to support ill-conceived Java test suite */
    strm.adler = state.wrap & 1;
  }
  state.mode = HEAD;
  state.last = 0;
  state.havedict = 0;
  state.dmax = 32768;
  state.head = null/*Z_NULL*/;
  state.hold = 0;
  state.bits = 0;
  //state.lencode = state.distcode = state.next = state.codes;
  state.lencode = state.lendyn = new utils.Buf32(ENOUGH_LENS);
  state.distcode = state.distdyn = new utils.Buf32(ENOUGH_DISTS);

  state.sane = 1;
  state.back = -1;
  //Tracev((stderr, "inflate: reset\n"));
  return Z_OK;
}

function inflateReset(strm) {
  var state;

  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;
  state.wsize = 0;
  state.whave = 0;
  state.wnext = 0;
  return inflateResetKeep(strm);

}

function inflateReset2(strm, windowBits) {
  var wrap;
  var state;

  /* get the state */
  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;

  /* extract wrap request from windowBits parameter */
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  }
  else {
    wrap = (windowBits >> 4) + 1;
    if (windowBits < 48) {
      windowBits &= 15;
    }
  }

  /* set number of window bits, free window if different */
  if (windowBits && (windowBits < 8 || windowBits > 15)) {
    return Z_STREAM_ERROR;
  }
  if (state.window !== null && state.wbits !== windowBits) {
    state.window = null;
  }

  /* update state and reset the rest of it */
  state.wrap = wrap;
  state.wbits = windowBits;
  return inflateReset(strm);
}

function inflateInit2(strm, windowBits) {
  var ret;
  var state;

  if (!strm) { return Z_STREAM_ERROR; }
  //strm.msg = Z_NULL;                 /* in case we return an error */

  state = new InflateState();

  //if (state === Z_NULL) return Z_MEM_ERROR;
  //Tracev((stderr, "inflate: allocated\n"));
  strm.state = state;
  state.window = null/*Z_NULL*/;
  ret = inflateReset2(strm, windowBits);
  if (ret !== Z_OK) {
    strm.state = null/*Z_NULL*/;
  }
  return ret;
}

function inflateInit(strm) {
  return inflateInit2(strm, DEF_WBITS);
}


/*
 Return state with length and distance decoding tables and index sizes set to
 fixed code decoding.  Normally this returns fixed tables from inffixed.h.
 If BUILDFIXED is defined, then instead this routine builds the tables the
 first time it's called, and returns those tables the first time and
 thereafter.  This reduces the size of the code by about 2K bytes, in
 exchange for a little execution time.  However, BUILDFIXED should not be
 used for threaded applications, since the rewriting of the tables and virgin
 may not be thread-safe.
 */
var virgin = true;

var lenfix, distfix; // We have no pointers in JS, so keep tables separate

function fixedtables(state) {
  /* build fixed huffman tables if first call (may not be thread safe) */
  if (virgin) {
    var sym;

    lenfix = new utils.Buf32(512);
    distfix = new utils.Buf32(32);

    /* literal/length table */
    sym = 0;
    while (sym < 144) { state.lens[sym++] = 8; }
    while (sym < 256) { state.lens[sym++] = 9; }
    while (sym < 280) { state.lens[sym++] = 7; }
    while (sym < 288) { state.lens[sym++] = 8; }

    inflate_table(LENS,  state.lens, 0, 288, lenfix,   0, state.work, {bits: 9});

    /* distance table */
    sym = 0;
    while (sym < 32) { state.lens[sym++] = 5; }

    inflate_table(DISTS, state.lens, 0, 32,   distfix, 0, state.work, {bits: 5});

    /* do this just once */
    virgin = false;
  }

  state.lencode = lenfix;
  state.lenbits = 9;
  state.distcode = distfix;
  state.distbits = 5;
}


/*
 Update the window with the last wsize (normally 32K) bytes written before
 returning.  If window does not exist yet, create it.  This is only called
 when a window is already in use, or when output has been written during this
 inflate call, but the end of the deflate stream has not been reached yet.
 It is also called to create a window for dictionary data when a dictionary
 is loaded.

 Providing output buffers larger than 32K to inflate() should provide a speed
 advantage, since only the last 32K of output is copied to the sliding window
 upon return from inflate(), and since all distances after the first 32K of
 output will fall in the output data, making match copies simpler and faster.
 The advantage may be dependent on the size of the processor's data caches.
 */
function updatewindow(strm, src, end, copy) {
  var dist;
  var state = strm.state;

  /* if it hasn't been done already, allocate space for the window */
  if (state.window === null) {
    state.wsize = 1 << state.wbits;
    state.wnext = 0;
    state.whave = 0;

    state.window = new utils.Buf8(state.wsize);
  }

  /* copy state->wsize or less output bytes into the circular window */
  if (copy >= state.wsize) {
    utils.arraySet(state.window,src, end - state.wsize, state.wsize, 0);
    state.wnext = 0;
    state.whave = state.wsize;
  }
  else {
    dist = state.wsize - state.wnext;
    if (dist > copy) {
      dist = copy;
    }
    //zmemcpy(state->window + state->wnext, end - copy, dist);
    utils.arraySet(state.window,src, end - copy, dist, state.wnext);
    copy -= dist;
    if (copy) {
      //zmemcpy(state->window, end - copy, copy);
      utils.arraySet(state.window,src, end - copy, copy, 0);
      state.wnext = copy;
      state.whave = state.wsize;
    }
    else {
      state.wnext += dist;
      if (state.wnext === state.wsize) { state.wnext = 0; }
      if (state.whave < state.wsize) { state.whave += dist; }
    }
  }
  return 0;
}

function inflate(strm, flush) {
  var state;
  var input, output;          // input/output buffers
  var next;                   /* next input INDEX */
  var put;                    /* next output INDEX */
  var have, left;             /* available input and output */
  var hold;                   /* bit buffer */
  var bits;                   /* bits in bit buffer */
  var _in, _out;              /* save starting available input and output */
  var copy;                   /* number of stored or match bytes to copy */
  var from;                   /* where to copy match bytes from */
  var from_source;
  var here = 0;               /* current decoding table entry */
  var here_bits, here_op, here_val; // paked "here" denormalized (JS specific)
  //var last;                   /* parent table entry */
  var last_bits, last_op, last_val; // paked "last" denormalized (JS specific)
  var len;                    /* length to copy for repeats, bits to drop */
  var ret;                    /* return code */
  var hbuf = new utils.Buf8(4);    /* buffer for gzip header crc calculation */
  var opts;

  var n; // temporary var for NEED_BITS

  var order = /* permutation of code lengths */
    [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];


  if (!strm || !strm.state || !strm.output ||
      (!strm.input && strm.avail_in !== 0)) {
    return Z_STREAM_ERROR;
  }

  state = strm.state;
  if (state.mode === TYPE) { state.mode = TYPEDO; }    /* skip check */


  //--- LOAD() ---
  put = strm.next_out;
  output = strm.output;
  left = strm.avail_out;
  next = strm.next_in;
  input = strm.input;
  have = strm.avail_in;
  hold = state.hold;
  bits = state.bits;
  //---

  _in = have;
  _out = left;
  ret = Z_OK;

  inf_leave: // goto emulation
  for (;;) {
    switch (state.mode) {
    case HEAD:
      if (state.wrap === 0) {
        state.mode = TYPEDO;
        break;
      }
      //=== NEEDBITS(16);
      while (bits < 16) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      if ((state.wrap & 2) && hold === 0x8b1f) {  /* gzip header */
        state.check = 0/*crc32(0L, Z_NULL, 0)*/;
        //=== CRC2(state.check, hold);
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        state.check = crc32(state.check, hbuf, 2, 0);
        //===//

        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        state.mode = FLAGS;
        break;
      }
      state.flags = 0;           /* expect zlib header */
      if (state.head) {
        state.head.done = false;
      }
      if (!(state.wrap & 1) ||   /* check if zlib header allowed */
        (((hold & 0xff)/*BITS(8)*/ << 8) + (hold >> 8)) % 31) {
        strm.msg = 'incorrect header check';
        state.mode = BAD;
        break;
      }
      if ((hold & 0x0f)/*BITS(4)*/ !== Z_DEFLATED) {
        strm.msg = 'unknown compression method';
        state.mode = BAD;
        break;
      }
      //--- DROPBITS(4) ---//
      hold >>>= 4;
      bits -= 4;
      //---//
      len = (hold & 0x0f)/*BITS(4)*/ + 8;
      if (state.wbits === 0) {
        state.wbits = len;
      }
      else if (len > state.wbits) {
        strm.msg = 'invalid window size';
        state.mode = BAD;
        break;
      }
      state.dmax = 1 << len;
      //Tracev((stderr, "inflate:   zlib header ok\n"));
      strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
      state.mode = hold & 0x200 ? DICTID : TYPE;
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      break;
    case FLAGS:
      //=== NEEDBITS(16); */
      while (bits < 16) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      state.flags = hold;
      if ((state.flags & 0xff) !== Z_DEFLATED) {
        strm.msg = 'unknown compression method';
        state.mode = BAD;
        break;
      }
      if (state.flags & 0xe000) {
        strm.msg = 'unknown header flags set';
        state.mode = BAD;
        break;
      }
      if (state.head) {
        state.head.text = ((hold >> 8) & 1);
      }
      if (state.flags & 0x0200) {
        //=== CRC2(state.check, hold);
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        state.check = crc32(state.check, hbuf, 2, 0);
        //===//
      }
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = TIME;
      /* falls through */
    case TIME:
      //=== NEEDBITS(32); */
      while (bits < 32) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      if (state.head) {
        state.head.time = hold;
      }
      if (state.flags & 0x0200) {
        //=== CRC4(state.check, hold)
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        hbuf[2] = (hold >>> 16) & 0xff;
        hbuf[3] = (hold >>> 24) & 0xff;
        state.check = crc32(state.check, hbuf, 4, 0);
        //===
      }
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = OS;
      /* falls through */
    case OS:
      //=== NEEDBITS(16); */
      while (bits < 16) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      if (state.head) {
        state.head.xflags = (hold & 0xff);
        state.head.os = (hold >> 8);
      }
      if (state.flags & 0x0200) {
        //=== CRC2(state.check, hold);
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        state.check = crc32(state.check, hbuf, 2, 0);
        //===//
      }
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = EXLEN;
      /* falls through */
    case EXLEN:
      if (state.flags & 0x0400) {
        //=== NEEDBITS(16); */
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.length = hold;
        if (state.head) {
          state.head.extra_len = hold;
        }
        if (state.flags & 0x0200) {
          //=== CRC2(state.check, hold);
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          state.check = crc32(state.check, hbuf, 2, 0);
          //===//
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
      }
      else if (state.head) {
        state.head.extra = null/*Z_NULL*/;
      }
      state.mode = EXTRA;
      /* falls through */
    case EXTRA:
      if (state.flags & 0x0400) {
        copy = state.length;
        if (copy > have) { copy = have; }
        if (copy) {
          if (state.head) {
            len = state.head.extra_len - state.length;
            if (!state.head.extra) {
              // Use untyped array for more conveniend processing later
              state.head.extra = new Array(state.head.extra_len);
            }
            utils.arraySet(
              state.head.extra,
              input,
              next,
              // extra field is limited to 65536 bytes
              // - no need for additional size check
              copy,
              /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
              len
            );
            //zmemcpy(state.head.extra + len, next,
            //        len + copy > state.head.extra_max ?
            //        state.head.extra_max - len : copy);
          }
          if (state.flags & 0x0200) {
            state.check = crc32(state.check, input, copy, next);
          }
          have -= copy;
          next += copy;
          state.length -= copy;
        }
        if (state.length) { break inf_leave; }
      }
      state.length = 0;
      state.mode = NAME;
      /* falls through */
    case NAME:
      if (state.flags & 0x0800) {
        if (have === 0) { break inf_leave; }
        copy = 0;
        do {
          // TODO: 2 or 1 bytes?
          len = input[next + copy++];
          /* use constant limit because in js we should not preallocate memory */
          if (state.head && len &&
              (state.length < 65536 /*state.head.name_max*/)) {
            state.head.name += String.fromCharCode(len);
          }
        } while (len && copy < have);

        if (state.flags & 0x0200) {
          state.check = crc32(state.check, input, copy, next);
        }
        have -= copy;
        next += copy;
        if (len) { break inf_leave; }
      }
      else if (state.head) {
        state.head.name = null;
      }
      state.length = 0;
      state.mode = COMMENT;
      /* falls through */
    case COMMENT:
      if (state.flags & 0x1000) {
        if (have === 0) { break inf_leave; }
        copy = 0;
        do {
          len = input[next + copy++];
          /* use constant limit because in js we should not preallocate memory */
          if (state.head && len &&
              (state.length < 65536 /*state.head.comm_max*/)) {
            state.head.comment += String.fromCharCode(len);
          }
        } while (len && copy < have);
        if (state.flags & 0x0200) {
          state.check = crc32(state.check, input, copy, next);
        }
        have -= copy;
        next += copy;
        if (len) { break inf_leave; }
      }
      else if (state.head) {
        state.head.comment = null;
      }
      state.mode = HCRC;
      /* falls through */
    case HCRC:
      if (state.flags & 0x0200) {
        //=== NEEDBITS(16); */
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        if (hold !== (state.check & 0xffff)) {
          strm.msg = 'header crc mismatch';
          state.mode = BAD;
          break;
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
      }
      if (state.head) {
        state.head.hcrc = ((state.flags >> 9) & 1);
        state.head.done = true;
      }
      strm.adler = state.check = 0 /*crc32(0L, Z_NULL, 0)*/;
      state.mode = TYPE;
      break;
    case DICTID:
      //=== NEEDBITS(32); */
      while (bits < 32) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      strm.adler = state.check = ZSWAP32(hold);
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = DICT;
      /* falls through */
    case DICT:
      if (state.havedict === 0) {
        //--- RESTORE() ---
        strm.next_out = put;
        strm.avail_out = left;
        strm.next_in = next;
        strm.avail_in = have;
        state.hold = hold;
        state.bits = bits;
        //---
        return Z_NEED_DICT;
      }
      strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
      state.mode = TYPE;
      /* falls through */
    case TYPE:
      if (flush === Z_BLOCK || flush === Z_TREES) { break inf_leave; }
      /* falls through */
    case TYPEDO:
      if (state.last) {
        //--- BYTEBITS() ---//
        hold >>>= bits & 7;
        bits -= bits & 7;
        //---//
        state.mode = CHECK;
        break;
      }
      //=== NEEDBITS(3); */
      while (bits < 3) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      state.last = (hold & 0x01)/*BITS(1)*/;
      //--- DROPBITS(1) ---//
      hold >>>= 1;
      bits -= 1;
      //---//

      switch ((hold & 0x03)/*BITS(2)*/) {
      case 0:                             /* stored block */
        //Tracev((stderr, "inflate:     stored block%s\n",
        //        state.last ? " (last)" : ""));
        state.mode = STORED;
        break;
      case 1:                             /* fixed block */
        fixedtables(state);
        //Tracev((stderr, "inflate:     fixed codes block%s\n",
        //        state.last ? " (last)" : ""));
        state.mode = LEN_;             /* decode codes */
        if (flush === Z_TREES) {
          //--- DROPBITS(2) ---//
          hold >>>= 2;
          bits -= 2;
          //---//
          break inf_leave;
        }
        break;
      case 2:                             /* dynamic block */
        //Tracev((stderr, "inflate:     dynamic codes block%s\n",
        //        state.last ? " (last)" : ""));
        state.mode = TABLE;
        break;
      case 3:
        strm.msg = 'invalid block type';
        state.mode = BAD;
      }
      //--- DROPBITS(2) ---//
      hold >>>= 2;
      bits -= 2;
      //---//
      break;
    case STORED:
      //--- BYTEBITS() ---// /* go to byte boundary */
      hold >>>= bits & 7;
      bits -= bits & 7;
      //---//
      //=== NEEDBITS(32); */
      while (bits < 32) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      if ((hold & 0xffff) !== ((hold >>> 16) ^ 0xffff)) {
        strm.msg = 'invalid stored block lengths';
        state.mode = BAD;
        break;
      }
      state.length = hold & 0xffff;
      //Tracev((stderr, "inflate:       stored length %u\n",
      //        state.length));
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = COPY_;
      if (flush === Z_TREES) { break inf_leave; }
      /* falls through */
    case COPY_:
      state.mode = COPY;
      /* falls through */
    case COPY:
      copy = state.length;
      if (copy) {
        if (copy > have) { copy = have; }
        if (copy > left) { copy = left; }
        if (copy === 0) { break inf_leave; }
        //--- zmemcpy(put, next, copy); ---
        utils.arraySet(output, input, next, copy, put);
        //---//
        have -= copy;
        next += copy;
        left -= copy;
        put += copy;
        state.length -= copy;
        break;
      }
      //Tracev((stderr, "inflate:       stored end\n"));
      state.mode = TYPE;
      break;
    case TABLE:
      //=== NEEDBITS(14); */
      while (bits < 14) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      state.nlen = (hold & 0x1f)/*BITS(5)*/ + 257;
      //--- DROPBITS(5) ---//
      hold >>>= 5;
      bits -= 5;
      //---//
      state.ndist = (hold & 0x1f)/*BITS(5)*/ + 1;
      //--- DROPBITS(5) ---//
      hold >>>= 5;
      bits -= 5;
      //---//
      state.ncode = (hold & 0x0f)/*BITS(4)*/ + 4;
      //--- DROPBITS(4) ---//
      hold >>>= 4;
      bits -= 4;
      //---//
//#ifndef PKZIP_BUG_WORKAROUND
      if (state.nlen > 286 || state.ndist > 30) {
        strm.msg = 'too many length or distance symbols';
        state.mode = BAD;
        break;
      }
//#endif
      //Tracev((stderr, "inflate:       table sizes ok\n"));
      state.have = 0;
      state.mode = LENLENS;
      /* falls through */
    case LENLENS:
      while (state.have < state.ncode) {
        //=== NEEDBITS(3);
        while (bits < 3) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.lens[order[state.have++]] = (hold & 0x07);//BITS(3);
        //--- DROPBITS(3) ---//
        hold >>>= 3;
        bits -= 3;
        //---//
      }
      while (state.have < 19) {
        state.lens[order[state.have++]] = 0;
      }
      // We have separate tables & no pointers. 2 commented lines below not needed.
      //state.next = state.codes;
      //state.lencode = state.next;
      // Switch to use dynamic table
      state.lencode = state.lendyn;
      state.lenbits = 7;

      opts = {bits: state.lenbits};
      ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
      state.lenbits = opts.bits;

      if (ret) {
        strm.msg = 'invalid code lengths set';
        state.mode = BAD;
        break;
      }
      //Tracev((stderr, "inflate:       code lengths ok\n"));
      state.have = 0;
      state.mode = CODELENS;
      /* falls through */
    case CODELENS:
      while (state.have < state.nlen + state.ndist) {
        for (;;) {
          here = state.lencode[hold & ((1 << state.lenbits) - 1)];/*BITS(state.lenbits)*/
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((here_bits) <= bits) { break; }
          //--- PULLBYTE() ---//
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
          //---//
        }
        if (here_val < 16) {
          //--- DROPBITS(here.bits) ---//
          hold >>>= here_bits;
          bits -= here_bits;
          //---//
          state.lens[state.have++] = here_val;
        }
        else {
          if (here_val === 16) {
            //=== NEEDBITS(here.bits + 2);
            n = here_bits + 2;
            while (bits < n) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            if (state.have === 0) {
              strm.msg = 'invalid bit length repeat';
              state.mode = BAD;
              break;
            }
            len = state.lens[state.have - 1];
            copy = 3 + (hold & 0x03);//BITS(2);
            //--- DROPBITS(2) ---//
            hold >>>= 2;
            bits -= 2;
            //---//
          }
          else if (here_val === 17) {
            //=== NEEDBITS(here.bits + 3);
            n = here_bits + 3;
            while (bits < n) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            len = 0;
            copy = 3 + (hold & 0x07);//BITS(3);
            //--- DROPBITS(3) ---//
            hold >>>= 3;
            bits -= 3;
            //---//
          }
          else {
            //=== NEEDBITS(here.bits + 7);
            n = here_bits + 7;
            while (bits < n) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            len = 0;
            copy = 11 + (hold & 0x7f);//BITS(7);
            //--- DROPBITS(7) ---//
            hold >>>= 7;
            bits -= 7;
            //---//
          }
          if (state.have + copy > state.nlen + state.ndist) {
            strm.msg = 'invalid bit length repeat';
            state.mode = BAD;
            break;
          }
          while (copy--) {
            state.lens[state.have++] = len;
          }
        }
      }

      /* handle error breaks in while */
      if (state.mode === BAD) { break; }

      /* check for end-of-block code (better have one) */
      if (state.lens[256] === 0) {
        strm.msg = 'invalid code -- missing end-of-block';
        state.mode = BAD;
        break;
      }

      /* build code tables -- note: do not change the lenbits or distbits
         values here (9 and 6) without reading the comments in inftrees.h
         concerning the ENOUGH constants, which depend on those values */
      state.lenbits = 9;

      opts = {bits: state.lenbits};
      ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
      // We have separate tables & no pointers. 2 commented lines below not needed.
      // state.next_index = opts.table_index;
      state.lenbits = opts.bits;
      // state.lencode = state.next;

      if (ret) {
        strm.msg = 'invalid literal/lengths set';
        state.mode = BAD;
        break;
      }

      state.distbits = 6;
      //state.distcode.copy(state.codes);
      // Switch to use dynamic table
      state.distcode = state.distdyn;
      opts = {bits: state.distbits};
      ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
      // We have separate tables & no pointers. 2 commented lines below not needed.
      // state.next_index = opts.table_index;
      state.distbits = opts.bits;
      // state.distcode = state.next;

      if (ret) {
        strm.msg = 'invalid distances set';
        state.mode = BAD;
        break;
      }
      //Tracev((stderr, 'inflate:       codes ok\n'));
      state.mode = LEN_;
      if (flush === Z_TREES) { break inf_leave; }
      /* falls through */
    case LEN_:
      state.mode = LEN;
      /* falls through */
    case LEN:
      if (have >= 6 && left >= 258) {
        //--- RESTORE() ---
        strm.next_out = put;
        strm.avail_out = left;
        strm.next_in = next;
        strm.avail_in = have;
        state.hold = hold;
        state.bits = bits;
        //---
        inflate_fast(strm, _out);
        //--- LOAD() ---
        put = strm.next_out;
        output = strm.output;
        left = strm.avail_out;
        next = strm.next_in;
        input = strm.input;
        have = strm.avail_in;
        hold = state.hold;
        bits = state.bits;
        //---

        if (state.mode === TYPE) {
          state.back = -1;
        }
        break;
      }
      state.back = 0;
      for (;;) {
        here = state.lencode[hold & ((1 << state.lenbits) -1)];  /*BITS(state.lenbits)*/
        here_bits = here >>> 24;
        here_op = (here >>> 16) & 0xff;
        here_val = here & 0xffff;

        if (here_bits <= bits) { break; }
        //--- PULLBYTE() ---//
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
        //---//
      }
      if (here_op && (here_op & 0xf0) === 0) {
        last_bits = here_bits;
        last_op = here_op;
        last_val = here_val;
        for (;;) {
          here = state.lencode[last_val +
                  ((hold & ((1 << (last_bits + last_op)) -1))/*BITS(last.bits + last.op)*/ >> last_bits)];
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((last_bits + here_bits) <= bits) { break; }
          //--- PULLBYTE() ---//
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
          //---//
        }
        //--- DROPBITS(last.bits) ---//
        hold >>>= last_bits;
        bits -= last_bits;
        //---//
        state.back += last_bits;
      }
      //--- DROPBITS(here.bits) ---//
      hold >>>= here_bits;
      bits -= here_bits;
      //---//
      state.back += here_bits;
      state.length = here_val;
      if (here_op === 0) {
        //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
        //        "inflate:         literal '%c'\n" :
        //        "inflate:         literal 0x%02x\n", here.val));
        state.mode = LIT;
        break;
      }
      if (here_op & 32) {
        //Tracevv((stderr, "inflate:         end of block\n"));
        state.back = -1;
        state.mode = TYPE;
        break;
      }
      if (here_op & 64) {
        strm.msg = 'invalid literal/length code';
        state.mode = BAD;
        break;
      }
      state.extra = here_op & 15;
      state.mode = LENEXT;
      /* falls through */
    case LENEXT:
      if (state.extra) {
        //=== NEEDBITS(state.extra);
        n = state.extra;
        while (bits < n) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.length += hold & ((1 << state.extra) -1)/*BITS(state.extra)*/;
        //--- DROPBITS(state.extra) ---//
        hold >>>= state.extra;
        bits -= state.extra;
        //---//
        state.back += state.extra;
      }
      //Tracevv((stderr, "inflate:         length %u\n", state.length));
      state.was = state.length;
      state.mode = DIST;
      /* falls through */
    case DIST:
      for (;;) {
        here = state.distcode[hold & ((1 << state.distbits) -1)];/*BITS(state.distbits)*/
        here_bits = here >>> 24;
        here_op = (here >>> 16) & 0xff;
        here_val = here & 0xffff;

        if ((here_bits) <= bits) { break; }
        //--- PULLBYTE() ---//
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
        //---//
      }
      if ((here_op & 0xf0) === 0) {
        last_bits = here_bits;
        last_op = here_op;
        last_val = here_val;
        for (;;) {
          here = state.distcode[last_val +
                  ((hold & ((1 << (last_bits + last_op)) -1))/*BITS(last.bits + last.op)*/ >> last_bits)];
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((last_bits + here_bits) <= bits) { break; }
          //--- PULLBYTE() ---//
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
          //---//
        }
        //--- DROPBITS(last.bits) ---//
        hold >>>= last_bits;
        bits -= last_bits;
        //---//
        state.back += last_bits;
      }
      //--- DROPBITS(here.bits) ---//
      hold >>>= here_bits;
      bits -= here_bits;
      //---//
      state.back += here_bits;
      if (here_op & 64) {
        strm.msg = 'invalid distance code';
        state.mode = BAD;
        break;
      }
      state.offset = here_val;
      state.extra = (here_op) & 15;
      state.mode = DISTEXT;
      /* falls through */
    case DISTEXT:
      if (state.extra) {
        //=== NEEDBITS(state.extra);
        n = state.extra;
        while (bits < n) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.offset += hold & ((1 << state.extra) -1)/*BITS(state.extra)*/;
        //--- DROPBITS(state.extra) ---//
        hold >>>= state.extra;
        bits -= state.extra;
        //---//
        state.back += state.extra;
      }
//#ifdef INFLATE_STRICT
      if (state.offset > state.dmax) {
        strm.msg = 'invalid distance too far back';
        state.mode = BAD;
        break;
      }
//#endif
      //Tracevv((stderr, "inflate:         distance %u\n", state.offset));
      state.mode = MATCH;
      /* falls through */
    case MATCH:
      if (left === 0) { break inf_leave; }
      copy = _out - left;
      if (state.offset > copy) {         /* copy from window */
        copy = state.offset - copy;
        if (copy > state.whave) {
          if (state.sane) {
            strm.msg = 'invalid distance too far back';
            state.mode = BAD;
            break;
          }
// (!) This block is disabled in zlib defailts,
// don't enable it for binary compatibility
//#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
//          Trace((stderr, "inflate.c too far\n"));
//          copy -= state.whave;
//          if (copy > state.length) { copy = state.length; }
//          if (copy > left) { copy = left; }
//          left -= copy;
//          state.length -= copy;
//          do {
//            output[put++] = 0;
//          } while (--copy);
//          if (state.length === 0) { state.mode = LEN; }
//          break;
//#endif
        }
        if (copy > state.wnext) {
          copy -= state.wnext;
          from = state.wsize - copy;
        }
        else {
          from = state.wnext - copy;
        }
        if (copy > state.length) { copy = state.length; }
        from_source = state.window;
      }
      else {                              /* copy from output */
        from_source = output;
        from = put - state.offset;
        copy = state.length;
      }
      if (copy > left) { copy = left; }
      left -= copy;
      state.length -= copy;
      do {
        output[put++] = from_source[from++];
      } while (--copy);
      if (state.length === 0) { state.mode = LEN; }
      break;
    case LIT:
      if (left === 0) { break inf_leave; }
      output[put++] = state.length;
      left--;
      state.mode = LEN;
      break;
    case CHECK:
      if (state.wrap) {
        //=== NEEDBITS(32);
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          // Use '|' insdead of '+' to make sure that result is signed
          hold |= input[next++] << bits;
          bits += 8;
        }
        //===//
        _out -= left;
        strm.total_out += _out;
        state.total += _out;
        if (_out) {
          strm.adler = state.check =
              /*UPDATE(state.check, put - _out, _out);*/
              (state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out));

        }
        _out = left;
        // NB: crc32 stored as signed 32-bit int, ZSWAP32 returns signed too
        if ((state.flags ? hold : ZSWAP32(hold)) !== state.check) {
          strm.msg = 'incorrect data check';
          state.mode = BAD;
          break;
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        //Tracev((stderr, "inflate:   check matches trailer\n"));
      }
      state.mode = LENGTH;
      /* falls through */
    case LENGTH:
      if (state.wrap && state.flags) {
        //=== NEEDBITS(32);
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        if (hold !== (state.total & 0xffffffff)) {
          strm.msg = 'incorrect length check';
          state.mode = BAD;
          break;
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        //Tracev((stderr, "inflate:   length matches trailer\n"));
      }
      state.mode = DONE;
      /* falls through */
    case DONE:
      ret = Z_STREAM_END;
      break inf_leave;
    case BAD:
      ret = Z_DATA_ERROR;
      break inf_leave;
    case MEM:
      return Z_MEM_ERROR;
    case SYNC:
      /* falls through */
    default:
      return Z_STREAM_ERROR;
    }
  }

  // inf_leave <- here is real place for "goto inf_leave", emulated via "break inf_leave"

  /*
     Return from inflate(), updating the total counts and the check value.
     If there was no progress during the inflate() call, return a buffer
     error.  Call updatewindow() to create and/or update the window state.
     Note: a memory error from inflate() is non-recoverable.
   */

  //--- RESTORE() ---
  strm.next_out = put;
  strm.avail_out = left;
  strm.next_in = next;
  strm.avail_in = have;
  state.hold = hold;
  state.bits = bits;
  //---

  if (state.wsize || (_out !== strm.avail_out && state.mode < BAD &&
                      (state.mode < CHECK || flush !== Z_FINISH))) {
    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
      state.mode = MEM;
      return Z_MEM_ERROR;
    }
  }
  _in -= strm.avail_in;
  _out -= strm.avail_out;
  strm.total_in += _in;
  strm.total_out += _out;
  state.total += _out;
  if (state.wrap && _out) {
    strm.adler = state.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
      (state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out));
  }
  strm.data_type = state.bits + (state.last ? 64 : 0) +
                    (state.mode === TYPE ? 128 : 0) +
                    (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
  if (((_in === 0 && _out === 0) || flush === Z_FINISH) && ret === Z_OK) {
    ret = Z_BUF_ERROR;
  }
  return ret;
}

function inflateEnd(strm) {

  if (!strm || !strm.state /*|| strm->zfree == (free_func)0*/) {
    return Z_STREAM_ERROR;
  }

  var state = strm.state;
  if (state.window) {
    state.window = null;
  }
  strm.state = null;
  return Z_OK;
}

function inflateGetHeader(strm, head) {
  var state;

  /* check state */
  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;
  if ((state.wrap & 2) === 0) { return Z_STREAM_ERROR; }

  /* save header structure */
  state.head = head;
  head.done = false;
  return Z_OK;
}


exports.inflateReset = inflateReset;
exports.inflateReset2 = inflateReset2;
exports.inflateResetKeep = inflateResetKeep;
exports.inflateInit = inflateInit;
exports.inflateInit2 = inflateInit2;
exports.inflate = inflate;
exports.inflateEnd = inflateEnd;
exports.inflateGetHeader = inflateGetHeader;
exports.inflateInfo = 'pako inflate (from Nodeca project)';

/* Not implemented
exports.inflateCopy = inflateCopy;
exports.inflateGetDictionary = inflateGetDictionary;
exports.inflateMark = inflateMark;
exports.inflatePrime = inflatePrime;
exports.inflateSetDictionary = inflateSetDictionary;
exports.inflateSync = inflateSync;
exports.inflateSyncPoint = inflateSyncPoint;
exports.inflateUndermine = inflateUndermine;
*/
},{"../utils/common":77,"./adler32":78,"./crc32":80,"./inffast":82,"./inftrees":84}],84:[function(require,module,exports){
'use strict';


var utils = require('../utils/common');

var MAXBITS = 15;
var ENOUGH_LENS = 852;
var ENOUGH_DISTS = 592;
//var ENOUGH = (ENOUGH_LENS+ENOUGH_DISTS);

var CODES = 0;
var LENS = 1;
var DISTS = 2;

var lbase = [ /* Length codes 257..285 base */
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
  35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
];

var lext = [ /* Length codes 257..285 extra */
  16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18,
  19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78
];

var dbase = [ /* Distance codes 0..29 base */
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
  257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  8193, 12289, 16385, 24577, 0, 0
];

var dext = [ /* Distance codes 0..29 extra */
  16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22,
  23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
  28, 28, 29, 29, 64, 64
];

module.exports = function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts)
{
  var bits = opts.bits;
      //here = opts.here; /* table entry for duplication */

  var len = 0;               /* a code's length in bits */
  var sym = 0;               /* index of code symbols */
  var min = 0, max = 0;          /* minimum and maximum code lengths */
  var root = 0;              /* number of index bits for root table */
  var curr = 0;              /* number of index bits for current table */
  var drop = 0;              /* code bits to drop for sub-table */
  var left = 0;                   /* number of prefix codes available */
  var used = 0;              /* code entries in table used */
  var huff = 0;              /* Huffman code */
  var incr;              /* for incrementing code, index */
  var fill;              /* index for replicating entries */
  var low;               /* low bits for current root entry */
  var mask;              /* mask for low root bits */
  var next;             /* next available space in table */
  var base = null;     /* base value table to use */
  var base_index = 0;
//  var shoextra;    /* extra bits table to use */
  var end;                    /* use base and extra for symbol > end */
  var count = new utils.Buf16(MAXBITS+1); //[MAXBITS+1];    /* number of codes of each length */
  var offs = new utils.Buf16(MAXBITS+1); //[MAXBITS+1];     /* offsets in table for each length */
  var extra = null;
  var extra_index = 0;

  var here_bits, here_op, here_val;

  /*
   Process a set of code lengths to create a canonical Huffman code.  The
   code lengths are lens[0..codes-1].  Each length corresponds to the
   symbols 0..codes-1.  The Huffman code is generated by first sorting the
   symbols by length from short to long, and retaining the symbol order
   for codes with equal lengths.  Then the code starts with all zero bits
   for the first code of the shortest length, and the codes are integer
   increments for the same length, and zeros are appended as the length
   increases.  For the deflate format, these bits are stored backwards
   from their more natural integer increment ordering, and so when the
   decoding tables are built in the large loop below, the integer codes
   are incremented backwards.

   This routine assumes, but does not check, that all of the entries in
   lens[] are in the range 0..MAXBITS.  The caller must assure this.
   1..MAXBITS is interpreted as that code length.  zero means that that
   symbol does not occur in this code.

   The codes are sorted by computing a count of codes for each length,
   creating from that a table of starting indices for each length in the
   sorted table, and then entering the symbols in order in the sorted
   table.  The sorted table is work[], with that space being provided by
   the caller.

   The length counts are used for other purposes as well, i.e. finding
   the minimum and maximum length codes, determining if there are any
   codes at all, checking for a valid set of lengths, and looking ahead
   at length counts to determine sub-table sizes when building the
   decoding tables.
   */

  /* accumulate lengths for codes (assumes lens[] all in 0..MAXBITS) */
  for (len = 0; len <= MAXBITS; len++) {
    count[len] = 0;
  }
  for (sym = 0; sym < codes; sym++) {
    count[lens[lens_index + sym]]++;
  }

  /* bound code lengths, force root to be within code lengths */
  root = bits;
  for (max = MAXBITS; max >= 1; max--) {
    if (count[max] !== 0) { break; }
  }
  if (root > max) {
    root = max;
  }
  if (max === 0) {                     /* no symbols to code at all */
    //table.op[opts.table_index] = 64;  //here.op = (var char)64;    /* invalid code marker */
    //table.bits[opts.table_index] = 1;   //here.bits = (var char)1;
    //table.val[opts.table_index++] = 0;   //here.val = (var short)0;
    table[table_index++] = (1 << 24) | (64 << 16) | 0;


    //table.op[opts.table_index] = 64;
    //table.bits[opts.table_index] = 1;
    //table.val[opts.table_index++] = 0;
    table[table_index++] = (1 << 24) | (64 << 16) | 0;

    opts.bits = 1;
    return 0;     /* no symbols, but wait for decoding to report error */
  }
  for (min = 1; min < max; min++) {
    if (count[min] !== 0) { break; }
  }
  if (root < min) {
    root = min;
  }

  /* check for an over-subscribed or incomplete set of lengths */
  left = 1;
  for (len = 1; len <= MAXBITS; len++) {
    left <<= 1;
    left -= count[len];
    if (left < 0) {
      return -1;
    }        /* over-subscribed */
  }
  if (left > 0 && (type === CODES || max !== 1)) {
    return -1;                      /* incomplete set */
  }

  /* generate offsets into symbol table for each length for sorting */
  offs[1] = 0;
  for (len = 1; len < MAXBITS; len++) {
    offs[len + 1] = offs[len] + count[len];
  }

  /* sort symbols by length, by symbol order within each length */
  for (sym = 0; sym < codes; sym++) {
    if (lens[lens_index + sym] !== 0) {
      work[offs[lens[lens_index + sym]]++] = sym;
    }
  }

  /*
   Create and fill in decoding tables.  In this loop, the table being
   filled is at next and has curr index bits.  The code being used is huff
   with length len.  That code is converted to an index by dropping drop
   bits off of the bottom.  For codes where len is less than drop + curr,
   those top drop + curr - len bits are incremented through all values to
   fill the table with replicated entries.

   root is the number of index bits for the root table.  When len exceeds
   root, sub-tables are created pointed to by the root entry with an index
   of the low root bits of huff.  This is saved in low to check for when a
   new sub-table should be started.  drop is zero when the root table is
   being filled, and drop is root when sub-tables are being filled.

   When a new sub-table is needed, it is necessary to look ahead in the
   code lengths to determine what size sub-table is needed.  The length
   counts are used for this, and so count[] is decremented as codes are
   entered in the tables.

   used keeps track of how many table entries have been allocated from the
   provided *table space.  It is checked for LENS and DIST tables against
   the constants ENOUGH_LENS and ENOUGH_DISTS to guard against changes in
   the initial root table size constants.  See the comments in inftrees.h
   for more information.

   sym increments through all symbols, and the loop terminates when
   all codes of length max, i.e. all codes, have been processed.  This
   routine permits incomplete codes, so another loop after this one fills
   in the rest of the decoding tables with invalid code markers.
   */

  /* set up for code type */
  // poor man optimization - use if-else instead of switch,
  // to avoid deopts in old v8
  if (type === CODES) {
      base = extra = work;    /* dummy value--not used */
      end = 19;
  } else if (type === LENS) {
      base = lbase;
      base_index -= 257;
      extra = lext;
      extra_index -= 257;
      end = 256;
  } else {                    /* DISTS */
      base = dbase;
      extra = dext;
      end = -1;
  }

  /* initialize opts for loop */
  huff = 0;                   /* starting code */
  sym = 0;                    /* starting code symbol */
  len = min;                  /* starting code length */
  next = table_index;              /* current table to fill in */
  curr = root;                /* current table index bits */
  drop = 0;                   /* current bits to drop from code for index */
  low = -1;                   /* trigger new sub-table when len > root */
  used = 1 << root;          /* use root table entries */
  mask = used - 1;            /* mask for comparing low */

  /* check available table space */
  if ((type === LENS && used > ENOUGH_LENS) ||
    (type === DISTS && used > ENOUGH_DISTS)) {
    return 1;
  }

  var i=0;
  /* process all codes and make table entries */
  for (;;) {
    i++;
    /* create table entry */
    here_bits = len - drop;
    if (work[sym] < end) {
      here_op = 0;
      here_val = work[sym];
    }
    else if (work[sym] > end) {
      here_op = extra[extra_index + work[sym]];
      here_val = base[base_index + work[sym]];
    }
    else {
      here_op = 32 + 64;         /* end of block */
      here_val = 0;
    }

    /* replicate for those indices with low len bits equal to huff */
    incr = 1 << (len - drop);
    fill = 1 << curr;
    min = fill;                 /* save offset to next table */
    do {
      fill -= incr;
      table[next + (huff >> drop) + fill] = (here_bits << 24) | (here_op << 16) | here_val |0;
    } while (fill !== 0);

    /* backwards increment the len-bit code huff */
    incr = 1 << (len - 1);
    while (huff & incr) {
      incr >>= 1;
    }
    if (incr !== 0) {
      huff &= incr - 1;
      huff += incr;
    } else {
      huff = 0;
    }

    /* go to next symbol, update count, len */
    sym++;
    if (--count[len] === 0) {
      if (len === max) { break; }
      len = lens[lens_index + work[sym]];
    }

    /* create new sub-table if needed */
    if (len > root && (huff & mask) !== low) {
      /* if first time, transition to sub-tables */
      if (drop === 0) {
        drop = root;
      }

      /* increment past last table */
      next += min;            /* here min is 1 << curr */

      /* determine length of next table */
      curr = len - drop;
      left = 1 << curr;
      while (curr + drop < max) {
        left -= count[curr + drop];
        if (left <= 0) { break; }
        curr++;
        left <<= 1;
      }

      /* check for enough space */
      used += 1 << curr;
      if ((type === LENS && used > ENOUGH_LENS) ||
        (type === DISTS && used > ENOUGH_DISTS)) {
        return 1;
      }

      /* point entry in root table to sub-table */
      low = huff & mask;
      /*table.op[low] = curr;
      table.bits[low] = root;
      table.val[low] = next - opts.table_index;*/
      table[low] = (root << 24) | (curr << 16) | (next - table_index) |0;
    }
  }

  /* fill in remaining table entry if code is incomplete (guaranteed to have
   at most one remaining entry, since if the code is incomplete, the
   maximum code length that was allowed to get this far is one bit) */
  if (huff !== 0) {
    //table.op[next + huff] = 64;            /* invalid code marker */
    //table.bits[next + huff] = len - drop;
    //table.val[next + huff] = 0;
    table[next + huff] = ((len - drop) << 24) | (64 << 16) |0;
  }

  /* set return parameters */
  //opts.table_index += used;
  opts.bits = root;
  return 0;
};

},{"../utils/common":77}],85:[function(require,module,exports){
'use strict';

module.exports = {
  '2':    'need dictionary',     /* Z_NEED_DICT       2  */
  '1':    'stream end',          /* Z_STREAM_END      1  */
  '0':    '',                    /* Z_OK              0  */
  '-1':   'file error',          /* Z_ERRNO         (-1) */
  '-2':   'stream error',        /* Z_STREAM_ERROR  (-2) */
  '-3':   'data error',          /* Z_DATA_ERROR    (-3) */
  '-4':   'insufficient memory', /* Z_MEM_ERROR     (-4) */
  '-5':   'buffer error',        /* Z_BUF_ERROR     (-5) */
  '-6':   'incompatible version' /* Z_VERSION_ERROR (-6) */
};
},{}],86:[function(require,module,exports){
'use strict';


var utils = require('../utils/common');

/* Public constants ==========================================================*/
/* ===========================================================================*/


//var Z_FILTERED          = 1;
//var Z_HUFFMAN_ONLY      = 2;
//var Z_RLE               = 3;
var Z_FIXED               = 4;
//var Z_DEFAULT_STRATEGY  = 0;

/* Possible values of the data_type field (though see inflate()) */
var Z_BINARY              = 0;
var Z_TEXT                = 1;
//var Z_ASCII             = 1; // = Z_TEXT
var Z_UNKNOWN             = 2;

/*============================================================================*/


function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }

// From zutil.h

var STORED_BLOCK = 0;
var STATIC_TREES = 1;
var DYN_TREES    = 2;
/* The three kinds of block type */

var MIN_MATCH    = 3;
var MAX_MATCH    = 258;
/* The minimum and maximum match lengths */

// From deflate.h
/* ===========================================================================
 * Internal compression state.
 */

var LENGTH_CODES  = 29;
/* number of length codes, not counting the special END_BLOCK code */

var LITERALS      = 256;
/* number of literal bytes 0..255 */

var L_CODES       = LITERALS + 1 + LENGTH_CODES;
/* number of Literal or Length codes, including the END_BLOCK code */

var D_CODES       = 30;
/* number of distance codes */

var BL_CODES      = 19;
/* number of codes used to transfer the bit lengths */

var HEAP_SIZE     = 2*L_CODES + 1;
/* maximum heap size */

var MAX_BITS      = 15;
/* All codes must not exceed MAX_BITS bits */

var Buf_size      = 16;
/* size of bit buffer in bi_buf */


/* ===========================================================================
 * Constants
 */

var MAX_BL_BITS = 7;
/* Bit length codes must not exceed MAX_BL_BITS bits */

var END_BLOCK   = 256;
/* end of block literal code */

var REP_3_6     = 16;
/* repeat previous bit length 3-6 times (2 bits of repeat count) */

var REPZ_3_10   = 17;
/* repeat a zero length 3-10 times  (3 bits of repeat count) */

var REPZ_11_138 = 18;
/* repeat a zero length 11-138 times  (7 bits of repeat count) */

var extra_lbits =   /* extra bits for each length code */
  [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];

var extra_dbits =   /* extra bits for each distance code */
  [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];

var extra_blbits =  /* extra bits for each bit length code */
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7];

var bl_order =
  [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
/* The lengths of the bit length codes are sent in order of decreasing
 * probability, to avoid transmitting the lengths for unused bit length codes.
 */

/* ===========================================================================
 * Local data. These are initialized only once.
 */

// We pre-fill arrays with 0 to avoid uninitialized gaps

var DIST_CODE_LEN = 512; /* see definition of array dist_code below */

// !!!! Use flat array insdead of structure, Freq = i*2, Len = i*2+1
var static_ltree  = new Array((L_CODES+2) * 2);
zero(static_ltree);
/* The static literal tree. Since the bit lengths are imposed, there is no
 * need for the L_CODES extra codes used during heap construction. However
 * The codes 286 and 287 are needed to build a canonical tree (see _tr_init
 * below).
 */

var static_dtree  = new Array(D_CODES * 2);
zero(static_dtree);
/* The static distance tree. (Actually a trivial tree since all codes use
 * 5 bits.)
 */

var _dist_code    = new Array(DIST_CODE_LEN);
zero(_dist_code);
/* Distance codes. The first 256 values correspond to the distances
 * 3 .. 258, the last 256 values correspond to the top 8 bits of
 * the 15 bit distances.
 */

var _length_code  = new Array(MAX_MATCH-MIN_MATCH+1);
zero(_length_code);
/* length code for each normalized match length (0 == MIN_MATCH) */

var base_length   = new Array(LENGTH_CODES);
zero(base_length);
/* First normalized length for each code (0 = MIN_MATCH) */

var base_dist     = new Array(D_CODES);
zero(base_dist);
/* First normalized distance for each code (0 = distance of 1) */


var StaticTreeDesc = function (static_tree, extra_bits, extra_base, elems, max_length) {

  this.static_tree  = static_tree;  /* static tree or NULL */
  this.extra_bits   = extra_bits;   /* extra bits for each code or NULL */
  this.extra_base   = extra_base;   /* base index for extra_bits */
  this.elems        = elems;        /* max number of elements in the tree */
  this.max_length   = max_length;   /* max bit length for the codes */

  // show if `static_tree` has data or dummy - needed for monomorphic objects
  this.has_stree    = static_tree && static_tree.length;
};


var static_l_desc;
var static_d_desc;
var static_bl_desc;


var TreeDesc = function(dyn_tree, stat_desc) {
  this.dyn_tree = dyn_tree;     /* the dynamic tree */
  this.max_code = 0;            /* largest code with non zero frequency */
  this.stat_desc = stat_desc;   /* the corresponding static tree */
};



function d_code(dist) {
  return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
}


/* ===========================================================================
 * Output a short LSB first on the stream.
 * IN assertion: there is enough room in pendingBuf.
 */
function put_short (s, w) {
//    put_byte(s, (uch)((w) & 0xff));
//    put_byte(s, (uch)((ush)(w) >> 8));
  s.pending_buf[s.pending++] = (w) & 0xff;
  s.pending_buf[s.pending++] = (w >>> 8) & 0xff;
}


/* ===========================================================================
 * Send a value on a given number of bits.
 * IN assertion: length <= 16 and value fits in length bits.
 */
function send_bits(s, value, length) {
  if (s.bi_valid > (Buf_size - length)) {
    s.bi_buf |= (value << s.bi_valid) & 0xffff;
    put_short(s, s.bi_buf);
    s.bi_buf = value >> (Buf_size - s.bi_valid);
    s.bi_valid += length - Buf_size;
  } else {
    s.bi_buf |= (value << s.bi_valid) & 0xffff;
    s.bi_valid += length;
  }
}


function send_code(s, c, tree) {
  send_bits(s, tree[c*2]/*.Code*/, tree[c*2 + 1]/*.Len*/);
}


/* ===========================================================================
 * Reverse the first len bits of a code, using straightforward code (a faster
 * method would use a table)
 * IN assertion: 1 <= len <= 15
 */
function bi_reverse(code, len) {
  var res = 0;
  do {
    res |= code & 1;
    code >>>= 1;
    res <<= 1;
  } while (--len > 0);
  return res >>> 1;
}


/* ===========================================================================
 * Flush the bit buffer, keeping at most 7 bits in it.
 */
function bi_flush(s) {
  if (s.bi_valid === 16) {
    put_short(s, s.bi_buf);
    s.bi_buf = 0;
    s.bi_valid = 0;

  } else if (s.bi_valid >= 8) {
    s.pending_buf[s.pending++] = s.bi_buf & 0xff;
    s.bi_buf >>= 8;
    s.bi_valid -= 8;
  }
}


/* ===========================================================================
 * Compute the optimal bit lengths for a tree and update the total bit length
 * for the current block.
 * IN assertion: the fields freq and dad are set, heap[heap_max] and
 *    above are the tree nodes sorted by increasing frequency.
 * OUT assertions: the field len is set to the optimal bit length, the
 *     array bl_count contains the frequencies for each bit length.
 *     The length opt_len is updated; static_len is also updated if stree is
 *     not null.
 */
function gen_bitlen(s, desc)
//    deflate_state *s;
//    tree_desc *desc;    /* the tree descriptor */
{
  var tree            = desc.dyn_tree;
  var max_code        = desc.max_code;
  var stree           = desc.stat_desc.static_tree;
  var has_stree       = desc.stat_desc.has_stree;
  var extra           = desc.stat_desc.extra_bits;
  var base            = desc.stat_desc.extra_base;
  var max_length      = desc.stat_desc.max_length;
  var h;              /* heap index */
  var n, m;           /* iterate over the tree elements */
  var bits;           /* bit length */
  var xbits;          /* extra bits */
  var f;              /* frequency */
  var overflow = 0;   /* number of elements with bit length too large */

  for (bits = 0; bits <= MAX_BITS; bits++) {
    s.bl_count[bits] = 0;
  }

  /* In a first pass, compute the optimal bit lengths (which may
   * overflow in the case of the bit length tree).
   */
  tree[s.heap[s.heap_max]*2 + 1]/*.Len*/ = 0; /* root of the heap */

  for (h = s.heap_max+1; h < HEAP_SIZE; h++) {
    n = s.heap[h];
    bits = tree[tree[n*2 +1]/*.Dad*/ * 2 + 1]/*.Len*/ + 1;
    if (bits > max_length) {
      bits = max_length;
      overflow++;
    }
    tree[n*2 + 1]/*.Len*/ = bits;
    /* We overwrite tree[n].Dad which is no longer needed */

    if (n > max_code) { continue; } /* not a leaf node */

    s.bl_count[bits]++;
    xbits = 0;
    if (n >= base) {
      xbits = extra[n-base];
    }
    f = tree[n * 2]/*.Freq*/;
    s.opt_len += f * (bits + xbits);
    if (has_stree) {
      s.static_len += f * (stree[n*2 + 1]/*.Len*/ + xbits);
    }
  }
  if (overflow === 0) { return; }

  // Trace((stderr,"\nbit length overflow\n"));
  /* This happens for example on obj2 and pic of the Calgary corpus */

  /* Find the first bit length which could increase: */
  do {
    bits = max_length-1;
    while (s.bl_count[bits] === 0) { bits--; }
    s.bl_count[bits]--;      /* move one leaf down the tree */
    s.bl_count[bits+1] += 2; /* move one overflow item as its brother */
    s.bl_count[max_length]--;
    /* The brother of the overflow item also moves one step up,
     * but this does not affect bl_count[max_length]
     */
    overflow -= 2;
  } while (overflow > 0);

  /* Now recompute all bit lengths, scanning in increasing frequency.
   * h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
   * lengths instead of fixing only the wrong ones. This idea is taken
   * from 'ar' written by Haruhiko Okumura.)
   */
  for (bits = max_length; bits !== 0; bits--) {
    n = s.bl_count[bits];
    while (n !== 0) {
      m = s.heap[--h];
      if (m > max_code) { continue; }
      if (tree[m*2 + 1]/*.Len*/ !== bits) {
        // Trace((stderr,"code %d bits %d->%d\n", m, tree[m].Len, bits));
        s.opt_len += (bits - tree[m*2 + 1]/*.Len*/)*tree[m*2]/*.Freq*/;
        tree[m*2 + 1]/*.Len*/ = bits;
      }
      n--;
    }
  }
}


/* ===========================================================================
 * Generate the codes for a given tree and bit counts (which need not be
 * optimal).
 * IN assertion: the array bl_count contains the bit length statistics for
 * the given tree and the field len is set for all tree elements.
 * OUT assertion: the field code is set for all tree elements of non
 *     zero code length.
 */
function gen_codes(tree, max_code, bl_count)
//    ct_data *tree;             /* the tree to decorate */
//    int max_code;              /* largest code with non zero frequency */
//    ushf *bl_count;            /* number of codes at each bit length */
{
  var next_code = new Array(MAX_BITS+1); /* next code value for each bit length */
  var code = 0;              /* running code value */
  var bits;                  /* bit index */
  var n;                     /* code index */

  /* The distribution counts are first used to generate the code values
   * without bit reversal.
   */
  for (bits = 1; bits <= MAX_BITS; bits++) {
    next_code[bits] = code = (code + bl_count[bits-1]) << 1;
  }
  /* Check that the bit counts in bl_count are consistent. The last code
   * must be all ones.
   */
  //Assert (code + bl_count[MAX_BITS]-1 == (1<<MAX_BITS)-1,
  //        "inconsistent bit counts");
  //Tracev((stderr,"\ngen_codes: max_code %d ", max_code));

  for (n = 0;  n <= max_code; n++) {
    var len = tree[n*2 + 1]/*.Len*/;
    if (len === 0) { continue; }
    /* Now reverse the bits */
    tree[n*2]/*.Code*/ = bi_reverse(next_code[len]++, len);

    //Tracecv(tree != static_ltree, (stderr,"\nn %3d %c l %2d c %4x (%x) ",
    //     n, (isgraph(n) ? n : ' '), len, tree[n].Code, next_code[len]-1));
  }
}


/* ===========================================================================
 * Initialize the various 'constant' tables.
 */
function tr_static_init() {
  var n;        /* iterates over tree elements */
  var bits;     /* bit counter */
  var length;   /* length value */
  var code;     /* code value */
  var dist;     /* distance index */
  var bl_count = new Array(MAX_BITS+1);
  /* number of codes at each bit length for an optimal tree */

  // do check in _tr_init()
  //if (static_init_done) return;

  /* For some embedded targets, global variables are not initialized: */
/*#ifdef NO_INIT_GLOBAL_POINTERS
  static_l_desc.static_tree = static_ltree;
  static_l_desc.extra_bits = extra_lbits;
  static_d_desc.static_tree = static_dtree;
  static_d_desc.extra_bits = extra_dbits;
  static_bl_desc.extra_bits = extra_blbits;
#endif*/

  /* Initialize the mapping length (0..255) -> length code (0..28) */
  length = 0;
  for (code = 0; code < LENGTH_CODES-1; code++) {
    base_length[code] = length;
    for (n = 0; n < (1<<extra_lbits[code]); n++) {
      _length_code[length++] = code;
    }
  }
  //Assert (length == 256, "tr_static_init: length != 256");
  /* Note that the length 255 (match length 258) can be represented
   * in two different ways: code 284 + 5 bits or code 285, so we
   * overwrite length_code[255] to use the best encoding:
   */
  _length_code[length-1] = code;

  /* Initialize the mapping dist (0..32K) -> dist code (0..29) */
  dist = 0;
  for (code = 0 ; code < 16; code++) {
    base_dist[code] = dist;
    for (n = 0; n < (1<<extra_dbits[code]); n++) {
      _dist_code[dist++] = code;
    }
  }
  //Assert (dist == 256, "tr_static_init: dist != 256");
  dist >>= 7; /* from now on, all distances are divided by 128 */
  for ( ; code < D_CODES; code++) {
    base_dist[code] = dist << 7;
    for (n = 0; n < (1<<(extra_dbits[code]-7)); n++) {
      _dist_code[256 + dist++] = code;
    }
  }
  //Assert (dist == 256, "tr_static_init: 256+dist != 512");

  /* Construct the codes of the static literal tree */
  for (bits = 0; bits <= MAX_BITS; bits++) {
    bl_count[bits] = 0;
  }

  n = 0;
  while (n <= 143) {
    static_ltree[n*2 + 1]/*.Len*/ = 8;
    n++;
    bl_count[8]++;
  }
  while (n <= 255) {
    static_ltree[n*2 + 1]/*.Len*/ = 9;
    n++;
    bl_count[9]++;
  }
  while (n <= 279) {
    static_ltree[n*2 + 1]/*.Len*/ = 7;
    n++;
    bl_count[7]++;
  }
  while (n <= 287) {
    static_ltree[n*2 + 1]/*.Len*/ = 8;
    n++;
    bl_count[8]++;
  }
  /* Codes 286 and 287 do not exist, but we must include them in the
   * tree construction to get a canonical Huffman tree (longest code
   * all ones)
   */
  gen_codes(static_ltree, L_CODES+1, bl_count);

  /* The static distance tree is trivial: */
  for (n = 0; n < D_CODES; n++) {
    static_dtree[n*2 + 1]/*.Len*/ = 5;
    static_dtree[n*2]/*.Code*/ = bi_reverse(n, 5);
  }

  // Now data ready and we can init static trees
  static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS+1, L_CODES, MAX_BITS);
  static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0,          D_CODES, MAX_BITS);
  static_bl_desc =new StaticTreeDesc(new Array(0), extra_blbits, 0,         BL_CODES, MAX_BL_BITS);

  //static_init_done = true;
}


/* ===========================================================================
 * Initialize a new block.
 */
function init_block(s) {
  var n; /* iterates over tree elements */

  /* Initialize the trees. */
  for (n = 0; n < L_CODES;  n++) { s.dyn_ltree[n*2]/*.Freq*/ = 0; }
  for (n = 0; n < D_CODES;  n++) { s.dyn_dtree[n*2]/*.Freq*/ = 0; }
  for (n = 0; n < BL_CODES; n++) { s.bl_tree[n*2]/*.Freq*/ = 0; }

  s.dyn_ltree[END_BLOCK*2]/*.Freq*/ = 1;
  s.opt_len = s.static_len = 0;
  s.last_lit = s.matches = 0;
}


/* ===========================================================================
 * Flush the bit buffer and align the output on a byte boundary
 */
function bi_windup(s)
{
  if (s.bi_valid > 8) {
    put_short(s, s.bi_buf);
  } else if (s.bi_valid > 0) {
    //put_byte(s, (Byte)s->bi_buf);
    s.pending_buf[s.pending++] = s.bi_buf;
  }
  s.bi_buf = 0;
  s.bi_valid = 0;
}

/* ===========================================================================
 * Copy a stored block, storing first the length and its
 * one's complement if requested.
 */
function copy_block(s, buf, len, header)
//DeflateState *s;
//charf    *buf;    /* the input data */
//unsigned len;     /* its length */
//int      header;  /* true if block header must be written */
{
  bi_windup(s);        /* align on byte boundary */

  if (header) {
    put_short(s, len);
    put_short(s, ~len);
  }
//  while (len--) {
//    put_byte(s, *buf++);
//  }
  utils.arraySet(s.pending_buf, s.window, buf, len, s.pending);
  s.pending += len;
}

/* ===========================================================================
 * Compares to subtrees, using the tree depth as tie breaker when
 * the subtrees have equal frequency. This minimizes the worst case length.
 */
function smaller(tree, n, m, depth) {
  var _n2 = n*2;
  var _m2 = m*2;
  return (tree[_n2]/*.Freq*/ < tree[_m2]/*.Freq*/ ||
         (tree[_n2]/*.Freq*/ === tree[_m2]/*.Freq*/ && depth[n] <= depth[m]));
}

/* ===========================================================================
 * Restore the heap property by moving down the tree starting at node k,
 * exchanging a node with the smallest of its two sons if necessary, stopping
 * when the heap property is re-established (each father smaller than its
 * two sons).
 */
function pqdownheap(s, tree, k)
//    deflate_state *s;
//    ct_data *tree;  /* the tree to restore */
//    int k;               /* node to move down */
{
  var v = s.heap[k];
  var j = k << 1;  /* left son of k */
  while (j <= s.heap_len) {
    /* Set j to the smallest of the two sons: */
    if (j < s.heap_len &&
      smaller(tree, s.heap[j+1], s.heap[j], s.depth)) {
      j++;
    }
    /* Exit if v is smaller than both sons */
    if (smaller(tree, v, s.heap[j], s.depth)) { break; }

    /* Exchange v with the smallest son */
    s.heap[k] = s.heap[j];
    k = j;

    /* And continue down the tree, setting j to the left son of k */
    j <<= 1;
  }
  s.heap[k] = v;
}


// inlined manually
// var SMALLEST = 1;

/* ===========================================================================
 * Send the block data compressed using the given Huffman trees
 */
function compress_block(s, ltree, dtree)
//    deflate_state *s;
//    const ct_data *ltree; /* literal tree */
//    const ct_data *dtree; /* distance tree */
{
  var dist;           /* distance of matched string */
  var lc;             /* match length or unmatched char (if dist == 0) */
  var lx = 0;         /* running index in l_buf */
  var code;           /* the code to send */
  var extra;          /* number of extra bits to send */

  if (s.last_lit !== 0) {
    do {
      dist = (s.pending_buf[s.d_buf + lx*2] << 8) | (s.pending_buf[s.d_buf + lx*2 + 1]);
      lc = s.pending_buf[s.l_buf + lx];
      lx++;

      if (dist === 0) {
        send_code(s, lc, ltree); /* send a literal byte */
        //Tracecv(isgraph(lc), (stderr," '%c' ", lc));
      } else {
        /* Here, lc is the match length - MIN_MATCH */
        code = _length_code[lc];
        send_code(s, code+LITERALS+1, ltree); /* send the length code */
        extra = extra_lbits[code];
        if (extra !== 0) {
          lc -= base_length[code];
          send_bits(s, lc, extra);       /* send the extra length bits */
        }
        dist--; /* dist is now the match distance - 1 */
        code = d_code(dist);
        //Assert (code < D_CODES, "bad d_code");

        send_code(s, code, dtree);       /* send the distance code */
        extra = extra_dbits[code];
        if (extra !== 0) {
          dist -= base_dist[code];
          send_bits(s, dist, extra);   /* send the extra distance bits */
        }
      } /* literal or match pair ? */

      /* Check that the overlay between pending_buf and d_buf+l_buf is ok: */
      //Assert((uInt)(s->pending) < s->lit_bufsize + 2*lx,
      //       "pendingBuf overflow");

    } while (lx < s.last_lit);
  }

  send_code(s, END_BLOCK, ltree);
}


/* ===========================================================================
 * Construct one Huffman tree and assigns the code bit strings and lengths.
 * Update the total bit length for the current block.
 * IN assertion: the field freq is set for all tree elements.
 * OUT assertions: the fields len and code are set to the optimal bit length
 *     and corresponding code. The length opt_len is updated; static_len is
 *     also updated if stree is not null. The field max_code is set.
 */
function build_tree(s, desc)
//    deflate_state *s;
//    tree_desc *desc; /* the tree descriptor */
{
  var tree     = desc.dyn_tree;
  var stree    = desc.stat_desc.static_tree;
  var has_stree = desc.stat_desc.has_stree;
  var elems    = desc.stat_desc.elems;
  var n, m;          /* iterate over heap elements */
  var max_code = -1; /* largest code with non zero frequency */
  var node;          /* new node being created */

  /* Construct the initial heap, with least frequent element in
   * heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
   * heap[0] is not used.
   */
  s.heap_len = 0;
  s.heap_max = HEAP_SIZE;

  for (n = 0; n < elems; n++) {
    if (tree[n * 2]/*.Freq*/ !== 0) {
      s.heap[++s.heap_len] = max_code = n;
      s.depth[n] = 0;

    } else {
      tree[n*2 + 1]/*.Len*/ = 0;
    }
  }

  /* The pkzip format requires that at least one distance code exists,
   * and that at least one bit should be sent even if there is only one
   * possible code. So to avoid special checks later on we force at least
   * two codes of non zero frequency.
   */
  while (s.heap_len < 2) {
    node = s.heap[++s.heap_len] = (max_code < 2 ? ++max_code : 0);
    tree[node * 2]/*.Freq*/ = 1;
    s.depth[node] = 0;
    s.opt_len--;

    if (has_stree) {
      s.static_len -= stree[node*2 + 1]/*.Len*/;
    }
    /* node is 0 or 1 so it does not have extra bits */
  }
  desc.max_code = max_code;

  /* The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
   * establish sub-heaps of increasing lengths:
   */
  for (n = (s.heap_len >> 1/*int /2*/); n >= 1; n--) { pqdownheap(s, tree, n); }

  /* Construct the Huffman tree by repeatedly combining the least two
   * frequent nodes.
   */
  node = elems;              /* next internal node of the tree */
  do {
    //pqremove(s, tree, n);  /* n = node of least frequency */
    /*** pqremove ***/
    n = s.heap[1/*SMALLEST*/];
    s.heap[1/*SMALLEST*/] = s.heap[s.heap_len--];
    pqdownheap(s, tree, 1/*SMALLEST*/);
    /***/

    m = s.heap[1/*SMALLEST*/]; /* m = node of next least frequency */

    s.heap[--s.heap_max] = n; /* keep the nodes sorted by frequency */
    s.heap[--s.heap_max] = m;

    /* Create a new node father of n and m */
    tree[node * 2]/*.Freq*/ = tree[n * 2]/*.Freq*/ + tree[m * 2]/*.Freq*/;
    s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
    tree[n*2 + 1]/*.Dad*/ = tree[m*2 + 1]/*.Dad*/ = node;

    /* and insert the new node in the heap */
    s.heap[1/*SMALLEST*/] = node++;
    pqdownheap(s, tree, 1/*SMALLEST*/);

  } while (s.heap_len >= 2);

  s.heap[--s.heap_max] = s.heap[1/*SMALLEST*/];

  /* At this point, the fields freq and dad are set. We can now
   * generate the bit lengths.
   */
  gen_bitlen(s, desc);

  /* The field len is now set, we can generate the bit codes */
  gen_codes(tree, max_code, s.bl_count);
}


/* ===========================================================================
 * Scan a literal or distance tree to determine the frequencies of the codes
 * in the bit length tree.
 */
function scan_tree(s, tree, max_code)
//    deflate_state *s;
//    ct_data *tree;   /* the tree to be scanned */
//    int max_code;    /* and its largest code of non zero frequency */
{
  var n;                     /* iterates over all tree elements */
  var prevlen = -1;          /* last emitted length */
  var curlen;                /* length of current code */

  var nextlen = tree[0*2 + 1]/*.Len*/; /* length of next code */

  var count = 0;             /* repeat count of the current code */
  var max_count = 7;         /* max repeat count */
  var min_count = 4;         /* min repeat count */

  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }
  tree[(max_code+1)*2 + 1]/*.Len*/ = 0xffff; /* guard */

  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n+1)*2 + 1]/*.Len*/;

    if (++count < max_count && curlen === nextlen) {
      continue;

    } else if (count < min_count) {
      s.bl_tree[curlen * 2]/*.Freq*/ += count;

    } else if (curlen !== 0) {

      if (curlen !== prevlen) { s.bl_tree[curlen * 2]/*.Freq*/++; }
      s.bl_tree[REP_3_6*2]/*.Freq*/++;

    } else if (count <= 10) {
      s.bl_tree[REPZ_3_10*2]/*.Freq*/++;

    } else {
      s.bl_tree[REPZ_11_138*2]/*.Freq*/++;
    }

    count = 0;
    prevlen = curlen;

    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;

    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;

    } else {
      max_count = 7;
      min_count = 4;
    }
  }
}


/* ===========================================================================
 * Send a literal or distance tree in compressed form, using the codes in
 * bl_tree.
 */
function send_tree(s, tree, max_code)
//    deflate_state *s;
//    ct_data *tree; /* the tree to be scanned */
//    int max_code;       /* and its largest code of non zero frequency */
{
  var n;                     /* iterates over all tree elements */
  var prevlen = -1;          /* last emitted length */
  var curlen;                /* length of current code */

  var nextlen = tree[0*2 + 1]/*.Len*/; /* length of next code */

  var count = 0;             /* repeat count of the current code */
  var max_count = 7;         /* max repeat count */
  var min_count = 4;         /* min repeat count */

  /* tree[max_code+1].Len = -1; */  /* guard already set */
  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }

  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n+1)*2 + 1]/*.Len*/;

    if (++count < max_count && curlen === nextlen) {
      continue;

    } else if (count < min_count) {
      do { send_code(s, curlen, s.bl_tree); } while (--count !== 0);

    } else if (curlen !== 0) {
      if (curlen !== prevlen) {
        send_code(s, curlen, s.bl_tree);
        count--;
      }
      //Assert(count >= 3 && count <= 6, " 3_6?");
      send_code(s, REP_3_6, s.bl_tree);
      send_bits(s, count-3, 2);

    } else if (count <= 10) {
      send_code(s, REPZ_3_10, s.bl_tree);
      send_bits(s, count-3, 3);

    } else {
      send_code(s, REPZ_11_138, s.bl_tree);
      send_bits(s, count-11, 7);
    }

    count = 0;
    prevlen = curlen;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;

    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;

    } else {
      max_count = 7;
      min_count = 4;
    }
  }
}


/* ===========================================================================
 * Construct the Huffman tree for the bit lengths and return the index in
 * bl_order of the last bit length code to send.
 */
function build_bl_tree(s) {
  var max_blindex;  /* index of last bit length code of non zero freq */

  /* Determine the bit length frequencies for literal and distance trees */
  scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
  scan_tree(s, s.dyn_dtree, s.d_desc.max_code);

  /* Build the bit length tree: */
  build_tree(s, s.bl_desc);
  /* opt_len now includes the length of the tree representations, except
   * the lengths of the bit lengths codes and the 5+5+4 bits for the counts.
   */

  /* Determine the number of bit length codes to send. The pkzip format
   * requires that at least 4 bit length codes be sent. (appnote.txt says
   * 3 but the actual value used is 4.)
   */
  for (max_blindex = BL_CODES-1; max_blindex >= 3; max_blindex--) {
    if (s.bl_tree[bl_order[max_blindex]*2 + 1]/*.Len*/ !== 0) {
      break;
    }
  }
  /* Update opt_len to include the bit length tree and counts */
  s.opt_len += 3*(max_blindex+1) + 5+5+4;
  //Tracev((stderr, "\ndyn trees: dyn %ld, stat %ld",
  //        s->opt_len, s->static_len));

  return max_blindex;
}


/* ===========================================================================
 * Send the header for a block using dynamic Huffman trees: the counts, the
 * lengths of the bit length codes, the literal tree and the distance tree.
 * IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
 */
function send_all_trees(s, lcodes, dcodes, blcodes)
//    deflate_state *s;
//    int lcodes, dcodes, blcodes; /* number of codes for each tree */
{
  var rank;                    /* index in bl_order */

  //Assert (lcodes >= 257 && dcodes >= 1 && blcodes >= 4, "not enough codes");
  //Assert (lcodes <= L_CODES && dcodes <= D_CODES && blcodes <= BL_CODES,
  //        "too many codes");
  //Tracev((stderr, "\nbl counts: "));
  send_bits(s, lcodes-257, 5); /* not +255 as stated in appnote.txt */
  send_bits(s, dcodes-1,   5);
  send_bits(s, blcodes-4,  4); /* not -3 as stated in appnote.txt */
  for (rank = 0; rank < blcodes; rank++) {
    //Tracev((stderr, "\nbl code %2d ", bl_order[rank]));
    send_bits(s, s.bl_tree[bl_order[rank]*2 + 1]/*.Len*/, 3);
  }
  //Tracev((stderr, "\nbl tree: sent %ld", s->bits_sent));

  send_tree(s, s.dyn_ltree, lcodes-1); /* literal tree */
  //Tracev((stderr, "\nlit tree: sent %ld", s->bits_sent));

  send_tree(s, s.dyn_dtree, dcodes-1); /* distance tree */
  //Tracev((stderr, "\ndist tree: sent %ld", s->bits_sent));
}


/* ===========================================================================
 * Check if the data type is TEXT or BINARY, using the following algorithm:
 * - TEXT if the two conditions below are satisfied:
 *    a) There are no non-portable control characters belonging to the
 *       "black list" (0..6, 14..25, 28..31).
 *    b) There is at least one printable character belonging to the
 *       "white list" (9 {TAB}, 10 {LF}, 13 {CR}, 32..255).
 * - BINARY otherwise.
 * - The following partially-portable control characters form a
 *   "gray list" that is ignored in this detection algorithm:
 *   (7 {BEL}, 8 {BS}, 11 {VT}, 12 {FF}, 26 {SUB}, 27 {ESC}).
 * IN assertion: the fields Freq of dyn_ltree are set.
 */
function detect_data_type(s) {
  /* black_mask is the bit mask of black-listed bytes
   * set bits 0..6, 14..25, and 28..31
   * 0xf3ffc07f = binary 11110011111111111100000001111111
   */
  var black_mask = 0xf3ffc07f;
  var n;

  /* Check for non-textual ("black-listed") bytes. */
  for (n = 0; n <= 31; n++, black_mask >>>= 1) {
    if ((black_mask & 1) && (s.dyn_ltree[n*2]/*.Freq*/ !== 0)) {
      return Z_BINARY;
    }
  }

  /* Check for textual ("white-listed") bytes. */
  if (s.dyn_ltree[9 * 2]/*.Freq*/ !== 0 || s.dyn_ltree[10 * 2]/*.Freq*/ !== 0 ||
      s.dyn_ltree[13 * 2]/*.Freq*/ !== 0) {
    return Z_TEXT;
  }
  for (n = 32; n < LITERALS; n++) {
    if (s.dyn_ltree[n * 2]/*.Freq*/ !== 0) {
      return Z_TEXT;
    }
  }

  /* There are no "black-listed" or "white-listed" bytes:
   * this stream either is empty or has tolerated ("gray-listed") bytes only.
   */
  return Z_BINARY;
}


var static_init_done = false;

/* ===========================================================================
 * Initialize the tree data structures for a new zlib stream.
 */
function _tr_init(s)
{

  if (!static_init_done) {
    tr_static_init();
    static_init_done = true;
  }

  s.l_desc  = new TreeDesc(s.dyn_ltree, static_l_desc);
  s.d_desc  = new TreeDesc(s.dyn_dtree, static_d_desc);
  s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);

  s.bi_buf = 0;
  s.bi_valid = 0;

  /* Initialize the first block of the first file: */
  init_block(s);
}


/* ===========================================================================
 * Send a stored block
 */
function _tr_stored_block(s, buf, stored_len, last)
//DeflateState *s;
//charf *buf;       /* input block */
//ulg stored_len;   /* length of input block */
//int last;         /* one if this is the last block for a file */
{
  send_bits(s, (STORED_BLOCK<<1)+(last ? 1 : 0), 3);    /* send block type */
  copy_block(s, buf, stored_len, true); /* with header */
}


/* ===========================================================================
 * Send one empty static block to give enough lookahead for inflate.
 * This takes 10 bits, of which 7 may remain in the bit buffer.
 */
function _tr_align(s) {
  send_bits(s, STATIC_TREES<<1, 3);
  send_code(s, END_BLOCK, static_ltree);
  bi_flush(s);
}


/* ===========================================================================
 * Determine the best encoding for the current block: dynamic trees, static
 * trees or store, and output the encoded block to the zip file.
 */
function _tr_flush_block(s, buf, stored_len, last)
//DeflateState *s;
//charf *buf;       /* input block, or NULL if too old */
//ulg stored_len;   /* length of input block */
//int last;         /* one if this is the last block for a file */
{
  var opt_lenb, static_lenb;  /* opt_len and static_len in bytes */
  var max_blindex = 0;        /* index of last bit length code of non zero freq */

  /* Build the Huffman trees unless a stored block is forced */
  if (s.level > 0) {

    /* Check if the file is binary or text */
    if (s.strm.data_type === Z_UNKNOWN) {
      s.strm.data_type = detect_data_type(s);
    }

    /* Construct the literal and distance trees */
    build_tree(s, s.l_desc);
    // Tracev((stderr, "\nlit data: dyn %ld, stat %ld", s->opt_len,
    //        s->static_len));

    build_tree(s, s.d_desc);
    // Tracev((stderr, "\ndist data: dyn %ld, stat %ld", s->opt_len,
    //        s->static_len));
    /* At this point, opt_len and static_len are the total bit lengths of
     * the compressed block data, excluding the tree representations.
     */

    /* Build the bit length tree for the above two trees, and get the index
     * in bl_order of the last bit length code to send.
     */
    max_blindex = build_bl_tree(s);

    /* Determine the best encoding. Compute the block lengths in bytes. */
    opt_lenb = (s.opt_len+3+7) >>> 3;
    static_lenb = (s.static_len+3+7) >>> 3;

    // Tracev((stderr, "\nopt %lu(%lu) stat %lu(%lu) stored %lu lit %u ",
    //        opt_lenb, s->opt_len, static_lenb, s->static_len, stored_len,
    //        s->last_lit));

    if (static_lenb <= opt_lenb) { opt_lenb = static_lenb; }

  } else {
    // Assert(buf != (char*)0, "lost buf");
    opt_lenb = static_lenb = stored_len + 5; /* force a stored block */
  }

  if ((stored_len+4 <= opt_lenb) && (buf !== -1)) {
    /* 4: two words for the lengths */

    /* The test buf != NULL is only necessary if LIT_BUFSIZE > WSIZE.
     * Otherwise we can't have processed more than WSIZE input bytes since
     * the last block flush, because compression would have been
     * successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
     * transform a block into a stored block.
     */
    _tr_stored_block(s, buf, stored_len, last);

  } else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {

    send_bits(s, (STATIC_TREES<<1) + (last ? 1 : 0), 3);
    compress_block(s, static_ltree, static_dtree);

  } else {
    send_bits(s, (DYN_TREES<<1) + (last ? 1 : 0), 3);
    send_all_trees(s, s.l_desc.max_code+1, s.d_desc.max_code+1, max_blindex+1);
    compress_block(s, s.dyn_ltree, s.dyn_dtree);
  }
  // Assert (s->compressed_len == s->bits_sent, "bad compressed size");
  /* The above check is made mod 2^32, for files larger than 512 MB
   * and uLong implemented on 32 bits.
   */
  init_block(s);

  if (last) {
    bi_windup(s);
  }
  // Tracev((stderr,"\ncomprlen %lu(%lu) ", s->compressed_len>>3,
  //       s->compressed_len-7*last));
}

/* ===========================================================================
 * Save the match info and tally the frequency counts. Return true if
 * the current block must be flushed.
 */
function _tr_tally(s, dist, lc)
//    deflate_state *s;
//    unsigned dist;  /* distance of matched string */
//    unsigned lc;    /* match length-MIN_MATCH or unmatched char (if dist==0) */
{
  //var out_length, in_length, dcode;

  s.pending_buf[s.d_buf + s.last_lit * 2]     = (dist >>> 8) & 0xff;
  s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 0xff;

  s.pending_buf[s.l_buf + s.last_lit] = lc & 0xff;
  s.last_lit++;

  if (dist === 0) {
    /* lc is the unmatched char */
    s.dyn_ltree[lc*2]/*.Freq*/++;
  } else {
    s.matches++;
    /* Here, lc is the match length - MIN_MATCH */
    dist--;             /* dist = match distance - 1 */
    //Assert((ush)dist < (ush)MAX_DIST(s) &&
    //       (ush)lc <= (ush)(MAX_MATCH-MIN_MATCH) &&
    //       (ush)d_code(dist) < (ush)D_CODES,  "_tr_tally: bad match");

    s.dyn_ltree[(_length_code[lc]+LITERALS+1) * 2]/*.Freq*/++;
    s.dyn_dtree[d_code(dist) * 2]/*.Freq*/++;
  }

// (!) This block is disabled in zlib defailts,
// don't enable it for binary compatibility

//#ifdef TRUNCATE_BLOCK
//  /* Try to guess if it is profitable to stop the current block here */
//  if ((s.last_lit & 0x1fff) === 0 && s.level > 2) {
//    /* Compute an upper bound for the compressed length */
//    out_length = s.last_lit*8;
//    in_length = s.strstart - s.block_start;
//
//    for (dcode = 0; dcode < D_CODES; dcode++) {
//      out_length += s.dyn_dtree[dcode*2]/*.Freq*/ * (5 + extra_dbits[dcode]);
//    }
//    out_length >>>= 3;
//    //Tracev((stderr,"\nlast_lit %u, in %ld, out ~%ld(%ld%%) ",
//    //       s->last_lit, in_length, out_length,
//    //       100L - out_length*100L/in_length));
//    if (s.matches < (s.last_lit>>1)/*int /2*/ && out_length < (in_length>>1)/*int /2*/) {
//      return true;
//    }
//  }
//#endif

  return (s.last_lit === s.lit_bufsize-1);
  /* We avoid equality with lit_bufsize because of wraparound at 64K
   * on 16 bit machines and because stored blocks are restricted to
   * 64K-1 bytes.
   */
}

exports._tr_init  = _tr_init;
exports._tr_stored_block = _tr_stored_block;
exports._tr_flush_block  = _tr_flush_block;
exports._tr_tally = _tr_tally;
exports._tr_align = _tr_align;
},{"../utils/common":77}],87:[function(require,module,exports){
'use strict';


function ZStream() {
  /* next input byte */
  this.input = null; // JS specific, because we have no pointers
  this.next_in = 0;
  /* number of bytes available at input */
  this.avail_in = 0;
  /* total number of input bytes read so far */
  this.total_in = 0;
  /* next output byte should be put there */
  this.output = null; // JS specific, because we have no pointers
  this.next_out = 0;
  /* remaining free space at output */
  this.avail_out = 0;
  /* total number of bytes output so far */
  this.total_out = 0;
  /* last error message, NULL if no error */
  this.msg = ''/*Z_NULL*/;
  /* not visible by applications */
  this.state = null;
  /* best guess about the data type: binary or text */
  this.data_type = 2/*Z_UNKNOWN*/;
  /* adler32 value of the uncompressed data */
  this.adler = 0;
}

module.exports = ZStream;
},{}],88:[function(require,module,exports){
(function (process,Buffer){
var msg = require('pako/lib/zlib/messages');
var zstream = require('pako/lib/zlib/zstream');
var zlib_deflate = require('pako/lib/zlib/deflate.js');
var zlib_inflate = require('pako/lib/zlib/inflate.js');
var constants = require('pako/lib/zlib/constants');

for (var key in constants) {
  exports[key] = constants[key];
}

// zlib modes
exports.NONE = 0;
exports.DEFLATE = 1;
exports.INFLATE = 2;
exports.GZIP = 3;
exports.GUNZIP = 4;
exports.DEFLATERAW = 5;
exports.INFLATERAW = 6;
exports.UNZIP = 7;

/**
 * Emulate Node's zlib C++ layer for use by the JS layer in index.js
 */
function Zlib(mode) {
  if (mode < exports.DEFLATE || mode > exports.UNZIP)
    throw new TypeError("Bad argument");
    
  this.mode = mode;
  this.init_done = false;
  this.write_in_progress = false;
  this.pending_close = false;
  this.windowBits = 0;
  this.level = 0;
  this.memLevel = 0;
  this.strategy = 0;
  this.dictionary = null;
}

Zlib.prototype.init = function(windowBits, level, memLevel, strategy, dictionary) {
  this.windowBits = windowBits;
  this.level = level;
  this.memLevel = memLevel;
  this.strategy = strategy;
  // dictionary not supported.
  
  if (this.mode === exports.GZIP || this.mode === exports.GUNZIP)
    this.windowBits += 16;
    
  if (this.mode === exports.UNZIP)
    this.windowBits += 32;
    
  if (this.mode === exports.DEFLATERAW || this.mode === exports.INFLATERAW)
    this.windowBits = -this.windowBits;
    
  this.strm = new zstream();
  
  switch (this.mode) {
    case exports.DEFLATE:
    case exports.GZIP:
    case exports.DEFLATERAW:
      var status = zlib_deflate.deflateInit2(
        this.strm,
        this.level,
        exports.Z_DEFLATED,
        this.windowBits,
        this.memLevel,
        this.strategy
      );
      break;
    case exports.INFLATE:
    case exports.GUNZIP:
    case exports.INFLATERAW:
    case exports.UNZIP:
      var status  = zlib_inflate.inflateInit2(
        this.strm,
        this.windowBits
      );
      break;
    default:
      throw new Error("Unknown mode " + this.mode);
  }
  
  if (status !== exports.Z_OK) {
    this._error(status);
    return;
  }
  
  this.write_in_progress = false;
  this.init_done = true;
};

Zlib.prototype.params = function() {
  throw new Error("deflateParams Not supported");
};

Zlib.prototype._writeCheck = function() {
  if (!this.init_done)
    throw new Error("write before init");
    
  if (this.mode === exports.NONE)
    throw new Error("already finalized");
    
  if (this.write_in_progress)
    throw new Error("write already in progress");
    
  if (this.pending_close)
    throw new Error("close is pending");
};

Zlib.prototype.write = function(flush, input, in_off, in_len, out, out_off, out_len) {    
  this._writeCheck();
  this.write_in_progress = true;
  
  var self = this;
  process.nextTick(function() {
    self.write_in_progress = false;
    var res = self._write(flush, input, in_off, in_len, out, out_off, out_len);
    self.callback(res[0], res[1]);
    
    if (self.pending_close)
      self.close();
  });
  
  return this;
};

// set method for Node buffers, used by pako
function bufferSet(data, offset) {
  for (var i = 0; i < data.length; i++) {
    this[offset + i] = data[i];
  }
}

Zlib.prototype.writeSync = function(flush, input, in_off, in_len, out, out_off, out_len) {
  this._writeCheck();
  return this._write(flush, input, in_off, in_len, out, out_off, out_len);
};

Zlib.prototype._write = function(flush, input, in_off, in_len, out, out_off, out_len) {
  this.write_in_progress = true;
  
  if (flush !== exports.Z_NO_FLUSH &&
      flush !== exports.Z_PARTIAL_FLUSH &&
      flush !== exports.Z_SYNC_FLUSH &&
      flush !== exports.Z_FULL_FLUSH &&
      flush !== exports.Z_FINISH &&
      flush !== exports.Z_BLOCK) {
    throw new Error("Invalid flush value");
  }
  
  if (input == null) {
    input = new Buffer(0);
    in_len = 0;
    in_off = 0;
  }
  
  if (out._set)
    out.set = out._set;
  else
    out.set = bufferSet;
  
  var strm = this.strm;
  strm.avail_in = in_len;
  strm.input = input;
  strm.next_in = in_off;
  strm.avail_out = out_len;
  strm.output = out;
  strm.next_out = out_off;
  
  switch (this.mode) {
    case exports.DEFLATE:
    case exports.GZIP:
    case exports.DEFLATERAW:
      var status = zlib_deflate.deflate(strm, flush);
      break;
    case exports.UNZIP:
    case exports.INFLATE:
    case exports.GUNZIP:
    case exports.INFLATERAW:
      var status = zlib_inflate.inflate(strm, flush);
      break;
    default:
      throw new Error("Unknown mode " + this.mode);
  }
  
  if (status !== exports.Z_STREAM_END && status !== exports.Z_OK) {
    this._error(status);
  }
  
  this.write_in_progress = false;
  return [strm.avail_in, strm.avail_out];
};

Zlib.prototype.close = function() {
  if (this.write_in_progress) {
    this.pending_close = true;
    return;
  }
  
  this.pending_close = false;
  
  if (this.mode === exports.DEFLATE || this.mode === exports.GZIP || this.mode === exports.DEFLATERAW) {
    zlib_deflate.deflateEnd(this.strm);
  } else {
    zlib_inflate.inflateEnd(this.strm);
  }
  
  this.mode = exports.NONE;
};

Zlib.prototype.reset = function() {
  switch (this.mode) {
    case exports.DEFLATE:
    case exports.DEFLATERAW:
      var status = zlib_deflate.deflateReset(this.strm);
      break;
    case exports.INFLATE:
    case exports.INFLATERAW:
      var status = zlib_inflate.inflateReset(this.strm);
      break;
  }
  
  if (status !== exports.Z_OK) {
    this._error(status);
  }
};

Zlib.prototype._error = function(status) {
  this.onerror(msg[status] + ': ' + this.strm.msg, status);
  
  this.write_in_progress = false;
  if (this.pending_close)
    this.close();
};

exports.Zlib = Zlib;

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":98,"buffer":90,"pako/lib/zlib/constants":79,"pako/lib/zlib/deflate.js":81,"pako/lib/zlib/inflate.js":83,"pako/lib/zlib/messages":85,"pako/lib/zlib/zstream":87}],89:[function(require,module,exports){
(function (process,Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Transform = require('_stream_transform');

var binding = require('./binding');
var util = require('util');
var assert = require('assert').ok;

// zlib doesn't provide these, so kludge them in following the same
// const naming scheme zlib uses.
binding.Z_MIN_WINDOWBITS = 8;
binding.Z_MAX_WINDOWBITS = 15;
binding.Z_DEFAULT_WINDOWBITS = 15;

// fewer than 64 bytes per chunk is stupid.
// technically it could work with as few as 8, but even 64 bytes
// is absurdly low.  Usually a MB or more is best.
binding.Z_MIN_CHUNK = 64;
binding.Z_MAX_CHUNK = Infinity;
binding.Z_DEFAULT_CHUNK = (16 * 1024);

binding.Z_MIN_MEMLEVEL = 1;
binding.Z_MAX_MEMLEVEL = 9;
binding.Z_DEFAULT_MEMLEVEL = 8;

binding.Z_MIN_LEVEL = -1;
binding.Z_MAX_LEVEL = 9;
binding.Z_DEFAULT_LEVEL = binding.Z_DEFAULT_COMPRESSION;

// expose all the zlib constants
Object.keys(binding).forEach(function(k) {
  if (k.match(/^Z/)) exports[k] = binding[k];
});

// translation table for return codes.
exports.codes = {
  Z_OK: binding.Z_OK,
  Z_STREAM_END: binding.Z_STREAM_END,
  Z_NEED_DICT: binding.Z_NEED_DICT,
  Z_ERRNO: binding.Z_ERRNO,
  Z_STREAM_ERROR: binding.Z_STREAM_ERROR,
  Z_DATA_ERROR: binding.Z_DATA_ERROR,
  Z_MEM_ERROR: binding.Z_MEM_ERROR,
  Z_BUF_ERROR: binding.Z_BUF_ERROR,
  Z_VERSION_ERROR: binding.Z_VERSION_ERROR
};

Object.keys(exports.codes).forEach(function(k) {
  exports.codes[exports.codes[k]] = k;
});

exports.Deflate = Deflate;
exports.Inflate = Inflate;
exports.Gzip = Gzip;
exports.Gunzip = Gunzip;
exports.DeflateRaw = DeflateRaw;
exports.InflateRaw = InflateRaw;
exports.Unzip = Unzip;

exports.createDeflate = function(o) {
  return new Deflate(o);
};

exports.createInflate = function(o) {
  return new Inflate(o);
};

exports.createDeflateRaw = function(o) {
  return new DeflateRaw(o);
};

exports.createInflateRaw = function(o) {
  return new InflateRaw(o);
};

exports.createGzip = function(o) {
  return new Gzip(o);
};

exports.createGunzip = function(o) {
  return new Gunzip(o);
};

exports.createUnzip = function(o) {
  return new Unzip(o);
};


// Convenience methods.
// compress/decompress a string or buffer in one step.
exports.deflate = function(buffer, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  return zlibBuffer(new Deflate(opts), buffer, callback);
};

exports.deflateSync = function(buffer, opts) {
  return zlibBufferSync(new Deflate(opts), buffer);
};

exports.gzip = function(buffer, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  return zlibBuffer(new Gzip(opts), buffer, callback);
};

exports.gzipSync = function(buffer, opts) {
  return zlibBufferSync(new Gzip(opts), buffer);
};

exports.deflateRaw = function(buffer, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  return zlibBuffer(new DeflateRaw(opts), buffer, callback);
};

exports.deflateRawSync = function(buffer, opts) {
  return zlibBufferSync(new DeflateRaw(opts), buffer);
};

exports.unzip = function(buffer, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  return zlibBuffer(new Unzip(opts), buffer, callback);
};

exports.unzipSync = function(buffer, opts) {
  return zlibBufferSync(new Unzip(opts), buffer);
};

exports.inflate = function(buffer, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  return zlibBuffer(new Inflate(opts), buffer, callback);
};

exports.inflateSync = function(buffer, opts) {
  return zlibBufferSync(new Inflate(opts), buffer);
};

exports.gunzip = function(buffer, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  return zlibBuffer(new Gunzip(opts), buffer, callback);
};

exports.gunzipSync = function(buffer, opts) {
  return zlibBufferSync(new Gunzip(opts), buffer);
};

exports.inflateRaw = function(buffer, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  return zlibBuffer(new InflateRaw(opts), buffer, callback);
};

exports.inflateRawSync = function(buffer, opts) {
  return zlibBufferSync(new InflateRaw(opts), buffer);
};

function zlibBuffer(engine, buffer, callback) {
  var buffers = [];
  var nread = 0;

  engine.on('error', onError);
  engine.on('end', onEnd);

  engine.end(buffer);
  flow();

  function flow() {
    var chunk;
    while (null !== (chunk = engine.read())) {
      buffers.push(chunk);
      nread += chunk.length;
    }
    engine.once('readable', flow);
  }

  function onError(err) {
    engine.removeListener('end', onEnd);
    engine.removeListener('readable', flow);
    callback(err);
  }

  function onEnd() {
    var buf = Buffer.concat(buffers, nread);
    buffers = [];
    callback(null, buf);
    engine.close();
  }
}

function zlibBufferSync(engine, buffer) {
  if (typeof buffer === 'string')
    buffer = new Buffer(buffer);
  if (!Buffer.isBuffer(buffer))
    throw new TypeError('Not a string or buffer');

  var flushFlag = binding.Z_FINISH;

  return engine._processChunk(buffer, flushFlag);
}

// generic zlib
// minimal 2-byte header
function Deflate(opts) {
  if (!(this instanceof Deflate)) return new Deflate(opts);
  Zlib.call(this, opts, binding.DEFLATE);
}

function Inflate(opts) {
  if (!(this instanceof Inflate)) return new Inflate(opts);
  Zlib.call(this, opts, binding.INFLATE);
}



// gzip - bigger header, same deflate compression
function Gzip(opts) {
  if (!(this instanceof Gzip)) return new Gzip(opts);
  Zlib.call(this, opts, binding.GZIP);
}

function Gunzip(opts) {
  if (!(this instanceof Gunzip)) return new Gunzip(opts);
  Zlib.call(this, opts, binding.GUNZIP);
}



// raw - no header
function DeflateRaw(opts) {
  if (!(this instanceof DeflateRaw)) return new DeflateRaw(opts);
  Zlib.call(this, opts, binding.DEFLATERAW);
}

function InflateRaw(opts) {
  if (!(this instanceof InflateRaw)) return new InflateRaw(opts);
  Zlib.call(this, opts, binding.INFLATERAW);
}


// auto-detect header.
function Unzip(opts) {
  if (!(this instanceof Unzip)) return new Unzip(opts);
  Zlib.call(this, opts, binding.UNZIP);
}


// the Zlib class they all inherit from
// This thing manages the queue of requests, and returns
// true or false if there is anything in the queue when
// you call the .write() method.

function Zlib(opts, mode) {
  this._opts = opts = opts || {};
  this._chunkSize = opts.chunkSize || exports.Z_DEFAULT_CHUNK;

  Transform.call(this, opts);

  if (opts.flush) {
    if (opts.flush !== binding.Z_NO_FLUSH &&
        opts.flush !== binding.Z_PARTIAL_FLUSH &&
        opts.flush !== binding.Z_SYNC_FLUSH &&
        opts.flush !== binding.Z_FULL_FLUSH &&
        opts.flush !== binding.Z_FINISH &&
        opts.flush !== binding.Z_BLOCK) {
      throw new Error('Invalid flush flag: ' + opts.flush);
    }
  }
  this._flushFlag = opts.flush || binding.Z_NO_FLUSH;

  if (opts.chunkSize) {
    if (opts.chunkSize < exports.Z_MIN_CHUNK ||
        opts.chunkSize > exports.Z_MAX_CHUNK) {
      throw new Error('Invalid chunk size: ' + opts.chunkSize);
    }
  }

  if (opts.windowBits) {
    if (opts.windowBits < exports.Z_MIN_WINDOWBITS ||
        opts.windowBits > exports.Z_MAX_WINDOWBITS) {
      throw new Error('Invalid windowBits: ' + opts.windowBits);
    }
  }

  if (opts.level) {
    if (opts.level < exports.Z_MIN_LEVEL ||
        opts.level > exports.Z_MAX_LEVEL) {
      throw new Error('Invalid compression level: ' + opts.level);
    }
  }

  if (opts.memLevel) {
    if (opts.memLevel < exports.Z_MIN_MEMLEVEL ||
        opts.memLevel > exports.Z_MAX_MEMLEVEL) {
      throw new Error('Invalid memLevel: ' + opts.memLevel);
    }
  }

  if (opts.strategy) {
    if (opts.strategy != exports.Z_FILTERED &&
        opts.strategy != exports.Z_HUFFMAN_ONLY &&
        opts.strategy != exports.Z_RLE &&
        opts.strategy != exports.Z_FIXED &&
        opts.strategy != exports.Z_DEFAULT_STRATEGY) {
      throw new Error('Invalid strategy: ' + opts.strategy);
    }
  }

  if (opts.dictionary) {
    if (!Buffer.isBuffer(opts.dictionary)) {
      throw new Error('Invalid dictionary: it should be a Buffer instance');
    }
  }

  this._binding = new binding.Zlib(mode);

  var self = this;
  this._hadError = false;
  this._binding.onerror = function(message, errno) {
    // there is no way to cleanly recover.
    // continuing only obscures problems.
    self._binding = null;
    self._hadError = true;

    var error = new Error(message);
    error.errno = errno;
    error.code = exports.codes[errno];
    self.emit('error', error);
  };

  var level = exports.Z_DEFAULT_COMPRESSION;
  if (typeof opts.level === 'number') level = opts.level;

  var strategy = exports.Z_DEFAULT_STRATEGY;
  if (typeof opts.strategy === 'number') strategy = opts.strategy;

  this._binding.init(opts.windowBits || exports.Z_DEFAULT_WINDOWBITS,
                     level,
                     opts.memLevel || exports.Z_DEFAULT_MEMLEVEL,
                     strategy,
                     opts.dictionary);

  this._buffer = new Buffer(this._chunkSize);
  this._offset = 0;
  this._closed = false;
  this._level = level;
  this._strategy = strategy;

  this.once('end', this.close);
}

util.inherits(Zlib, Transform);

Zlib.prototype.params = function(level, strategy, callback) {
  if (level < exports.Z_MIN_LEVEL ||
      level > exports.Z_MAX_LEVEL) {
    throw new RangeError('Invalid compression level: ' + level);
  }
  if (strategy != exports.Z_FILTERED &&
      strategy != exports.Z_HUFFMAN_ONLY &&
      strategy != exports.Z_RLE &&
      strategy != exports.Z_FIXED &&
      strategy != exports.Z_DEFAULT_STRATEGY) {
    throw new TypeError('Invalid strategy: ' + strategy);
  }

  if (this._level !== level || this._strategy !== strategy) {
    var self = this;
    this.flush(binding.Z_SYNC_FLUSH, function() {
      self._binding.params(level, strategy);
      if (!self._hadError) {
        self._level = level;
        self._strategy = strategy;
        if (callback) callback();
      }
    });
  } else {
    process.nextTick(callback);
  }
};

Zlib.prototype.reset = function() {
  return this._binding.reset();
};

// This is the _flush function called by the transform class,
// internally, when the last chunk has been written.
Zlib.prototype._flush = function(callback) {
  this._transform(new Buffer(0), '', callback);
};

Zlib.prototype.flush = function(kind, callback) {
  var ws = this._writableState;

  if (typeof kind === 'function' || (kind === void 0 && !callback)) {
    callback = kind;
    kind = binding.Z_FULL_FLUSH;
  }

  if (ws.ended) {
    if (callback)
      process.nextTick(callback);
  } else if (ws.ending) {
    if (callback)
      this.once('end', callback);
  } else if (ws.needDrain) {
    var self = this;
    this.once('drain', function() {
      self.flush(callback);
    });
  } else {
    this._flushFlag = kind;
    this.write(new Buffer(0), '', callback);
  }
};

Zlib.prototype.close = function(callback) {
  if (callback)
    process.nextTick(callback);

  if (this._closed)
    return;

  this._closed = true;

  this._binding.close();

  var self = this;
  process.nextTick(function() {
    self.emit('close');
  });
};

Zlib.prototype._transform = function(chunk, encoding, cb) {
  var flushFlag;
  var ws = this._writableState;
  var ending = ws.ending || ws.ended;
  var last = ending && (!chunk || ws.length === chunk.length);

  if (!chunk === null && !Buffer.isBuffer(chunk))
    return cb(new Error('invalid input'));

  // If it's the last chunk, or a final flush, we use the Z_FINISH flush flag.
  // If it's explicitly flushing at some other time, then we use
  // Z_FULL_FLUSH. Otherwise, use Z_NO_FLUSH for maximum compression
  // goodness.
  if (last)
    flushFlag = binding.Z_FINISH;
  else {
    flushFlag = this._flushFlag;
    // once we've flushed the last of the queue, stop flushing and
    // go back to the normal behavior.
    if (chunk.length >= ws.length) {
      this._flushFlag = this._opts.flush || binding.Z_NO_FLUSH;
    }
  }

  var self = this;
  this._processChunk(chunk, flushFlag, cb);
};

Zlib.prototype._processChunk = function(chunk, flushFlag, cb) {
  var availInBefore = chunk && chunk.length;
  var availOutBefore = this._chunkSize - this._offset;
  var inOff = 0;

  var self = this;

  var async = typeof cb === 'function';

  if (!async) {
    var buffers = [];
    var nread = 0;

    var error;
    this.on('error', function(er) {
      error = er;
    });

    do {
      var res = this._binding.writeSync(flushFlag,
                                        chunk, // in
                                        inOff, // in_off
                                        availInBefore, // in_len
                                        this._buffer, // out
                                        this._offset, //out_off
                                        availOutBefore); // out_len
    } while (!this._hadError && callback(res[0], res[1]));

    if (this._hadError) {
      throw error;
    }

    var buf = Buffer.concat(buffers, nread);
    this.close();

    return buf;
  }

  var req = this._binding.write(flushFlag,
                                chunk, // in
                                inOff, // in_off
                                availInBefore, // in_len
                                this._buffer, // out
                                this._offset, //out_off
                                availOutBefore); // out_len

  req.buffer = chunk;
  req.callback = callback;

  function callback(availInAfter, availOutAfter) {
    if (self._hadError)
      return;

    var have = availOutBefore - availOutAfter;
    assert(have >= 0, 'have should not go down');

    if (have > 0) {
      var out = self._buffer.slice(self._offset, self._offset + have);
      self._offset += have;
      // serve some output to the consumer.
      if (async) {
        self.push(out);
      } else {
        buffers.push(out);
        nread += out.length;
      }
    }

    // exhausted the output buffer, or used all the input create a new one.
    if (availOutAfter === 0 || self._offset >= self._chunkSize) {
      availOutBefore = self._chunkSize;
      self._offset = 0;
      self._buffer = new Buffer(self._chunkSize);
    }

    if (availOutAfter === 0) {
      // Not actually done.  Need to reprocess.
      // Also, update the availInBefore to the availInAfter value,
      // so that if we have to hit it a third (fourth, etc.) time,
      // it'll have the correct byte counts.
      inOff += (availInBefore - availInAfter);
      availInBefore = availInAfter;

      if (!async)
        return true;

      var newReq = self._binding.write(flushFlag,
                                       chunk,
                                       inOff,
                                       availInBefore,
                                       self._buffer,
                                       self._offset,
                                       self._chunkSize);
      newReq.callback = callback; // this same function
      newReq.buffer = chunk;
      return;
    }

    if (!async)
      return false;

    // finished with the chunk.
    cb();
  }
};

util.inherits(Deflate, Zlib);
util.inherits(Inflate, Zlib);
util.inherits(Gzip, Zlib);
util.inherits(Gunzip, Zlib);
util.inherits(DeflateRaw, Zlib);
util.inherits(InflateRaw, Zlib);
util.inherits(Unzip, Zlib);

}).call(this,require('_process'),require("buffer").Buffer)
},{"./binding":88,"_process":98,"_stream_transform":108,"assert":76,"buffer":90,"util":113}],90:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff
var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Find the length
  var length
  if (type === 'number')
    length = subject > 0 ? subject >>> 0 : 0
  else if (type === 'string') {
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
  } else
    throw new TypeError('must start with number, buffer, array or string')

  if (length > kMaxLength)
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
      'size: 0x' + kMaxLength.toString(16) + ' bytes')

  var buf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  if (length > 0 && length <= Buffer.poolSize)
    buf.parent = rootParent

  return buf
}

function SlowBuffer(subject, encoding, noZero) {
  if (!(this instanceof SlowBuffer))
    return new SlowBuffer(subject, encoding, noZero)

  var buf = new Buffer(subject, encoding, noZero)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b))
    throw new TypeError('Arguments must be Buffers')

  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) throw new TypeError('Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    case 'hex':
      ret = str.length >>> 1
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    default:
      ret = str.length
  }
  return ret
}

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function (encoding, start, end) {
  var loweredCase = false

  start = start >>> 0
  end = end === undefined || end === Infinity ? this.length : end >>> 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase)
          throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max)
      str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(byte)) throw new Error('Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length, 2)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0

  if (length < 0 || offset < 0 || offset > this.length)
    throw new RangeError('attempt to write outside buffer bounds');

  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new TypeError('Unknown encoding: ' + encoding)
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len;
    if (start < 0)
      start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0)
      end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start)
    end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length)
    newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0)
    throw new RangeError('offset is not uint')
  if (offset + ext > length)
    throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100))
    val += this[offset + i] * mul

  return val
}

Buffer.prototype.readUIntBE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100))
    val += this[offset + --byteLength] * mul;

  return val
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
      ((this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3])
}

Buffer.prototype.readIntLE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100))
    val += this[offset + i] * mul
  mul *= 0x80

  if (val >= mul)
    val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100))
    val += this[offset + --i] * mul
  mul *= 0x80

  if (val >= mul)
    val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80))
    return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      (this[offset + 3])
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100))
    this[offset + i] = (value / mul) >>> 0 & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100))
    this[offset + i] = (value / mul) >>> 0 & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

Buffer.prototype.writeIntLE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkInt(this,
             value,
             offset,
             byteLength,
             Math.pow(2, 8 * byteLength - 1) - 1,
             -Math.pow(2, 8 * byteLength - 1))
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100))
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkInt(this,
             value,
             offset,
             byteLength,
             Math.pow(2, 8 * byteLength - 1) - 1,
             -Math.pow(2, 8 * byteLength - 1))
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100))
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (target_start >= target.length) target_start = target.length
  if (!target_start) target_start = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || source.length === 0) return 0

  // Fatal error conditions
  if (target_start < 0)
    throw new RangeError('targetStart out of bounds')
  if (start < 0 || start >= source.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes(string, units) {
  var codePoint, length = string.length
  var leadSurrogate = null
  units = units || Infinity
  var bytes = []
  var i = 0

  for (; i<length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {

      // last char was a lead
      if (leadSurrogate) {

        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        }

        // valid surrogate pair
        else {
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      }

      // no lead yet
      else {

        // unexpected trail
        if (codePoint > 0xDBFF) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // unpaired lead
        else if (i + 1 === length) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        else {
          leadSurrogate = codePoint
          continue
        }
      }
    }

    // valid bmp char, but last char was a lead
    else if (leadSurrogate) {
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    }
    else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      );
    }
    else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    }
    else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    }
    else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {

    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length, unitSize) {
  if (unitSize) length -= length % unitSize;
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":91,"ieee754":92,"is-array":93}],91:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],92:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],93:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],94:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],95:[function(require,module,exports){
arguments[4][62][0].apply(exports,arguments)
},{"dup":62}],96:[function(require,module,exports){
arguments[4][59][0].apply(exports,arguments)
},{"dup":59}],97:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":98}],98:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],99:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":100}],100:[function(require,module,exports){
arguments[4][53][0].apply(exports,arguments)
},{"./_stream_readable":102,"./_stream_writable":104,"_process":98,"core-util-is":105,"dup":53,"inherits":95}],101:[function(require,module,exports){
arguments[4][54][0].apply(exports,arguments)
},{"./_stream_transform":103,"core-util-is":105,"dup":54,"inherits":95}],102:[function(require,module,exports){
arguments[4][55][0].apply(exports,arguments)
},{"_process":98,"buffer":90,"core-util-is":105,"dup":55,"events":94,"inherits":95,"isarray":96,"stream":110,"string_decoder/":111}],103:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"./_stream_duplex":100,"core-util-is":105,"dup":56,"inherits":95}],104:[function(require,module,exports){
arguments[4][57][0].apply(exports,arguments)
},{"./_stream_duplex":100,"_process":98,"buffer":90,"core-util-is":105,"dup":57,"inherits":95,"stream":110}],105:[function(require,module,exports){
arguments[4][58][0].apply(exports,arguments)
},{"buffer":90,"dup":58}],106:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":101}],107:[function(require,module,exports){
arguments[4][61][0].apply(exports,arguments)
},{"./lib/_stream_duplex.js":100,"./lib/_stream_passthrough.js":101,"./lib/_stream_readable.js":102,"./lib/_stream_transform.js":103,"./lib/_stream_writable.js":104,"dup":61,"stream":110}],108:[function(require,module,exports){
arguments[4][70][0].apply(exports,arguments)
},{"./lib/_stream_transform.js":103,"dup":70}],109:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":104}],110:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":94,"inherits":95,"readable-stream/duplex.js":99,"readable-stream/passthrough.js":106,"readable-stream/readable.js":107,"readable-stream/transform.js":108,"readable-stream/writable.js":109}],111:[function(require,module,exports){
arguments[4][60][0].apply(exports,arguments)
},{"buffer":90,"dup":60}],112:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],113:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":112,"_process":98,"inherits":95}]},{},[2]);
