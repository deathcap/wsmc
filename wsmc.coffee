
minecraft_protocol = require 'minecraft-protocol'
WebSocketServer = (require 'ws').Server
websocket_stream = require 'websocket-stream'
argv = (require 'optimist')
  .default('wshost', '0.0.0.0')
  .default('wsport', 1234)
  .default('mchost', 'localhost')
  .default('mcport', 25565)
  .default('prefix', 'webuser-')
  .argv

console.log "WS(#{argv.wshost}:#{argv.wsport}) <--> MC(#{argv.mchost}:#{argv.mcport})"

states = minecraft_protocol.protocol.states
ids = minecraft_protocol.protocol.packetIDs.play.toClient
sids = minecraft_protocol.protocol.packetIDs.play.toServer


userIndex = 1

wss = new WebSocketServer
  host: argv.wshost
  port: argv.wsport

wss.on 'connection', (new_websocket_connection) ->
  ws = websocket_stream(new_websocket_connection)

  ws.write 'welcome'

  mc = minecraft_protocol.createClient
    host: argv.mchost
    port: argv.mcport
    username: argv.prefix + userIndex
    password: null
    parsePayload: false

  userIndex += 1

  ws.on 'close', () ->
    console.log 'WebSocket disconnected, closing MC'
    mc.socket.end()

  mc.on 'packet', (p) ->
    ws.write p.raw

  mc.on 'connect', () ->
    console.log 'Successfully connected to MC'

  mc.on [states.PLAY, ids.chat], (p) ->
    #mc.write sids.chat_message, {message: 'test'}
    #console.log "Chat: #{p}"

  mc.on [states.PLAY, ids.disconnect], (p) ->
    console.log "Kicked for #{p.reason}"


  ws.on 'data', (raw) ->
    console.log "websocket received data: #{raw}"
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

    mc.write id, payload


