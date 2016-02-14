package deathcap.wsmc.plugins.bukkit;

import deathcap.wsmc.ExternalNetworkAddressChecker;
import deathcap.wsmc.UserIdentityLinker;
import deathcap.wsmc.mc.PacketFilter;
import deathcap.wsmc.web.WebThread;
import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.plugin.java.JavaPlugin;

public class WsmcBukkitPlugin extends JavaPlugin implements Listener, CommandExecutor {

    private WebThread webThread;
    private UserIdentityLinker users;
    private PacketFilter filter;

    boolean announceOnJoin = true;

    @Override
    public void onEnable() {

        final FileConfiguration config = getConfig();
        config.options().copyDefaults(true);

        boolean verbose = false;
        String wsAddress = "";
        int wsPort = 24444;
        String externalScheme = "http";
        String externalDomain = "";
        int externalPort = 24444;
        String mcAddress = "localhost";
        int mcPort = Bukkit.getServer().getPort();
        boolean allowAnonymous = false;

        config.addDefault("verbose", new Boolean(verbose));
        config.addDefault("websocket.bind-address", wsAddress);
        config.addDefault("websocket.bind-port", wsPort);
        config.addDefault("websocket.external-scheme", externalScheme);
        config.addDefault("websocket.external-domain", externalDomain);
        config.addDefault("websocket.external-port", externalPort);
        config.addDefault("minecraft.connect-address", mcAddress);
        config.addDefault("minecraft.connect-port", mcPort);
        config.addDefault("minecraft.announce-on-join", announceOnJoin);
        config.addDefault("minecraft.allow-anonymous", allowAnonymous);
        config.addDefault("filter.whitelist", new Integer[] { }); // TODO: each direction
        config.addDefault("filter.blacklist", new Integer[] { });

        verbose = this.getConfig().getBoolean("verbose");
        wsAddress = this.getConfig().getString("websocket.bind-address");
        wsPort = this.getConfig().getInt("websocket.bind-port");
        externalScheme = this.getConfig().getString("websocket.external-scheme");
        externalDomain = this.getConfig().getString("websocket.external-domain");
        externalPort = this.getConfig().getInt("websocket.external-port");
        mcAddress = this.getConfig().getString("minecraft.connect-address");
        mcPort = this.getConfig().getInt("minecraft.connect-port");
        announceOnJoin = this.getConfig().getBoolean("minecraft.announce-on-join");
        allowAnonymous = this.getConfig().getBoolean("minecraft.allow-anonymous");

        externalDomain = ExternalNetworkAddressChecker.autoConfigureIfNeeded(externalDomain);

        saveConfig();

        users = new UserIdentityLinker(externalScheme, externalDomain, externalPort,
                allowAnonymous);
        getServer().getPluginManager().registerEvents(this, this);
        getCommand("web").setExecutor(this);

        filter = new PacketFilter();
        for (int id : this.getConfig().getIntegerList("filter.whitelist")) filter.addWhitelist(id);
        for (int id : this.getConfig().getIntegerList("filter.blacklist")) filter.addBlacklist(id);


        webThread = new WebThread(
                wsAddress,
                wsPort,
                mcAddress,
                mcPort,
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

    private void tellPlayer(String destination, String url) {
        if (destination == null) {
            // console
            String msg = "Web client enabled: "+url;
            Bukkit.getServer().getConsoleSender().sendMessage(msg);
        } else {
            // player - /tellraw link
            String raw =
                    "{" +
                            "\"text\": \"\"," + // required though unused
                            "\"extra\": [" +    // clickable link
                            "{" +
                            "\"text\": \"Web client enabled (click to view)\"," +
                            "\"bold\": \"true\"," +
                            "\"clickEvent\": {" +
                            "\"action\": \"open_url\"," +
                            "\"value\": \"" + url + "\"" +  // TODO: json encode
                            "}" +
                            "}" +
                            "]" +
                            "}";
            // TODO: switch to RichMessage API after https://github.com/Bukkit/Bukkit/pull/1065
            //player.sendRawMessage(raw); // not what we want, actually just strips ChatColors
            // TODO: note /tellraw Glowstone https://github.com/SpaceManiac/Glowstone/issues/124
            Bukkit.getServer().dispatchCommand(Bukkit.getConsoleSender(), "tellraw " + destination + " " + raw);
        }
    }

    // org.bukkit.command.CommandExecutor

    @Override
    public boolean onCommand(CommandSender commandSender, Command command, String label, String[] args) {
        if (commandSender instanceof Player) {
            Player player = (Player)commandSender;
            this.tellPlayer(player.getName(), this.users.getOrGenerateUserURL(player.getName()));

            return true;
        } else {
            if (args.length < 1) {
                commandSender.sendMessage("player name required for /web");
                return false;
            }

            String playerName = args[0];
            /*
            Player player = this.plugin.getServer().getPlayer(playerName);
            if (player == null) {
                commandSender.sendMessage("no such player "+playerName);
                return false;
            }
            */

            this.tellPlayer(null, this.users.getOrGenerateUserURL(playerName));

            return false;
        }
    }


    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {
        if (!this.announceOnJoin) return;

        Player player = event.getPlayer();

        // TODO: don't show if client brand is our own
        // TODO: option to only show on first connect

        String name = player.getName();

        this.tellPlayer(name, this.users.getOrGenerateUserURL(name));
    }
}
