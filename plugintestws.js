'use strict';

var WebSocket = require('ws');
var url = 'ws://localhost:24444/server';
var ws = new WebSocket(url);
console.log('connecting to ',url);

ws.on('message', function(data, flags) {
  console.log('message',data,data.toString(),flags);
});
ws.on('open', function() {
  console.log('opened');
  ws.send('hello', {binary:true});
});
ws.on('error', function() {
  console.log('error',arguments);
});
