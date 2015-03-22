/*
 * Copyright 2014 Matthew Collins
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package deathcap.wsmc.web;

import deathcap.wsmc.UserAuthenticator;
import deathcap.wsmc.UserIdentityLinker;
import deathcap.wsmc.WsmcPlugin;
import deathcap.wsmc.mc.DefinedPacket;
import deathcap.wsmc.mc.MinecraftThread;
import deathcap.wsmc.mc.PacketFilter;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelFutureListener;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.codec.http.websocketx.BinaryWebSocketFrame;
import io.netty.util.CharsetUtil;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.RejectedExecutionException;
import java.util.logging.Logger;

public class WebSocketHandler extends SimpleChannelInboundHandler<BinaryWebSocketFrame> {

    private final static Logger logger = Logger.getLogger(WebSocketHandler.class.getName());

    private boolean firstMessage = true;
    private Map<String, MinecraftThread> minecraftThreads = new HashMap<String, MinecraftThread>();
    private final WebThread webThread;
    private final String mcAddress;
    private final int mcPort;
    private final UserAuthenticator users;
    private final PacketFilter filter;
    private final boolean verbose;

    public WebSocketHandler(WebThread webThread, String mcAddress, int mcPort, UserAuthenticator users, PacketFilter filter, boolean verbose) {
        super(false);
        this.webThread = webThread;
        this.mcAddress = mcAddress;
        this.mcPort = mcPort;
        this.users = users;
        this.filter = filter;
        this.verbose = verbose;
    }


    private void setupInitialConnection(final ChannelHandlerContext ctx, final BinaryWebSocketFrame msg) {
        // initial client connection
        logger.info("Received WS connection: "+ctx.channel().remoteAddress()+" --> "+ctx.channel().localAddress());

        // current protocol: first websocket message is username
        logger.info("readableBytes = "+msg.content().readableBytes());
        String clientCredential = msg.content().toString(CharsetUtil.UTF_8);

        logger.info("clientCredential = "+clientCredential); // TODO: username, key, auth

        String username;
        if (users != null) {
            username = users.verifyLogin(clientCredential);
            if (username == null) {
                logger.info("refusing connection for "+clientCredential+" from "+ctx.channel().remoteAddress());
                return;
            }
        } else {
            logger.info("command-line mode, allowing everyone");
            username = clientCredential;
        }

        msg.release();

        MinecraftThread minecraft = new MinecraftThread(this.mcAddress, this.mcPort, username, ctx);
        minecraftThreads.put(ctx.channel().remoteAddress().toString(), minecraft); // TODO: cleanup
        minecraft.start();
    }

    // for debugging
    // based on http://nerdronix.blogspot.com/2013/06/eclipse-detail-formatter-to-view.html
    public static String hexByteBuf(ByteBuf buf) {
        byte[] bytes = new byte[buf.readableBytes()];
        buf.getBytes(0,bytes,0,buf.readableBytes());
        char[] hexArray = {'0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'};
        char[] hexChars = new char[bytes.length * 3];
        int v;
        for ( int j = 0; j < bytes.length; j++ ) {
            v = bytes[j] & 0xFF;
            hexChars[j * 3] = hexArray[v >>> 4];
            hexChars[j * 3 + 1] = hexArray[v & 0x0F];
            hexChars[j * 3 + 2] = ' ';
        }
        return new String(hexChars);
    }

    @Override
    protected void messageReceived(final ChannelHandlerContext ctx, BinaryWebSocketFrame msg) throws Exception { // channelRead
        if (firstMessage) {
            firstMessage = false;
            this.webThread.getChannelGroup().add(ctx.channel());
        }

        MinecraftThread minecraft = minecraftThreads.get(ctx.channel().remoteAddress().toString());
        if (minecraft == null) {
            this.setupInitialConnection(ctx, msg);
            return;
        }

        final ByteBuf buf = msg.content();

        if (verbose) logger.info("ws received "+buf.readableBytes()+" bytes: " + hexByteBuf(buf));

        // strip length header since Varint21LengthFieldPrepender re-adds it TODO: refactor
        int length = DefinedPacket.readVarInt(buf);
        byte bytes[] = new byte[length];
        buf.readBytes(bytes);

        // read packet id type for filtering
        int id = DefinedPacket.readVarInt(Unpooled.copiedBuffer(bytes)); // TODO: avoid copying (but need to reply with id in buffer)

        if (!this.filter.isAllowed(id)) {
            logger.info("FILTERED PACKET: "+id);
            return;
        }

        final ByteBuf reply = Unpooled.wrappedBuffer(bytes).retain();
        if (verbose) logger.info("id "+id+" stripped "+reply.readableBytes()+" reply="+hexByteBuf(reply));

        final MinecraftThread mc = minecraft;
        // forward MC to WS
        try {
            final ChannelFuture f = mc.clientHandler.minecraftClientHandler.ctx.writeAndFlush(reply);

            f.addListener(new ChannelFutureListener() {
                @Override
                public void operationComplete(ChannelFuture channelFuture) throws Exception {
                    try {
                        assert f == channelFuture;
                        if (verbose) logger.info("forwarded WS -> MC, "+reply.readableBytes()+" bytes");
                        reply.release();
                    } catch (RejectedExecutionException ex) {
                        // TODO
                    }
                }
            });
        } catch (RejectedExecutionException ex) {
            //TODO mc.clientHandler.minecraftClientHandler.close(ctx, )
        }

    }
}
