package deathcap.wsmc;

import io.netty.buffer.ByteBuf;

public class HexDumper {

    // for debugging
    // based on http://nerdronix.blogspot.com/2013/06/eclipse-detail-formatter-to-view.html
    public static String hexByteBuf(ByteBuf buf) {
        byte[] bytes = new byte[buf.readableBytes()];
        buf.getBytes(0,bytes,0,buf.readableBytes());
        char[] hexArray = {'0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'};
        char[] hexChars = new char[bytes.length * 3];
        int v;
        for ( int j = 0; j < bytes.length; j++ ) {
            v = bytes[j] & 0xFF;
            hexChars[j * 3] = hexArray[v >>> 4];
            hexChars[j * 3 + 1] = hexArray[v & 0x0F];
            hexChars[j * 3 + 2] = ' ';
        }
        return new String(hexChars);
    }
}
