/* based on https://github.com/SpigotMC/BungeeCord/tree/master/protocol
Copyright (c) 2012, md_5. All rights reserved.

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
POSSIBILITY OF SUCH DAMAGE.
 */
package deathcap.wsmc.mc;

import io.netty.buffer.ByteBuf;

import java.nio.charset.Charset;

public abstract class DefinedPacket
{
    private static final Charset utf8 = Charset.forName("UTF-8");

    public static void writeString(String s, ByteBuf buf)
    {
        if (s.length() > Short.MAX_VALUE)
            throw new IllegalArgumentException("Cannot send string longer than Short.MAX_VALUE (got %s characters): " + s.length());

        byte[] b = s.getBytes(utf8);
        writeVarInt( b.length, buf );
        buf.writeBytes( b );
    }

    public static String readString(ByteBuf buf)
    {
        int len = readVarInt( buf );
        if (len > Short.MAX_VALUE)
            throw new IllegalArgumentException("Cannot receive string longer than Short.MAX_VALUE (got %s characters): " + len);

        byte[] b = new byte[ len ];
        buf.readBytes( b );

        return new String( b, utf8 );
    }

    public static void writeArray(byte[] b, ByteBuf buf)
    {
        if (b.length > Short.MAX_VALUE)
            throw new IllegalArgumentException("Cannot send array longer than Short.MAX_VALUE (got %s bytes): " + b.length);

        buf.writeShort( b.length );
        buf.writeBytes( b );
    }

    public static byte[] readArray(ByteBuf buf)
    {
        short len = buf.readShort();
        if (len > Short.MAX_VALUE)
            throw new IllegalArgumentException("Cannot receive array longer than Short.MAX_VALUE (got %s bytes): " + len);

        byte[] ret = new byte[ len ];
        buf.readBytes( ret );
        return ret;
    }

    public static void writeStringArray(String[] s, ByteBuf buf)
    {
        writeVarInt( s.length, buf );
        for ( String str : s )
        {
            writeString( str, buf );
        }
    }

    public static String[] readStringArray(ByteBuf buf)
    {
        int len = readVarInt( buf );
        String[] ret = new String[ len ];
        for ( int i = 0; i < ret.length; i++ )
        {
            ret[i] = readString( buf );
        }
        return ret;
    }

    public static int readVarInt(ByteBuf input)
    {
        int out = 0;
        int bytes = 0;
        byte in;
        while ( true )
        {
            in = input.readByte();

            out |= ( in & 0x7F ) << ( bytes++ * 7 );

            if ( bytes > 5 )
            {
                throw new RuntimeException( "VarInt too big" );
            }

            if ( ( in & 0x80 ) != 0x80 )
            {
                break;
            }
        }

        return out;
    }

    public static void writeVarInt(int value, ByteBuf output)
    {
        int part;
        while ( true )
        {
            part = value & 0x7F;

            value >>>= 7;
            if ( value != 0 )
            {
                part |= 0x80;
            }

            output.writeByte( part );

            if ( value == 0 )
            {
                break;
            }
        }
    }

    public void read(ByteBuf buf)
    {
        throw new UnsupportedOperationException( "Packet must implement read method" );
    }

    @Override
    public abstract boolean equals(Object obj);

    @Override
    public abstract int hashCode();

    @Override
    public abstract String toString();
}
