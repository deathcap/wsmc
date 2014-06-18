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
import deathcap.wsmc.mc.MinecraftThread;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
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

    private final WsmcPlugin plugin;
    private boolean firstMessage = true;
    private Map<String, MinecraftThread> minecraftThreads = new HashMap<String, MinecraftThread>();

    public WebSocketHandler(WsmcPlugin plugin) {
        super(false);
        this.plugin = plugin;
    }

    @Override
    protected void messageReceived(final ChannelHandlerContext ctx, BinaryWebSocketFrame msg) throws Exception {
        if (firstMessage) {
            firstMessage = false;
            plugin.getWebThread().getChannelGroup().add(ctx.channel());
        }

        MinecraftThread minecraft = minecraftThreads.get(ctx.channel().remoteAddress().toString());
        if (minecraft == null) {
            // initial client connection
            plugin.getLogger().info("Received WS connection: "+ctx.channel().remoteAddress()+" --> "+ctx.channel().localAddress());

            // current protocol: first websocket message is username
            System.out.println("readableBytes = "+msg.content().readableBytes());
            String clientCredential = msg.content().toString(CharsetUtil.UTF_8);
            plugin.getLogger().info("clientCredential = "+clientCredential); // TODO: username, key, auth
            msg.release();

            minecraft = new MinecraftThread("localhost", 25565, clientCredential, ctx);
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

        ByteBuf buf = msg.content();

        byte[] bytes = new byte[buf.readableBytes()];
        buf.readBytes(bytes);
        System.out.println("ws received "+bytes.length+" bytes");

        final ByteBuf reply = Unpooled.wrappedBuffer(bytes);
        final MinecraftThread mc = minecraft;
        plugin.getServer().getScheduler().runTask(plugin, new Runnable() {
            @Override
            public void run() {
                // forward MC to WS
                mc.clientHandler.minecraftClientHandler.ctx.writeAndFlush(reply);
                //ctx.writeAndFlush(new BinaryWebSocketFrame(reply)); // echo
            }
        });
        msg.release();
    }
}
