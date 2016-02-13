package deathcap.wsmc.mc;


import deathcap.wsmc.HexDumper;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;

import java.io.*;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;

// Sends status ping packets (aka "modern" ping, Netty-based servers, 1.7+)
// http://wiki.vg/Server_List_Ping#Current

// TODO: refactor into a library? maybe with https://github.com/WaterfallMC/LegacyPinger/?
// TODO: possibly also support 0xfe legacy pings, but they don't contain Forge modlist

public class PingStatus {

    static final int SEND_PROTOCOL_VERSION = 47;
    static final int NEXT_STATE_STATUS = 1;
    static final int NEXT_STATE_LOGIN = 2;

    static final int PACKET_ID_HANDSHAKE = 0;
    static final int PACKET_ID_STATUS_REQUEST = 0;
    static final int PACKET_ID_STATUS_RESPONSE = 0;

    private InputStream inputStream;
    private OutputStream outputStream;

    private String hostname;
    private int port;

    public PingStatus(String hostname, int port) {
        this.hostname = hostname;
        this.port = port;
    }

    public String sendPing() throws IOException {
        Socket socket = new Socket();
        InetAddress host = InetAddress.getByName(this.hostname);

        socket.connect(new InetSocketAddress(host, this.port));

        inputStream = new BufferedInputStream(socket.getInputStream());
        outputStream = new BufferedOutputStream(socket.getOutputStream());

        ByteBuf buf = Unpooled.buffer();
        DefinedPacket.writeVarInt(SEND_PROTOCOL_VERSION, buf);
        DefinedPacket.writeString(this.hostname, buf);
        buf.writeShort(port); // TODO: confirm this is unsigned short (try >=32767)
        DefinedPacket.writeVarInt(NEXT_STATE_STATUS, buf);

        writePacket(PACKET_ID_HANDSHAKE, buf);
        writePacket(PACKET_ID_STATUS_REQUEST, null);

        ByteBuf response = Unpooled.copiedBuffer(readPacket());

        int packetID = DefinedPacket.readVarInt(response);
        if (packetID != PACKET_ID_STATUS_RESPONSE)
            throw new IOException("Unexpected packet ID in status ping response: " + packetID);

        String json = DefinedPacket.readString(response);

        return json;
    }

    private void writePacket(int packetID, ByteBuf data) throws IOException {
        int length = data == null ? 0 : data.readableBytes();
        ByteBuf packet = Unpooled.buffer(DefinedPacket.sizeOfVarInt(packetID) + DefinedPacket.sizeOfVarInt(length) + length);

        DefinedPacket.writeVarInt(length + DefinedPacket.sizeOfVarInt(length), packet);
        DefinedPacket.writeVarInt(packetID, packet);
        if (data != null) packet.writeBytes(data);

        System.out.println("writePacket="+ HexDumper.hexByteBuf(packet));

        byte[] bytes = new byte[packet.readableBytes()];
        packet.getBytes(0,bytes,0,packet.readableBytes());
        outputStream.write(bytes);
        outputStream.flush();
    }

    // based on DefinedPacket#readVarInt, but for InputStream instead of ByteBuf
    private int readVarInt() throws IOException {
        int out = 0;
        int bytes = 0;
        int in;
        int maxBytes = 5;
        while ( true )
        {
            in = inputStream.read();

            out |= ( in & 0x7F ) << ( bytes++ * 7 );

            if ( bytes > maxBytes )
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

    private byte[] readPacket() throws IOException {
        int length = readVarInt();
        byte[] bytes = new byte[length];

        DataInputStream dataInputStream = new DataInputStream(inputStream);
        dataInputStream.readFully(bytes);

        return bytes;
    }
}
