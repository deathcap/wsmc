# wsmc

WebSocket proxy to Minecraft servers

Allows you to write Minecraft clients connecting over [WebSockets](http://www.websocket.org/)

## Usage

    node wsmc.js

Options default to:

    --wshost=0.0.0.0    websocket host to listen on
    --wsport=1234       websocket port to listen on
    --mchost=localhost  minecraft host to connect to
    --mcport=25565      minecraft port to connect to
    --prefix=webuser-   prefix for usernames of websocket-connecting users

## Example

[mcwebchat](https://github.com/deathcap/wsmc/tree/master/examples/mcwebchat) - a simple web-based chat client

## License

MIT
