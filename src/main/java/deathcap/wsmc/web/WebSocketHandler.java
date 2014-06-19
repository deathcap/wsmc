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

import deathcap.wsmc.WsmcPlugin;
import deathcap.wsmc.mc.DefinedPacket;
import deathcap.wsmc.mc.MinecraftThread;
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
import java.util.logging.Logger;

public class WebSocketHandler extends SimpleChannelInboundHandler<BinaryWebSocketFrame> {

    private final static Logger logger = Logger.getLogger(WebSocketHandler.class.getName());

    private boolean firstMessage = true;
    private Map<String, MinecraftThread> minecraftThreads = new HashMap<String, MinecraftThread>();
    private final WebThread webThread;
    private final String mcAddress;
    private final int mcPort;

    public WebSocketHandler(WebThread webThread, String mcAddress, int mcPort) {
        super(false);
        this.webThread = webThread;
        this.mcAddress = mcAddress;
        this.mcPort = mcPort;
    }

    @Override
    protected void messageReceived(final ChannelHandlerContext ctx, final BinaryWebSocketFrame msg) throws Exception {
        if (firstMessage) {
            firstMessage = false;
            this.webThread.getChannelGroup().add(ctx.channel());
        }

        MinecraftThread minecraft = minecraftThreads.get(ctx.channel().remoteAddress().toString());
        if (minecraft == null) {
            // initial client connection
            System.out.println("Received WS connection: "+ctx.channel().remoteAddress()+" --> "+ctx.channel().localAddress());

            // current protocol: first websocket message is username
            System.out.println("readableBytes = "+msg.content().readableBytes());
            String clientCredential = msg.content().toString(CharsetUtil.UTF_8);
            System.out.println("clientCredential = "+clientCredential); // TODO: username, key, auth
            msg.release();

            minecraft = new MinecraftThread(this.mcAddress, this.mcPort, clientCredential, ctx);
            minecraftThreads.put(ctx.channel().remoteAddress().toString(), minecraft); // TODO: cleanup
            minecraft.start();

            /*
            final ByteBuf reply = Unpooled.wrappedBuffer("OK".getBytes());
            plugin.getServer().getScheduler().runTask(plugin, new Runnable() {
                @Override
                public void run() {
                    ctx.writeAndFlush(new BinaryWebSocketFrame(reply));
                }
            });
            */
            return;
        }

        final ByteBuf buf = msg.content();

        System.out.println("ws received "+buf.readableBytes()+" bytes");
        System.out.println("string = " + buf.toString(CharsetUtil.US_ASCII));

        // strip length header since Varint21LengthFieldPrepender re-adds it
        int length = DefinedPacket.readVarInt(buf);
        System.out.println("length from header: "+length);
        byte bytes[] = new byte[length];
        buf.readBytes(bytes);

        final ByteBuf reply = Unpooled.wrappedBuffer(bytes).retain();
        System.out.println("stripped "+reply.readableBytes());

        final MinecraftThread mc = minecraft;
        //ctx.writeAndFlush(new BinaryWebSocketFrame(reply)); // echo
        // forward MC to WS
        final ChannelFuture f = mc.clientHandler.minecraftClientHandler.ctx.writeAndFlush(reply);
        f.addListener(new ChannelFutureListener() {
            @Override
            public void operationComplete(ChannelFuture channelFuture) throws Exception {
                assert f == channelFuture;
                System.out.println("forwarded WS -> MC");
                reply.release();
            }
        });
    }
}
