package deathcap.wsmc;

import deathcap.wsmc.web.WebThread;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.plugin.java.JavaPlugin;

public class WsmcPlugin extends JavaPlugin implements Listener {

    private WebThread webThread;
    private UserIdentityLinker listener;

    @Override
    public void onEnable() {

        final FileConfiguration config = getConfig();
        config.options().copyDefaults(true);
        config.addDefault("websocket.bind-address", "0.0.0.0");
        config.addDefault("websocket.bind-port", 24444);
        config.addDefault("websocket.external-scheme", "http");
        config.addDefault("websocket.external-domain", "localhost"); // TODO: lookup DNS
        config.addDefault("websocket.external-port", 24444);
        config.addDefault("minecraft.connect-address", "localhost");
        config.addDefault("minecraft.connect-port", 25565);
        saveConfig();

        String url = this.getConfig().getString("websocket.external-scheme")
                + "://"
                + this.getConfig().getString("websocket.external-domain")
                + (this.getConfig().getInt("websocket.external-port") != 80
                    ? (":" + this.getConfig().getInt("websocket.external-port")) : "")
                + "/";
        listener = new UserIdentityLinker(url);
        getServer().getPluginManager().registerEvents(listener, this);

        webThread = new WebThread(
                this.getConfig().getString("websocket.bind-address"),
                this.getConfig().getInt("websocket.bind-port"),
                this.getConfig().getString("minecraft.connect-address"),
                this.getConfig().getInt("minecraft.connect-port"));
        webThread.start();
    }

    @Override
    public void onDisable() {
        if (webThread != null) {
            webThread.interrupt();
        }
    }
}
