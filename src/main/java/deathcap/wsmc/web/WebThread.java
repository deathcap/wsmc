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
import io.netty.channel.ChannelFuture;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.group.ChannelGroup;
import io.netty.channel.group.DefaultChannelGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.util.NetUtil;
import io.netty.util.ResourceLeakDetector;
import io.netty.util.concurrent.GlobalEventExecutor;

import java.net.*;

public class WebThread extends Thread {

    public String wsAddress;
    public int wsPort;
    public String mcAddress;
    public int mcPort;
    public UserIdentityLinker users;
    public PacketFilter filter;
    public boolean verbose;

    public WebThread(String wsAddress, int wsPort, String mcAddress, int mcPort, UserIdentityLinker users, PacketFilter filter, boolean verbose) {
        this.wsAddress = wsAddress;
        this.wsPort = wsPort;
        this.mcAddress = mcAddress;
        this.mcPort = mcPort;
        this.users = users;
        this.filter = filter;
        this.verbose = verbose;

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
                    childHandler(new ServerHandler(this, this.mcAddress, this.mcPort, this.users, this.filter, this.verbose));

            SocketAddress socketAddress;

            if (this.wsAddress == null || this.wsAddress.equals("")) {
                try {
                    // At least on my system, (InetAddress)null and bind(port) (no address) will only bind IPv6 for
                    // some reason. IPv4 is obviously more or as important. NetUtil.LOCALHOST4 will force IPv4
                    // localhost (= 127.0.0.1, 0.0.0.0, localhost) but break IPv6 ([::1] and global IPv6 address).
                    // InetAddress.getLocalHost(), despite the name, will break accessing by localhost (someone will
                    // return HTTP 200 "Not implemented" [not 501 Not Implemented]), for unknown reasons. But it works
                    // with the (usually RFC1918) IPv4 network address, so it's the best I know how to do for now.
                    // TODO: really bind to everything! loopback, ethernet, each IPv4 (and perhaps IPv6), just make it work
                    // for more failed attempts see https://github.com/deathcap/wsmc/issues/30
                    socketAddress = new InetSocketAddress(InetAddress.getLocalHost(), this.wsPort);
                } catch (UnknownHostException ex) {
                    System.out.println("Could not find local host: " + ex);
                    ex.printStackTrace();

                    socketAddress = new InetSocketAddress((InetAddress) null, this.wsPort);
                }
            } else {
                socketAddress = new InetSocketAddress(this.wsAddress, this.wsPort);
            }

            Channel channel = bootstrap.bind(socketAddress)
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
