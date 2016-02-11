package deathcap.wsmc;

import com.google.inject.Inject;
import deathcap.wsmc.mc.PacketFilter;
import deathcap.wsmc.web.WebThread;
import ninja.leaping.configurate.ConfigurationNode;
import ninja.leaping.configurate.ConfigurationOptions;
import ninja.leaping.configurate.commented.CommentedConfigurationNode;
import ninja.leaping.configurate.loader.ConfigurationLoader;
import org.spongepowered.api.Sponge;
import org.spongepowered.api.config.DefaultConfig;
import org.spongepowered.api.event.Listener;
import org.spongepowered.api.event.game.state.GameStartedServerEvent;
import org.spongepowered.api.plugin.Plugin;

import java.io.IOException;
import java.nio.file.Path;

@Plugin(id = "WSMC", name = "WebSocket-Minecraft Proxy", version = "0.0.1")
public class WsmcSpongePlugin {

    // https://docs.spongepowered.org/en/plugin/configuration/index.html
    @Inject
    @DefaultConfig(sharedRoot = true)
    private Path defaultConfig;

    @Inject
    @DefaultConfig(sharedRoot = true)
    private ConfigurationLoader<CommentedConfigurationNode> configManager;

    private WebThread webThread;
    //private UserIdentityLinker users; // TODO
    private PacketFilter filter;

    @Listener
    public void onServerStart(GameStartedServerEvent event) {
        ConfigurationNode rootNode = null;
        ConfigurationOptions configurationOptions = ConfigurationOptions.defaults();
        configurationOptions.setShouldCopyDefaults(true);

        try {
            rootNode = configManager.load(configurationOptions);
        } catch (IOException ex) {
            System.out.println("wsmc failed to load configuration: " + ex.getLocalizedMessage());
            ex.printStackTrace();
        }

        boolean verbose = true;
        String wsAddress = "";
        int wsPort = 24444;
        String externalScheme = "http";
        String externalDomain = "";
        int externalPort = 24444;
        String mcAddress = "localhost";
        int mcPort = Sponge.getServer().getBoundAddress().isPresent() ?
                Sponge.getServer().getBoundAddress().get().getPort() : 25565;
        boolean announceOnJoin = true;
        boolean allowAnonymous = false;

        verbose = rootNode.getNode("verbose").getBoolean(verbose);
        wsAddress = rootNode.getNode("websocket", "bind-address").getString(wsAddress);
        wsPort = rootNode.getNode("websocket", "bind-port").getInt(wsPort);
        externalScheme = rootNode.getNode("websocket", "external-scheme").getString(externalScheme);
        externalDomain = rootNode.getNode("websocket", "external-domain").getString(externalDomain);
        externalPort = rootNode.getNode("websocket", "external-port").getInt(externalPort);
        mcAddress = rootNode.getNode("minecraft", "connect-address").getString(mcAddress);
        mcPort = rootNode.getNode("minecraft", "connect-port").getInt(mcPort);
        announceOnJoin = rootNode.getNode("minecraft", "announce-on-join").getBoolean(announceOnJoin);
        allowAnonymous = rootNode.getNode("minecraft", "allow-anonymous").getBoolean(allowAnonymous);

        // TODO: find out why defaults are not being copied
        // setShouldCopyDefaults(true) is supposed to according to https://docs.spongepowered.org/en/plugin/configuration/nodes.html
        // set the defaults if not given but I'm not seeing this happen (using SpongeAPI 3.0.0), but doing this works:
        rootNode.getNode("verbose").setValue(verbose);
        rootNode.getNode("websocket", "bind-address").setValue(wsAddress);
        rootNode.getNode("websocket", "bind-port").setValue(wsPort);
        rootNode.getNode("websocket", "external-scheme").setValue(externalScheme);
        rootNode.getNode("websocket", "external-domain").setValue(externalDomain);
        rootNode.getNode("websocket", "external-port").setValue(externalPort);
        rootNode.getNode("minecraft", "connect-address").setValue(mcAddress);
        rootNode.getNode("minecraft", "connect-port").setValue(mcPort);
        rootNode.getNode("minecraft", "announce-on-join").setValue(announceOnJoin);
        rootNode.getNode("minecraft", "allow-anonymous").setValue(allowAnonymous);

        try {
            configManager.save(rootNode);
        } catch (IOException ex) {
            System.out.println("wsmc failed to save configuration: " + ex.getLocalizedMessage());
            ex.printStackTrace();
        }

        /* TODO: add UserIdentityLinker to Sponge - need to refactor out messaging user (not Bukkit plugin)
        users = null;
        new UserIdentityLinker(externalScheme, externalDomain, externalPort,
                announceOnJoin,
                allowAnonymous,
                this);
                */

        System.out.println("WS("+wsAddress+":"+wsPort+") <--> MC("+mcAddress+":"+mcPort+")");

        filter = new PacketFilter(); // TODO

        webThread = new WebThread(
                wsAddress,
                wsPort,
                mcAddress,
                mcPort,
                null, //users, // TODO
                filter,
                verbose
        );

        webThread.start();
    }
}
