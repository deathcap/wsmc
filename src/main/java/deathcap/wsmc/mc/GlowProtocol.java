/**
 * based on https://github.com/SpaceManiac/Glowstone/blob/master/src/main/java/net/glowstone/net/protocol/GlowProtocol.java
 Glowstone Copyright (C) 2011-2014 Tad Hardesty.
 Lightstone Copyright (C) 2010-2011 Graham Edgecombe.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

package deathcap.wsmc.mc;

import com.flowpowered.networking.Codec;
import com.flowpowered.networking.Message;
import com.flowpowered.networking.MessageHandler;
import com.flowpowered.networking.exception.IllegalOpcodeException;
import com.flowpowered.networking.exception.UnknownPacketException;
import com.flowpowered.networking.protocol.keyed.KeyedProtocol;
import com.flowpowered.networking.service.CodecLookupService;
import com.flowpowered.networking.util.ByteBufUtils;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import net.glowstone.GlowServer;

import java.io.IOException;

public abstract class GlowProtocol extends KeyedProtocol {

    /**
     * Keys for codec lookup.
     */
    private static final String INBOUND = "INBOUND";
    private static final String OUTBOUND = "OUTBOUND";

    public GlowProtocol(GlowServer server, String name, int highestOpcode) {
        super(name, highestOpcode + 1);
    }

    protected <M extends Message, C extends Codec<? super M>, H extends MessageHandler<?, ? super M>> Codec.CodecRegistration inbound(int opcode, Class<M> message, Class<C> codec, Class<H> handler) {
        return registerMessage(INBOUND, message, codec, handler, opcode);
    }

    protected <M extends Message, C extends Codec<? super M>> Codec.CodecRegistration outbound(int opcode, Class<M> message, Class<C> codec) {
        return registerMessage(OUTBOUND, message, codec, null, opcode);
    }

    @Override
    public <M extends Message> MessageHandler<?, M> getMessageHandle(Class<M> clazz) {
        MessageHandler<?, M> handler = getHandlerLookupService(INBOUND).find(clazz);
        if (handler == null) {
            GlowServer.logger.warning("No message handler for: " + clazz.getSimpleName() + " in " + getName());
        }
        return handler;
    }

    @Override
    public Codec<?> readHeader(ByteBuf buf) throws UnknownPacketException {
        int length = -1;
        int opcode = -1;
        try {
            length = ByteBufUtils.readVarInt(buf);

            // mark point before opcode
            buf.markReaderIndex();

            opcode = ByteBufUtils.readVarInt(buf);
            return getCodecLookupService(INBOUND).find(opcode);
        } catch (IOException e) {
            throw new UnknownPacketException("Failed to read packet data (corrupt?)", opcode, length);
        } catch (IllegalOpcodeException e) {
            // go back to before opcode, so that skipping length doesn't skip too much
            buf.resetReaderIndex();
            throw new UnknownPacketException("Opcode received is not a registered codec on the server!", opcode, length);
        }
    }

    @Override
    public <M extends Message> Codec.CodecRegistration getCodecRegistration(Class<M> clazz) {
        CodecLookupService service = getCodecLookupService(OUTBOUND);
        if (service != null) {
            Codec.CodecRegistration reg = service.find(clazz);
            if (reg != null) {
                return reg;
            }
        }
        GlowServer.logger.warning("No codec to write: " + clazz.getSimpleName() + " in " + getName());
        return null;
    }

    @Override
    public ByteBuf writeHeader(ByteBuf out, Codec.CodecRegistration codec, ByteBuf data) {
        final ByteBuf opcodeBuffer = Unpooled.buffer();
        ByteBufUtils.writeVarInt(opcodeBuffer, codec.getOpcode());
        ByteBufUtils.writeVarInt(out, opcodeBuffer.readableBytes() + data.readableBytes());
        ByteBufUtils.writeVarInt(out, codec.getOpcode());
        return out;
    }

}