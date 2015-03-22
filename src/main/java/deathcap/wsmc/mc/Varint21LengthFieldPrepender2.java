package deathcap.wsmc.mc;

import io.netty.buffer.ByteBuf;
import io.netty.channel.ChannelHandlerContext;

// Extend Varint21LengthFieldPrepender just so we can call the protected encode() method

public class Varint21LengthFieldPrepender2 extends Varint21LengthFieldPrepender {
    public void encode(ChannelHandlerContext ctx, ByteBuf msg, ByteBuf out) throws Exception
    {
        super.encode(ctx, msg, out);
    }
}

