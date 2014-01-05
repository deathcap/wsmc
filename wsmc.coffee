
mc = require 'minecraft-protocol'
WebSocketServer = (require 'ws').Server
websocket = require 'websocket-stream'
argv = (require 'optimist')
  .default('wshost', '0.0.0.0')
  .default('wsport', 1234)
  .default('mchost', 'localhost')
  .default('mcport', 25565)
  .default('prefix', 'webuser-')
  .argv

console.log "WS(#{argv.wshost}:#{argv.wsport}) <--> MC(#{argv.mchost}:#{argv.mcport})"

states = mc.protocol.states
ids = mc.protocol.packetIDs.play.toClient
sids = mc.protocol.packetIDs.play.toServer


userIndex = 1

wss = new WebSocketServer
  host: argv.wshost
  port: argv.wsport

wss.on 'connection', (ws) ->
  stream = websocket(ws)

  stream.write JSON.stringify ['wsmc-welcome', {}]

  client = mc.createClient
    host: argv.mchost
    port: argv.mcport
    username: argv.prefix + userIndex
    password: null
    parsePayload: true

  userIndex += 1

  stream.on 'close', () ->
    console.log 'WebSocket disconnected, closing MC'
    client.socket.end()

  client.on 'packet', (p) ->

    name = mc.protocol.packetNames.play.toClient[p.id] ? pi.id

    stream.write JSON.stringify([name, p])  # TODO: binary data

  client.on 'connect', () ->
    console.log 'Successfully connected to MC'

  client.on [states.PLAY, ids.chat], (p) ->
    #client.write sids.chat_message, {message: 'test'}
    #console.log "Chat: #{p}"

  client.on [states.PLAY, ids.disconnect], (p) ->
    console.log "Kicked for #{p.reason}"


  stream.on 'data', (raw) ->
    console.log "websocket stream received: #{raw}"
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


