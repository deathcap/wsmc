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

import deathcap.wsmc.UserIdentityLinker;
import deathcap.wsmc.WsmcPlugin;
import deathcap.wsmc.mc.PacketFilter;
import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.Channel;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.group.ChannelGroup;
import io.netty.channel.group.DefaultChannelGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.util.ResourceLeakDetector;
import io.netty.util.concurrent.GlobalEventExecutor;

public class WebThread extends Thread {

    public String wsAddress;
    public int wsPort;
    public String mcAddress;
    public int mcPort;
    public UserIdentityLinker users;
    public PacketFilter filter;

    public WebThread(String wsAddress, int wsPort, String mcAddress, int mcPort, UserIdentityLinker users, PacketFilter filter) {
        this.wsAddress = wsAddress;
        this.wsPort = wsPort;
        this.mcAddress = mcAddress;
        this.mcPort = mcPort;
        this.users = users;
        this.filter = filter;

        ResourceLeakDetector.setLevel(ResourceLeakDetector.Level.ADVANCED);
    }

    private final ChannelGroup channels = new DefaultChannelGroup("wsmc Connections",
            GlobalEventExecutor.INSTANCE);

    @Override
    public void run() {
        EventLoopGroup bossGroup = new NioEventLoopGroup();
        EventLoopGroup workerGroup = new NioEventLoopGroup();
        try {
            ServerBootstrap bootstrap = new ServerBootstrap();
            bootstrap.group(bossGroup, workerGroup).
                    channel(NioServerSocketChannel.class).
                    childHandler(new ServerHandler(this, this.mcAddress, this.mcPort, this.users, this.filter));

            Channel channel = bootstrap.bind(this.wsAddress, this.wsPort)
                .sync()
                .channel();

            channel.closeFuture().sync();
        } catch (InterruptedException e) {
            interrupt();
        } finally {
            bossGroup.shutdownGracefully();
            workerGroup.shutdownGracefully();
        }
    }

    public ChannelGroup getChannelGroup() {
        return channels;
    }
}
