package deathcap.wsmc.mc;

import io.netty.bootstrap.Bootstrap;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelOption;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioSocketChannel;

public class Client implements Runnable {

    public void run() {
        EventLoopGroup workerGroup = new NioEventLoopGroup();

        String host = "localhost";
        int port = 25565;
        try {
            Bootstrap b = new Bootstrap();
            b.group(workerGroup)
                    .channel(NioSocketChannel.class)
                    .option(ChannelOption.SO_KEEPALIVE, true)
                    .handler(new ClientHandler());

            ChannelFuture f = b.connect(host, port).sync();

            f.channel().closeFuture().sync();
        } catch (Exception ex) {
            ex.printStackTrace();
        } finally {
            workerGroup.shutdownGracefully();
        }
    }
}
