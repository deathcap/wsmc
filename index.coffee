
mc = require 'minecraft-protocol'
WebSocketServer = (require 'ws').Server

states = mc.protocol.states
ids = mc.protocol.packetIDs.play.toClient
sids = mc.protocol.packetIDs.play.toServer

wss = new WebSocketServer {port: 1234}
wss.on 'connection', (ws) ->
  ws.send 'hello'

  client = mc.createClient
    host: 'localhost'
    port: 25565
    username: 'webuser'
    password: null

  ws.on 'close', () ->
    console.log 'WebSocket disconnected, closing MC'
    client.socket.end()

  client.on 'packet', (p) ->

    name = mc.protocol.packetNames.play.toClient[p.id]
    #console.log p.id
    #return if name.indexOf('entity_') == 0  # skip noisy packets

    p.name = name
    ws.send JSON.stringify(p)

  client.on 'connect', () ->
    console.log 'Successfully connected to MC'

  client.on [states.PLAY, ids.chat], (p) ->
    #client.write sids.chat_message, {message: 'test'}
    #console.log "Chat: #{p}"

  client.on [states.PLAY, ids.disconnect], (p) ->
    console.log "Kicked for #{p.reason}"


  ws.on 'message', (msg) ->
    console.log "websocket received: #{msg}"
    try
      p = JSON.parse(msg)
    catch e
      console.log "bad message from websocket client, invalid JSON: #{msg}"
      return

    id = p.id ? sids[p.name]
    if not id?
      console.log "bad message from websocket client, no such id #{p.name}: #{msg}"
      return

    # just the payload
    delete p.name
    delete p.id

    client.write id, p


