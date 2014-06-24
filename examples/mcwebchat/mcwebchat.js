var mineflayer = require('mineflayer');

var websocket_stream = require('websocket-stream');
var minecraft_protocol = require('minecraft-protocol');
var tellraw2dom = require('tellraw2dom');

var outputNode = document.getElementById('output');
var inputNode = document.getElementById('input');

var log = function(s) {
  outputNode.appendChild(document.createTextNode(s));
  outputNode.appendChild(document.createElement('br'));
}

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
bot.on('chat', function(username, message) {
  log('<'+username+'> '+message); // TODO: change to tellraw2dom raw message, instead of getting preparsed (strips colors, etc.)
});

bot.on('error', function(exception) {
  console.log(exception);
  if (exception.currentTarget)
    log('WebSocket error connecting to ' + exception.currentTarget.URL);
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
