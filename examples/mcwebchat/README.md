# mcwebchat

Example web-based chat client for Minecraft using [wsmc](https://github.com/deathcap/wsmc) 

![screenshot](http://i.imgur.com/8uXMXgi.png "Screenshot")

## Usage

1. Start a Minecraft server
2. Run wsmc pointed to your server
3. `npm start` this demo

Once the demo loads, it should connect (via the WebSocket) to the Minecraft server
and begin processing packets. 

Only a few packet types are recognized, but chat messages are shown (including colors and formatting, using
[tellraw2dom](https://github.com/deathcap/tellraw2dom)), the player list, spawn location, disconnect reason,
and you can send your own chat message packets by typing into the text field.



## License

MIT
