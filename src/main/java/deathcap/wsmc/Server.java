package deathcap.wsmc;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.Channel;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoop;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;

public class Server {
    public void run() {
        ServerBootstrap bootstrap = new ServerBootstrap();
        EventLoopGroup group = new NioEventLoopGroup();

        bootstrap.group(group)
                .channel(NioServerSocketChannel.class)
                .childHandler(new ServerHandler());

        try {
            Channel channel = bootstrap.bind("0.0.0.0", 24444).sync().channel(); // TODO: configurable
        } catch (InterruptedException ex) {
            ex.printStackTrace();
        }
    }
}
