# wsmc

WebSocket proxy to Minecraft servers

Allows you to write Minecraft clients connecting over [WebSockets](http://www.websocket.org/)

## Proxy Usage

### WSMC for Java

Install [Maven](https://maven.apache.org/) and build with:

    mvn clean install

#### For Bukkit servers

To load the plugin with software implementing the [Bukkit API](https://github.com/Bukkit/Bukkit),
simply copy the jar into the `plugins` directory. Tested with:

* [Glowstone++](https://glowstoneplusplus.github.io) - an open source server for Minecraft and Bukkit
* [Spigot](https://www.spigotmc.org) - a modification to Minecraft implementing Bukkit
* [Junket](https://github.com/deathcap/Junket) - partial implementation of Bukkit (no server)
* vanilla servers - standalone mode (no plugin, see below)

#### For other servers (standalone mode)

If your server does not support Bukkit plugins, then WSMC can be ran standalone from the
command-line:

    java -jar target/wsmc*.jar 0.0.0.0 24444 localhost 25565

User authentication is not supported in this mode.

TODO: [Sponge](https://github.com/deathcap/wsmc/issues/7),
[Forge](https://github.com/deathcap/wsmc/issues/8),
[BungeeCord](https://github.com/deathcap/wsmc/issues/13) plugin support.

#### Configuration

The proxy must be able to connect to the Minecraft server without authentication, i.e., in
"offline mode". This does *not* mean the Minecraft server has to be remotely accessible
without authentication (although that is a sufficient condition), it can be behind another
proxy in "online mode" such as [BungeeCord](https://github.com/SpigotMC/BungeeCord). See below
for how to setup authentication in WSMC.


Configure the plugin in `plugins/WSMC/config.yml`:

* `websocket`: configuration options for the WebSocket (WS) server side
 * `bind-address` (0.0.0.0): the network address to listen for incoming connections on
 * `bind-port` (24444): the TCP port to serve the WebSocket and HTTP server on
 * `external-scheme` (http), `external-domain` (localhost), and `external-port` (24444): used to
    construct the externally-accessible URL for users to click on for accessing the web client.
    You'll want to set the domain to your externally-facing IP or domain name, and the port may
    need to be changed if you forward the `bind-port`.

* `minecraft`: configuration options for the Minecraft (MC) client side
 * `connect-address` (localhost): Minecraft server to connect to, usually this will be localhost
    if the WSMC proxy is running on the same system as the Minecraft server.
 * `connect-port` (25565): Minecraft server port, if available this will default to the port configured
    in Bukkit, or the Minecraft default of 25565
 * `announce-on-join` (true): when new users connect, send them their web login link
 * `allow-anonymous` (false): allow any user to login as anyone (intended for testing only)

#### Authentication

By design, wsmc does not handle user passwords. Several techniques to authenticate are available:

*First login through the regular Minecraft client*: by default, the wsmc/Java plugin will announce
"Web client enabled (click to view)" to each user who logs in. You can click this link to go to a
per-user URL to login to the web client. The link can be saved and reused as long as the server is up.

If desired, the join message can be disabled by setting `announce-on-join: false` in `plugins/WSMC/config.yml`.
Users can manually retrieve this URL by typing the `/web` command. The URL contains your username and a per-user key;
it should be kept secret or users will be able to impersonate each other.

*Manual setup by administrator via console*: an administrator can type the `/web username` command
to create a new key for a given *username*. The URL can be distributed however you like,
and will be used to login with the specified username. Useful for testing with multiple users.

*No authentication*: setting `allow-anonymous: true` will disable authentication completely.
Use this setting with caution, as it allows logging in as any user.


### WSMC for JavaScript (Node.js script)

The first version of WSMC was written in JavaScript. It is still functional but
lacks authentication and requires installing [Node.js](http://nodejs.org/). Java-based servers
will likely find WSMC/Java more useful, but WSMC/JavaScript is also provided as an alternative.

To use it, run:

    node wsmc.js

Options default to:

    --wshost=0.0.0.0    websocket host to listen on
    --wsport=24444      websocket port to listen on
    --mchost=localhost  minecraft host to connect to
    --mcport=25565      minecraft port to connect to
    --prefix=webuser-   prefix for usernames of websocket-connecting users

When the proxy receives a WS connection, it will connect to the MC server, 
perform the handshake, negotiate encryption, then pass raw binary packets between
the WS client and MC server using [websocket-stream](https://github.com/maxogden/websocket-stream).

Limitation: WSMC/JavaScript doesn't perform user authentication. Users currently can connect
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
