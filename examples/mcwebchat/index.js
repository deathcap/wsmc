var websocket_stream = require('websocket-stream');
var tellraw2dom = require('tellraw2dom');

var outputNode = document.getElementById('output');
var inputNode = document.getElementById('input');

var log = function(s) {
  outputNode.appendChild(document.createTextNode(s));
  outputNode.appendChild(document.createElement('br'));
}

var ws = websocket_stream('ws://localhost:1234');
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
  var packet = JSON.parse(data);
  var name = packet[0], payload = packet[1];

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
