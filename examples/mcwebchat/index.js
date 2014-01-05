var WebSocket = require('ws');
var ever = require('ever');
var tellraw2dom = require('tellraw2dom');

var ws = new WebSocket('ws://localhost:1234');
console.log('ws',ws);
ever(ws).on('open', function() {
  console.log('opened');
  //ws.send('hey'); // TODO: user input
});

var outputNode = document.getElementById('output');
var inputNode = document.getElementById('input');

ever(ws).on('message', function(event, flags) {
  var packet = JSON.parse(event.data);
  var name = packet[0], payload = packet[1];
  
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
  }
});

ever(document.body).on('keyup', function(event) {
  if (event.keyCode !== 13) return;

  var input = inputNode.value;
  ws.send(JSON.stringify(['chat_message', {message: input}])); // just send it raw
  
  inputNode.value = '';
});
