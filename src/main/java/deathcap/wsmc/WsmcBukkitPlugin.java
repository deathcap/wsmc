package deathcap.wsmc;

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

import java.util.Arrays;

public class WsmcBukkitPlugin extends JavaPlugin implements Listener, CommandExecutor {

    private WebThread webThread;
    private UserIdentityLinker users;
    private PacketFilter filter;

    boolean announceOnJoin = true;

    @Override
    public void onEnable() {

        final FileConfiguration config = getConfig();
        config.options().copyDefaults(true);

        boolean verbose = true;
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
                allowAnonymous,
                this);
        getServer().getPluginManager().registerEvents(users, this);
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

    // org.bukkit.command.CommandExecutor

    @Override
    public boolean onCommand(CommandSender commandSender, Command command, String label, String[] args) {
        if (commandSender instanceof Player) {
            Player player = (Player)commandSender;
            this.users.tellPlayer(player, player);

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

            this.users.tellPlayer(playerName, null);

            return false;
        }
    }


    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {
        if (!this.announceOnJoin) return;

        Player player = event.getPlayer();

        // TODO: don't show if client brand is our own
        // TODO: option to only show on first connect

        this.users.tellPlayer(player, player);
    }
}
