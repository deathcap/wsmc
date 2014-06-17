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

import com.google.common.base.Preconditions;
import gnu.trove.map.TObjectIntMap;
import gnu.trove.map.hash.TObjectIntHashMap;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.lang.reflect.Constructor;
import java.util.Arrays;
import java.util.List;

@SuppressWarnings("unchecked")
public enum Protocol
{

    // Undef
    HANDSHAKE
            {

                {
                }
            },
    // 0
    GAME
            {

                {
                }
            },
    // 1
    STATUS
            {

                {
                }
            },
    //2
    LOGIN
            {

                {
                }
            };
    /*========================================================================*/
    public static final int MAX_PACKET_ID = 0xFF;
    public static List<Integer> supportedVersions = Arrays.asList( ProtocolConstants.MINECRAFT_1_7_2, ProtocolConstants.MINECRAFT_1_7_6, ProtocolConstants.MINECRAFT_14_11_a );
    /*========================================================================*/
    public final DirectionData TO_SERVER = new DirectionData( ProtocolConstants.Direction.TO_SERVER );
    public final DirectionData TO_CLIENT = new DirectionData( ProtocolConstants.Direction.TO_CLIENT );

    @RequiredArgsConstructor
    public class DirectionData
    {

        @Getter
        private final ProtocolConstants.Direction direction;
        private final TObjectIntMap<Class<? extends DefinedPacket>> packetMap = new TObjectIntHashMap<>( MAX_PACKET_ID );
        private final Class<? extends DefinedPacket>[] packetClasses = new Class[ MAX_PACKET_ID ];
        private final Constructor<? extends DefinedPacket>[] packetConstructors = new Constructor[ MAX_PACKET_ID ];

        public boolean hasPacket(int id)
        {
            return id < MAX_PACKET_ID && packetConstructors[id] != null;
        }

        public final DefinedPacket createPacket(int id)
        {
            if ( id > MAX_PACKET_ID )
            {
                throw new BadPacketException( "Packet with id " + id + " outside of range " );
            }
            if ( packetConstructors[id] == null )
            {
                throw new BadPacketException( "No packet with id " + id );
            }

            try
            {
                return packetClasses[id].newInstance();
            } catch ( ReflectiveOperationException ex )
            {
                throw new BadPacketException( "Could not construct packet with id " + id, ex );
            }
        }

        protected final void registerPacket(int id, Class<? extends DefinedPacket> packetClass)
        {
            try
            {
                packetConstructors[id] = packetClass.getDeclaredConstructor();
            } catch ( NoSuchMethodException ex )
            {
                throw new BadPacketException( "No NoArgsConstructor for packet class " + packetClass );
            }
            packetClasses[id] = packetClass;
            packetMap.put( packetClass, id );
        }

        protected final void unregisterPacket(int id)
        {
            packetMap.remove( packetClasses[id] );
            packetClasses[id] = null;
            packetConstructors[id] = null;
        }

        final int getId(Class<? extends DefinedPacket> packet)
        {
            Preconditions.checkArgument( packetMap.containsKey( packet ), "Cannot get ID for packet " + packet );

            return packetMap.get( packet );
        }
    }
}
