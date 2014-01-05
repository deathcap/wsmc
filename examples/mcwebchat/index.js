var WebSocket = require('ws');
var ever = require('ever');
var tellraw2dom = require('tellraw2dom');

var ws = new WebSocket('ws://localhost:1234');
console.log('ws',ws);
ever(ws).on('open', function() {
  console.log('opened');
  //ws.send('hey'); // TODO: user input
});
ever(ws).on('message', function(event, flags) {
  var packet = JSON.parse(event.data);
  var name = packet[0], payload = packet[1];
  
  if (name === 'chat') {
    console.log(payload);
    console.log('m=',payload.message);

    if (payload.message)
      document.body.appendChild(tellraw2dom(payload.message));
      document.body.appendChild(document.createElement('br'));
  }
});

document.write('hi');
