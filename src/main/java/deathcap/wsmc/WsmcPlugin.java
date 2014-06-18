package deathcap.wsmc;

import deathcap.wsmc.mc.MinecraftThread;
import deathcap.wsmc.web.WebThread;
import org.bukkit.World;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.plugin.java.JavaPlugin;

public class WsmcPlugin extends JavaPlugin {

    private WebThread webThread;
    private World targetWorld;

    @Override
    public void onEnable() {

        final FileConfiguration config = getConfig();
        config.options().copyDefaults(true);
        config.addDefault("webserver.port", 24444);
        config.addDefault("webserver.bind-address", "0.0.0.0");

        webThread = new WebThread(this);
        webThread.start();
    }

    @Override
    public void onDisable() {
        if (webThread != null) {
            webThread.interrupt();
        }
    }

    public WebThread getWebThread() {
        return this.webThread;
    }

    public World getTargetWorld() {
        if (targetWorld == null) {
            targetWorld = getServer().getWorlds().get(0);
        }
        return targetWorld;
    }
}
