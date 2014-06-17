package deathcap.wsmc;

import deathcap.wsmc.web.WebHandler;
import org.bukkit.World;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.File;

public class WsmcPlugin extends JavaPlugin {

    private WebHandler webHandler;
    private World targetWorld;

    @Override
    public void onEnable() {

        final FileConfiguration config = getConfig();
        config.options().copyDefaults(true);
        config.addDefault("webserver.port", 24444);
        config.addDefault("webserver.bind-address", "0.0.0.0");

        webHandler = new WebHandler(this);
        webHandler.start();
    }

    @Override
    public void onDisable() {
        if (webHandler != null) {
            webHandler.interrupt();
        }
    }

    public WebHandler getWebHandler() {
        return this.webHandler;
    }

    public World getTargetWorld() {
        if (targetWorld == null) {
            targetWorld = getServer().getWorlds().get(0);
        }
        return targetWorld;
    }
}
