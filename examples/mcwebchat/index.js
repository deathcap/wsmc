var websocket_stream = require('websocket-stream');
var minecraft_protocol = require('minecraft-protocol');
window.m = minecraft_protocol;
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
  log('WebSocket error connecting to: ' + exception.currentTarget.URL);
});

ws.on('close', function() {
  console.log('WebSocket closed');
});

ws.on('data', function(data) {
  if (!(data instanceof Uint8Array)) {
    return;
  }

  // decode the binary packet

  // convert typed array to NodeJS buffer for minecraft-protocol's API
  // unfortunately, this performs a copy (inefficient) TODO: change minecraft-protocol?
  // http://nodejs.org/api/buffer.html#buffer_buffer
  // see http://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer#12101012
  var buffer = new Buffer(data);

  var state = minecraft_protocol.protocol.states.PLAY;
  var isServer = false;
  var shouldParsePayload = true;

  var result = minecraft_protocol.protocol.parsePacket(buffer, state, isServer, shouldParsePayload);
  if (result.error) {
    log('protocol parse error: ' + JSON.stringify(result.error));
    return;
  }
  var payload = result.results;
  var id = result.results.id;
  var name = minecraft_protocol.protocol.packetNames[state].toClient[id];


  // handle it

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
  } else if (name === 'player_list_item') {
    if (payload.online)
      log('Ping: ' + payload.playerName + ' ('+payload.ping+' ms)');
  }
});

document.body.addEventListener('keyup', function(event) {
  if (event.keyCode !== 13) return;

  var input = inputNode.value;
  ws.write(JSON.stringify(['chat_message', {message: input}]));
  
  inputNode.value = '';
});
