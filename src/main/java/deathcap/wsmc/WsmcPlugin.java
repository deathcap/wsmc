package deathcap.wsmc;

import deathcap.wsmc.web.WebThread;
import org.bukkit.World;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.plugin.java.JavaPlugin;

public class WsmcPlugin extends JavaPlugin {

    private WebThread webThread;

    @Override
    public void onEnable() {

        final FileConfiguration config = getConfig();
        config.options().copyDefaults(true);
        config.addDefault("websocket.bind-address", "0.0.0.0");
        config.addDefault("websocket.bind-port", 24444);
        config.addDefault("minecraft.connect-address", "localhost");
        config.addDefault("minecraft.connect-port", 25565);
        saveConfig();

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
