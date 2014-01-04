
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


  ws.on 'message', (raw) ->
    console.log "websocket received: #{raw}"
    try
      array = JSON.parse(raw)
    catch e
      console.log "bad message from websocket client, invalid JSON: #{raw}"
      return

    if array.length != 2
      console.log "bad message from websocket client, invalid format: #{raw}"
      return

    # [id, payload]

    id = array[0]
    if typeof id == 'string'
      id = sids[id]

    if not id?
      console.log "bad message from websocket client, no such id '#{array[0]}': #{raw}"
      return

    payload = array[1]

    client.write id, payload


