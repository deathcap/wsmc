
mc = require 'minecraft-protocol'
WebSocketServer = (require 'ws').Server

client = mc.createClient
  host: 'localhost'
  port: 25565
  username: 'webuser'
  password: null

states = mc.protocol.states
ids = mc.protocol.packetIDs.play.toClient
sids = mc.protocol.packetIDs.play.toServer

client.on 'packet', (p) ->

  name = mc.protocol.packetNames.play.toClient[p.id]
  #console.log p.id
  #return if name.indexOf('entity_') == 0  # skip noisy packets

  #console.log name, p

client.on 'connect', () ->
  console.log 'Successfully connected'

client.on [states.PLAY, ids.chat], (p) ->
  #client.write sids.chat_message, {message: 'test'}
  #console.log "Chat: #{p}"

client.on [states.PLAY, ids.disconnect], (p) ->
  console.log "Kicked for #{p.reason}"


wss = new WebSocketServer {port: 1234}
wss.on 'connection', (ws) ->
  ws.on 'message', (msg) ->
    console.log "websocket received: #{msg}"
  ws.send 'hello'

