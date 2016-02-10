package deathcap.wsmc;

import deathcap.wsmc.mc.PacketFilter;
import deathcap.wsmc.web.WebThread;
import org.bukkit.Bukkit;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.event.Listener;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.Arrays;

public class WsmcPlugin extends JavaPlugin implements Listener {

    private WebThread webThread;
    private UserIdentityLinker users;
    private PacketFilter filter;

    @Override
    public void onEnable() {

        final FileConfiguration config = getConfig();
        config.options().copyDefaults(true);

        config.addDefault("verbose", new Boolean(true));
        config.addDefault("websocket.bind-address", "");
        config.addDefault("websocket.bind-port", 24444);
        config.addDefault("websocket.external-scheme", "http");
        config.addDefault("websocket.external-domain", "localhost"); // TODO: lookup DNS. and/or Bukkit.getServer().getIp()?
        config.addDefault("websocket.external-port", 24444);
        config.addDefault("minecraft.connect-address", "localhost");
        config.addDefault("minecraft.connect-port", Bukkit.getServer().getPort());
        config.addDefault("minecraft.announce-on-join", true);
        config.addDefault("minecraft.allow-anonymous", false);
        config.addDefault("filter.whitelist", new Integer[] { }); // TODO: each direction
        config.addDefault("filter.blacklist", new Integer[] { });
        saveConfig();

        String url = this.getConfig().getString("websocket.external-scheme")
                + "://"
                + this.getConfig().getString("websocket.external-domain")
                + (this.getConfig().getInt("websocket.external-port") != 80
                    ? (":" + this.getConfig().getInt("websocket.external-port")) : "")
                + "/";
        users = new UserIdentityLinker(url,
                this.getConfig().getBoolean("minecraft.announce-on-join"),
                this.getConfig().getBoolean("minecraft.allow-anonymous"),
                this);
        getServer().getPluginManager().registerEvents(users, this);
        getCommand("web").setExecutor(users);

        filter = new PacketFilter();
        for (int id : this.getConfig().getIntegerList("filter.whitelist")) filter.addWhitelist(id);
        for (int id : this.getConfig().getIntegerList("filter.blacklist")) filter.addBlacklist(id);


        webThread = new WebThread(
                this.getConfig().getString("websocket.bind-address"),
                this.getConfig().getInt("websocket.bind-port"),
                this.getConfig().getString("minecraft.connect-address"),
                this.getConfig().getInt("minecraft.connect-port"),
                users, filter,
                this.getConfig().getBoolean("verbose")
                );
        webThread.start();
    }

    @Override
    public void onDisable() {
        if (webThread != null) {
            webThread.interrupt();
        }
    }
}
