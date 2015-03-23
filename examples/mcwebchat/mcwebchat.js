var mineflayer = require('../../mineflayer-ws');
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
