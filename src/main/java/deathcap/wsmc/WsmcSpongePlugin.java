package deathcap.wsmc;

import deathcap.wsmc.mc.PacketFilter;
import deathcap.wsmc.web.WebThread;
import org.spongepowered.api.event.Listener;
import org.spongepowered.api.event.game.state.GameStartedServerEvent;
import org.spongepowered.api.plugin.Plugin;

@Plugin(id = "WSMC", name = "WebSocket-Minecraft Proxy", version = "0.0.1")
public class WsmcSpongePlugin {

    @Listener
    public void onServerStart(GameStartedServerEvent event) {
        // TODO: get from configuration file, Sponge-style
        String wsAddress = "";
        int wsPort = 24444;
        String mcAddress = "localhost";
        int mcPort = 25565; // TODO: get from server port

        System.out.println("WS("+wsAddress+":"+wsPort+") <--> MC("+mcAddress+":"+mcPort+")");
        WebThread webThread = new WebThread(wsAddress, wsPort, mcAddress, mcPort, null, new PacketFilter(), true);
        webThread.start();
    }
}
