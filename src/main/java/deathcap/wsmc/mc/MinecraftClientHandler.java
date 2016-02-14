package deathcap.wsmc.mc;

import deathcap.wsmc.HexDumper;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import io.netty.channel.*;
import io.netty.handler.codec.http.websocketx.BinaryWebSocketFrame;
import io.netty.util.ReferenceCountUtil;

public class MinecraftClientHandler extends ChannelHandlerAdapter {

    public static final int HANDSHAKE_OPCODE = 0;
    public static final int MC_PROTOCOL_VERSION = ProtocolConstants.MINECRAFT_1_8; // TODO: support other versions?
    public static final int NEXT_STATE_LOGIN = 2;

    // http://wiki.vg/Protocol#Clientbound_3
    public static final int LOGIN_DISCONNECT_OPCODE = 0;
    public static final int LOGIN_ENCRYPTION_REQUEST_OPCODE  = 1;
    public static final int LOGIN_SUCCESS_OPCODE = 2;
    public static final int LOGIN_SET_COMPRESSION = 3;

    public static final int LOGIN_OPCODE = 0;

    public final MinecraftThread minecraft;
    public ChannelHandlerContext ctx;
    public int compressionThreshold = -2; // -2 = no uncompressed data length field, -1 = no compression, > = compression

    public MinecraftClientHandler(MinecraftThread minecraft) {
        this.minecraft = minecraft;
    }

    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
        ByteBuf m = (ByteBuf) msg;

        try {

            ByteBuf original = Unpooled.copiedBuffer(m); // copy to not affect proxying original message below

            if (this.compressionThreshold >= -1) {
                // http://wiki.vg/Protocol#With_compression "The format of a packet changes slighty to include the size of the uncompressed packet."
                int uncompressedDataLength = DefinedPacket.readVarInt(m);
                System.out.println("read dataLength="+uncompressedDataLength);
                if (uncompressedDataLength != 0) {
                    System.out.println("TODO: support compressed packets, "+uncompressedDataLength); // decompress?
                    //System.exit(-1);
                }
            }

            boolean passToWebSocket = !this.minecraft.loggingIn; // if not logging in (PLAY state), pass all by default

            if (this.minecraft.loggingIn) {
                int opcode = DefinedPacket.readVarInt(m);
                System.out.println("opcode = " + opcode);
                System.out.println(HexDumper.hexByteBuf(m));
                // we handle the login sequence
                if (opcode == LOGIN_DISCONNECT_OPCODE) {
                    String reason = DefinedPacket.readString(m);
                    System.out.println("Server disconnect reason = " + reason);
                    ctx.close();
                    passToWebSocket = false;
                } else if (opcode == LOGIN_ENCRYPTION_REQUEST_OPCODE) {
                    // http://wiki.vg/Protocol#Login says
                    // "For unauthenticated and* localhost connections there is no encryption. In that case Login Start is directly followed by Login Success."
                    // we don't implement encryption so this is a final error
                    System.out.println("Received encryption request! Is the server not in offline mode?");
                    ctx.close();
                    passToWebSocket = false;
                } else if (opcode == LOGIN_SUCCESS_OPCODE) {
                    System.out.println("Login success");
                    this.minecraft.loggingIn = false;

                    // Read and rewrite the packet

                    String uuid = DefinedPacket.readString(m);
                    String username = DefinedPacket.readString(m);

                    System.out.println("LOGIN_SUCCESS_OPCODE read uuid="+uuid+", username="+username);

                    ByteBuf custom = Unpooled.buffer();
                    if (this.compressionThreshold >= -1) DefinedPacket.writeVarInt(0, custom);
                    DefinedPacket.writeVarInt(LOGIN_SUCCESS_OPCODE, custom);
                    DefinedPacket.writeString(uuid, custom);
                    //DefinedPacket.writeString(username, custom);
                    // WSMC protocol addition: login success packet username field includes server ping JSON
                    DefinedPacket.writeString(username + "\0" + this.minecraft.pingResponseText, custom);

                    ByteBuf out = Unpooled.buffer();
                    Varint21LengthFieldPrepender2 prepender = new Varint21LengthFieldPrepender2();
                    prepender.encode(null, custom, out);
                    System.out.println("[login success] mc -> ws: "+HexDumper.hexByteBuf(out));
                    minecraft.websocket.writeAndFlush(new BinaryWebSocketFrame(out));

                    // DON'T pass through to WS, since we wrote our own
                    passToWebSocket = false;
                    return;
                } else if (opcode == LOGIN_SET_COMPRESSION) {
                    this.compressionThreshold = DefinedPacket.readVarInt(m);
                    System.out.println("Compression threshold set to "+this.compressionThreshold);
                    // pass through to WS
                    passToWebSocket = true;
                } else {
                    System.out.println("?? unrecognized login opcode: "+opcode);
                    ctx.close();
                    passToWebSocket = false;
                }
            }

            if (passToWebSocket) {
                // otherwise proxy through to WS

                ByteBuf out = Unpooled.buffer(original.readableBytes());
                System.out.println("m = "+original+"="+HexDumper.hexByteBuf(original));
                // prepend length
                Varint21LengthFieldPrepender2 prepender = new Varint21LengthFieldPrepender2();
                prepender.encode(null, original, out);
                System.out.println("mc -> ws: "+HexDumper.hexByteBuf(out));
                minecraft.websocket.writeAndFlush(new BinaryWebSocketFrame(out));
                //minecraft.websocket.writeAndFlush(new BinaryWebSocketFrame(m.retain()));
            }
        } finally {
            m.release();
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
        this.ctx = ctx;

        ByteBuf handshake = Unpooled.buffer();
        DefinedPacket.writeVarInt(HANDSHAKE_OPCODE, handshake);
        DefinedPacket.writeVarInt(MC_PROTOCOL_VERSION, handshake);

        DefinedPacket.writeVarInt(this.minecraft.taggedHost.length(), handshake);
        handshake.writeBytes(this.minecraft.taggedHost.getBytes());
        handshake.writeShort(this.minecraft.port);
        DefinedPacket.writeVarInt(NEXT_STATE_LOGIN, handshake);

        final ChannelFuture f = ctx.writeAndFlush(handshake);
        f.addListener(new ChannelFutureListener() {
            @Override
            public void operationComplete(ChannelFuture channelFuture) throws Exception {
                System.out.println("wrote handshake packet");
                assert f == channelFuture;
            }
        });

        ByteBuf login = Unpooled.buffer();
        DefinedPacket.writeVarInt(LOGIN_OPCODE, login);
        DefinedPacket.writeString(this.minecraft.username, login);

        ctx.writeAndFlush(login);
    }

    @Override
    public void channelInactive(ChannelHandlerContext ctx) {
        System.out.println("Disconnected from "+ctx.channel().remoteAddress());
    }
}
