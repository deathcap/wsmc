package deathcap.wsmc;

import deathcap.wsmc.web.WebThread;

public class Main {
    public static void main(String[] args)
    {
        String wsAddress = args.length > 0 ? args[0] : "localhost";
        int wsPort = args.length > 1 ? Integer.parseInt(args[1]) : 24444;

        System.out.println("WS("+wsAddress+":"+wsPort+") <--> MC");
        WebThread webThread = new WebThread(wsAddress, wsPort);
        webThread.start();
    }
}
