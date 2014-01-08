
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
ids = minecraft_protocol.protocol.packetIds.play.toClient
sids = minecraft_protocol.protocol.packetIds.play.toServer


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

  userIndex += 1

  ws.on 'close', () ->
    console.log 'WebSocket disconnected, closing MC'
    mc.socket.end()

  mc.on 'packet', (p) ->
    ws.write p.raw

  mc.on 'connect', () ->
    console.log 'Successfully connected to MC'

  mc.once 'login_success', (p) ->
    # after login completes, stop parsing packet payloads and forward as-is to client
    mc.shouldParsePayload = false


  ws.on 'data', (raw) ->
    console.log "websocket received #{raw.length} bytes"
    #console.log "websocket received #{raw.length} bytes: #{raw.toJSON()}"

    mc.writeRaw raw


