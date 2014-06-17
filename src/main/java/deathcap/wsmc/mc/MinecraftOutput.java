/* Copyright (c) 2012, md_5. All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this
list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice,
this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.

The name of the author may not be used to endorse or promote products derived
from this software without specific prior written permission.

You may not use the software for commercial software hosting services without
written permission from the author.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE. */
package deathcap.wsmc.mc;

import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;

import java.nio.charset.Charset;
import java.util.Arrays;

public class MinecraftOutput
{

    private final ByteBuf buf;

    public MinecraftOutput()
    {
        buf = Unpooled.buffer();
    }

    public byte[] toArray()
    {
        if ( buf.hasArray() )
        {
            return Arrays.copyOfRange( buf.array(), buf.arrayOffset(), buf.arrayOffset() + buf.writerIndex() );
        } else
        {
            byte[] b = new byte[ buf.writerIndex() ];
            buf.readBytes( b );
            return b;
        }
    }

    public MinecraftOutput writeByte(byte b)
    {
        buf.writeByte( b );
        return this;
    }

    public void writeInt(int i)
    {
        buf.writeInt( i );
    }

    public void writeString(String s)
    {
        char[] cc = s.toCharArray();
        buf.writeShort( cc.length );
        for ( char c : cc )
        {
            buf.writeChar( c );
        }
    }

    public void writeStringUTF8WithoutLengthHeaderBecauseDinnerboneStuffedUpTheMCBrandPacket(String s)
    {
        buf.writeBytes( s.getBytes( Charset.forName( "UTF-8" ) ) );
    }
}
