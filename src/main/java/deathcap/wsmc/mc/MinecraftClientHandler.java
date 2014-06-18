package deathcap.wsmc.mc;

import com.flowpowered.networking.util.ByteBufUtils;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelFutureListener;
import io.netty.channel.ChannelHandlerAdapter;
import io.netty.channel.ChannelHandlerContext;
import io.netty.util.ReferenceCountUtil;

import java.io.IOException;

public class MinecraftClientHandler extends ChannelHandlerAdapter {

    public static final int HANDSHAKE_OPCODE = 0;
    public static final int MC_PROTOCOL_VERSION = 4; // 1.7.2
    public static final int NEXT_STATE_LOGIN = 2;

    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        ByteBuf m = (ByteBuf) msg;

        System.out.println("channelRead = "+msg);

        try {
            System.out.println("varint = " + ByteBufUtils.readVarInt(m));
            ctx.close();
        } catch (IOException ex) {
            ex.printStackTrace();
        } finally {
            ReferenceCountUtil.release(msg);
        }
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
        cause.printStackTrace();
        ctx.close();
    }

    @Override
    public void channelActive(final ChannelHandlerContext ctx) {
        System.out.println("Connected to "+ctx.channel().remoteAddress());

        ByteBuf handshake = Unpooled.buffer();
        ByteBufUtils.writeVarInt(handshake, HANDSHAKE_OPCODE);
        ByteBufUtils.writeVarInt(handshake, MC_PROTOCOL_VERSION);
        String address = "localhost";
        int port = 25565;
        ByteBufUtils.writeVarInt(handshake, address.length());
        handshake.writeBytes(address.getBytes());
        handshake.writeShort(port);
        ByteBufUtils.writeVarInt(handshake, NEXT_STATE_LOGIN);

        final ChannelFuture f = ctx.writeAndFlush(handshake);
        f.addListener(new ChannelFutureListener() {
            @Override
            public void operationComplete(ChannelFuture channelFuture) throws Exception {
                System.out.println("wrote handshake packet");
                assert f == channelFuture;
                ctx.close();
            }
        });
    }
}
