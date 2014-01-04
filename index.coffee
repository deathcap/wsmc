
mc = require 'minecraft-protocol'

client = mc.createClient
  host: 'localhost'
  port: 25565
  username: 'webuser'
  password: null

client.on 'packet', (p) ->
  console.log p

