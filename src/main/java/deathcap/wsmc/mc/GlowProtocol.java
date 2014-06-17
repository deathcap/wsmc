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

import com.flowpowered.networking.exception.UnknownPacketException;
import com.flowpowered.networking.util.ByteBufUtils;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;

import java.io.IOException;

public class GlowProtocol {

    public void readHeader(ByteBuf buf) throws UnknownPacketException {
        int length = -1;
        int opcode = -1;
        try {
            length = ByteBufUtils.readVarInt(buf);

            // mark point before opcode
            buf.markReaderIndex();

            opcode = ByteBufUtils.readVarInt(buf);
            //return getCodecLookupService(INBOUND).find(opcode);
        } catch (IOException e) {
            throw new UnknownPacketException("Failed to read packet data (corrupt?)", opcode, length);
        }
    }

    public ByteBuf writeHeader(ByteBuf out, int opcode, ByteBuf data) {
        final ByteBuf opcodeBuffer = Unpooled.buffer();
        ByteBufUtils.writeVarInt(opcodeBuffer, opcode);
        ByteBufUtils.writeVarInt(out, opcodeBuffer.readableBytes() + data.readableBytes());
        ByteBufUtils.writeVarInt(out, opcode);
        return out;
    }

}