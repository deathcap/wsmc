package deathcap.wsmc.mc;

import io.netty.channel.ChannelInitializer;
import io.netty.channel.socket.SocketChannel;

public class ClientHandler extends ChannelInitializer<SocketChannel> {
    @Override
    public void initChannel(SocketChannel ch) throws Exception {
        ch.pipeline().addLast("frame-decoder", new Varint21FrameDecoder());
        ch.pipeline().addLast("frame-encoder", new Varint21LengthFieldPrepender());
        ch.pipeline().addLast("inbound-handler", new MinecraftClientHandler());
    }
}
