var WebSocket = require('ws');
var ever = require('ever');

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
    document.write(JSON.stringify(packet)); // TODO: HTML
  }
});

document.write('hi');
