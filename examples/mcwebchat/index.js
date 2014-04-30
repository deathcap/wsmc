var websocket_stream = require('websocket-stream');
var minecraft_protocol = require('minecraft-protocol');
var tellraw2dom = require('tellraw2dom');

var outputNode = document.getElementById('output');
var inputNode = document.getElementById('input');

var log = function(s) {
  outputNode.appendChild(document.createTextNode(s));
  outputNode.appendChild(document.createElement('br'));
}

var ws = websocket_stream('ws://localhost:1234', {type: Uint8Array});
console.log('ws',ws);
/*
ws.addEventListener('open', function() {
  log('Successfully connected to WebSocket');
});
*/

ws.on('error', function(exception) {
  console.log(exception);
  if (exception.currentTarget)
    log('WebSocket error connecting to ' + exception.currentTarget.URL);
  else
    log('WebSocket error: ' + exception);
});

ws.on('close', function() {
  console.log('WebSocket closed');
});

// decode the binary packet
var decodePacket = function(data) {
  if (!(data instanceof Uint8Array)) {
    return undefined;
  }

  // convert typed array to NodeJS buffer for minecraft-protocol's API
  // TODO: is this conversion fast? backed by ArrayBuffer in Browserify 3, see https://npmjs.org/package/native-buffer-browserify
  //  but is this the right way to "convert" from an ArrayBuffer to a Buffer, without copying?
  data._isBuffer = true;
  var buffer = new Buffer(data);

  var state = minecraft_protocol.protocol.states.PLAY;
  var isServer = false;
  var shouldParsePayload = {packet: 1}; // somehow this is needed to parse the fields TODO: figure out how this is supposed to work

  var result = minecraft_protocol.protocol.parsePacket(buffer, state, isServer, shouldParsePayload);
  if (!result || result.error) {
    log('protocol parse error: ' + JSON.stringify(result.error));
    return;
  }
  var payload = result.results;
  var id = result.results.id;
  var name = minecraft_protocol.protocol.packetNames[state].toClient[id];


  return {name:name, id:id, payload:payload};
};

var handlePacket = function(id, name, payload) {
  // show formatted chat
  if (name === 'chat') {
    console.log(payload);

    if (payload.message) {
      outputNode.appendChild(tellraw2dom(payload.message));
      try {
        outputNode.appendChild(document.createElement('br'));
      } catch (error) {
        outputNode.appendChild(document.createTextNode('error: ' + error));
      }
    }
  // log a few other interesting messages
  } else if (name === 'disconnect') {
    log('Kicked by server! Reason: ' + payload.reason);
  } else if (name === 'spawn_position') {
    log('Spawned at ('+payload.x+','+payload.y+','+payload.z+')');
  } else if (name === 'player_info') {
    if (payload.online)
      log('Ping: ' + payload.playerName + ' ('+payload.ping+' ms)');
  }
};

ws.on('data', function(data) {
  var packet = decodePacket(data);
  if (!packet) return;

  handlePacket(packet.id, packet.name, packet.payload);
});

document.body.addEventListener('keyup', function(event) {
  if (event.keyCode !== 13) return;

  var input = inputNode.value;
  var data = minecraft_protocol.protocol.createPacketBuffer('chat', {message: input});
  console.log('sending data',data);

  ws.write(data);
  
  inputNode.value = '';
});
