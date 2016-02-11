package deathcap.wsmc;

import deathcap.wsmc.mc.PacketFilter;
import deathcap.wsmc.web.WebThread;
import org.bukkit.Bukkit;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.event.Listener;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.Arrays;

public class WsmcBukkitPlugin extends JavaPlugin implements Listener {

    private WebThread webThread;
    private UserIdentityLinker users;
    private PacketFilter filter;

    @Override
    public void onEnable() {

        final FileConfiguration config = getConfig();
        config.options().copyDefaults(true);

        boolean verbose = true;
        String websocket_bind_address = "";
        int websocket_bind_port = 24444;
        String websocket_external_scheme = "http";
        String websocket_external_domain = "";
        int websocket_external_port = 24444;
        String minecraft_connect_address = "localhost";
        int minecraft_connect_port = Bukkit.getServer().getPort();
        boolean minecraft_announce_on_join = true;
        boolean minecraft_allow_anonymous = false;

        config.addDefault("verbose", new Boolean(verbose));
        config.addDefault("websocket.bind-address", websocket_bind_address);
        config.addDefault("websocket.bind-port", websocket_bind_port);
        config.addDefault("websocket.external-scheme", websocket_external_scheme);
        config.addDefault("websocket.external-domain", websocket_external_domain);
        config.addDefault("websocket.external-port", websocket_external_port);
        config.addDefault("minecraft.connect-address", minecraft_connect_address);
        config.addDefault("minecraft.connect-port", minecraft_connect_port);
        config.addDefault("minecraft.announce-on-join", minecraft_announce_on_join);
        config.addDefault("minecraft.allow-anonymous", minecraft_allow_anonymous);
        config.addDefault("filter.whitelist", new Integer[] { }); // TODO: each direction
        config.addDefault("filter.blacklist", new Integer[] { });

        // If 'auto', try to get external IP (hits Amazon), or if empty, get local hostname
        // TODO: is it reasonable to contact an external server by default? Erring on the conservative side
        if (this.getConfig().getString("websocket.external-domain").equals("auto")) {
            this.getConfig().set("websocket.external-domain", ExternalNetworkAddressChecker.checkip());
        }
        if (this.getConfig().getString("websocket.external-domain").equals("")) {
            this.getConfig().set("websocket.external-domain", ExternalNetworkAddressChecker.getHostName());
        }

        verbose = this.getConfig().getBoolean("verbose");
        websocket_bind_address = this.getConfig().getString("websocket.bind-address");
        websocket_bind_port = this.getConfig().getInt("websocket.bind-port");
        websocket_external_scheme = this.getConfig().getString("websocket.external-scheme");
        websocket_external_domain = this.getConfig().getString("websocket.external-domain");
        websocket_external_port = this.getConfig().getInt("websocket.external-port");
        minecraft_connect_address = this.getConfig().getString("minecraft.connect-address");
        minecraft_connect_port = this.getConfig().getInt("minecraft.connect-port");
        minecraft_announce_on_join = this.getConfig().getBoolean("minecraft.announce-on-join");
        minecraft_allow_anonymous = this.getConfig().getBoolean("minecraft.allow-anonymous");

        saveConfig();

        users = new UserIdentityLinker(websocket_external_scheme, websocket_external_domain, websocket_external_port,
                minecraft_announce_on_join,
                minecraft_allow_anonymous,
                this);
        getServer().getPluginManager().registerEvents(users, this);
        getCommand("web").setExecutor(users);

        filter = new PacketFilter();
        for (int id : this.getConfig().getIntegerList("filter.whitelist")) filter.addWhitelist(id);
        for (int id : this.getConfig().getIntegerList("filter.blacklist")) filter.addBlacklist(id);


        webThread = new WebThread(
                websocket_bind_address,
                websocket_bind_port,
                minecraft_connect_address,
                minecraft_connect_port,
                users, filter,
                verbose
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
