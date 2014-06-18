package deathcap.wsmc.mc;

import io.netty.channel.ChannelInitializer;
import io.netty.channel.socket.SocketChannel;

public class ClientHandler extends ChannelInitializer<SocketChannel> {
    @Override
    public void initChannel(SocketChannel ch) throws Exception {
        ch.pipeline().addLast(new Varint21FrameDecoder(), new Varint21LengthFieldPrepender(), new MinecraftClientHandler());
    }
}
