# wsmc

WebSocket proxy to Minecraft servers

Allows you to write Minecraft clients connecting over [WebSockets](http://www.websocket.org/)

## Proxy Usage

    node wsmc.js

Options default to:

    --wshost=0.0.0.0    websocket host to listen on
    --wsport=1234       websocket port to listen on
    --mchost=localhost  minecraft host to connect to
    --mcport=25565      minecraft port to connect to
    --prefix=webuser-   prefix for usernames of websocket-connecting users

When the proxy receives a WS connection, it will connect to the MC server, 
perform the handshake, negotiate encryption, then pass raw binary packets between
the WS client and MC server using [websocket-stream](https://github.com/maxogden/websocket-stream).

Limitation: WSMC doesn't perform user authentication (how could it?). Users currently can connect
with no password and they will be given a username beginning with 'webuser-' followed by a number.

## Client Example

[mcwebchat](https://github.com/deathcap/wsmc/tree/master/examples/mcwebchat) - a simple web-based chat client

The WS client is responsible for decoding the packets received and encoding packets sent.
Protocol encryption is automatically handled by the proxy, but clients still need to unpack/pack
the binary data transmitted over the wire for efficiency. 

A nice benefit of using WebSockets is that the protocol is already message-based, so the client 
doesn't have to concern itself with packet lengths (each WS message contains exactly one MC packet).

## License

MIT
