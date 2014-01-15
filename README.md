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

## Project Ideas

Now that your Minecraft server is accessible via WebSocket, what can you do with it? The mcwebchat
example isn't very useful, so here are a few more ambitious project ideas possible with a WSMC backend, 
for anyone up for the challenge:

* (Medium) A viewer-only graphical web-based Minecraft client. Allow the player to walk
around, browse the server but not interact. Server owners could place this client on their website,
as a quick preview for prospective players on their server, to easily check out without having to
fire up the game itself. No authentication needed since the viewer would be anonymous and read-only,
but could possibly benefit from [packet filtering](https://github.com/deathcap/wsmc/issues/3) and/or
server-side permissions to restrict unintentionally allowing clients to modify the server in any way.

* (Hard) A fully-functional interactive 3D web-based Minecraft client, supporting most of the features
of the game. Likely needs [authentication](https://github.com/deathcap/wsmc/issues/2) to be useful, but
the idea would be players could casually join through the web without having to keep up with Java updates
etc. and using the official Minecraft client; the web-based client should be functional enough to allow
a reasonable level of ordinary gameplay. Including interacting with the world and any feature you might expect.

* (Extreme) A highly customizable flexible modular interactive 3D web-based Minecraft client, with support for adding
new game content. Taking the above idea a step further, turning it into the ultimate gameplay experience.
Instead of messing with installing modifications to Minecraft, you could use this hypothetical web-based client
and it would deliver everything you need through the web server. No need for the player to concern themselves
with updates since it all comes from the web and is controlled by the webmaster, and it would even be safer since
like all webpages it runs in the browser sandbox. May or may not be feasible, but could be interesting.
Compare to: [Feed the Beast](http://feed-the-beast.com/), [Technic Platform](http://www.minecraftforge.net/), etc.


For a very incomplete WebGL/[voxel.js](http://voxeljs.com/)-based client which doesn't implement any of these ideas
or work very well at the moment, but could be a good place to start or for reference purposes, see [voxel-clientmc](https://github.com/deathcap/voxel-clientmc)
(any help welcome).

## License

MIT
