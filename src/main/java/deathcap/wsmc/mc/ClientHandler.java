package deathcap.wsmc.mc;

import io.netty.channel.ChannelInitializer;
import io.netty.channel.socket.SocketChannel;

public class ClientHandler extends ChannelInitializer<SocketChannel> {

    public final MinecraftThread minecraft;
    public MinecraftClientHandler minecraftClientHandler;

    ClientHandler(MinecraftThread minecraft) {
        this.minecraft = minecraft;
    }

    @Override
    public void initChannel(SocketChannel ch) throws Exception {
        ch.pipeline().addLast("frame-decoder", new Varint21FrameDecoder());
        ch.pipeline().addLast("frame-encoder", new Varint21LengthFieldPrepender());
        minecraftClientHandler = new MinecraftClientHandler(this.minecraft);
        ch.pipeline().addLast("inbound-handler", minecraftClientHandler);
    }
}
