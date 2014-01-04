
mc = require 'minecraft-protocol'

client = mc.createClient
  host: 'localhost'
  port: 25565
  username: 'webuser'
  password: null

client.on 'packet', (p) ->

  name = mc.protocol.packetNames.play.toClient[p.id]
  #console.log p.id
  return if name.indexOf('entity_') == 0  # skip noisy packets

  console.log name, p

