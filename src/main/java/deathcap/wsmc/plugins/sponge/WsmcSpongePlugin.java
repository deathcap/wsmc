package deathcap.wsmc.plugins.sponge;

import com.google.inject.Inject;
import deathcap.wsmc.ExternalNetworkAddressChecker;
import deathcap.wsmc.UserIdentityLinker;
import deathcap.wsmc.mc.PacketFilter;
import deathcap.wsmc.web.WebThread;
import ninja.leaping.configurate.ConfigurationNode;
import ninja.leaping.configurate.ConfigurationOptions;
import ninja.leaping.configurate.commented.CommentedConfigurationNode;
import ninja.leaping.configurate.loader.ConfigurationLoader;
import org.spongepowered.api.Sponge;
import org.spongepowered.api.command.CommandException;
import org.spongepowered.api.command.CommandResult;
import org.spongepowered.api.command.CommandSource;
import org.spongepowered.api.command.args.CommandContext;
import org.spongepowered.api.command.args.GenericArguments;
import org.spongepowered.api.command.spec.CommandExecutor;
import org.spongepowered.api.command.spec.CommandSpec;
import org.spongepowered.api.config.DefaultConfig;
import org.spongepowered.api.entity.living.player.Player;
import org.spongepowered.api.event.Listener;
import org.spongepowered.api.event.game.state.GameStartedServerEvent;
import org.spongepowered.api.event.network.ClientConnectionEvent;
import org.spongepowered.api.plugin.Plugin;
import org.spongepowered.api.text.Text;
import org.spongepowered.api.text.action.ClickAction;
import org.spongepowered.api.text.action.TextActions;
import org.spongepowered.api.text.format.TextFormat;
import org.spongepowered.api.text.format.TextStyle;
import org.spongepowered.api.text.format.TextStyles;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.file.Path;

@Plugin(id = "WSMC", name = "WebSocket-Minecraft Proxy", version = "0.0.1")
public class WsmcSpongePlugin implements CommandExecutor {

    // https://docs.spongepowered.org/en/plugin/configuration/index.html
    @Inject
    @DefaultConfig(sharedRoot = true)
    private Path defaultConfig;

    @Inject
    @DefaultConfig(sharedRoot = true)
    private ConfigurationLoader<CommentedConfigurationNode> configManager;

    private WebThread webThread;
    private UserIdentityLinker users;
    private PacketFilter filter;

    boolean announceOnJoin = true;

    @Listener
    public void onServerStart(GameStartedServerEvent event) {
        ConfigurationNode rootNode = null;
        ConfigurationOptions configurationOptions = ConfigurationOptions.defaults();
        configurationOptions.setShouldCopyDefaults(true);
        // TODO: find out why defaults are not being copied
        // setShouldCopyDefaults(true) is supposed to according to https://docs.spongepowered.org/en/plugin/configuration/nodes.html
        // set the defaults if not given but I'm not seeing this happen (using SpongeAPI 3.0.0), but doing this works:

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

        externalDomain = ExternalNetworkAddressChecker.autoConfigureIfNeeded(externalDomain);
        
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

        users = new UserIdentityLinker(externalScheme, externalDomain, externalPort,
                allowAnonymous);

        CommandSpec commandSpec = CommandSpec.builder()
                .description(Text.of("Get a per-user web URL from WebSocket-Minecraft (WSMC)"))
                //.permission("wsmc.command.web") // TODO
                .arguments(GenericArguments.optional(GenericArguments.string(Text.of("player"))))
                .executor(this)
                .build();
        Sponge.getCommandManager().register(this, commandSpec, "web");


        System.out.println("WS("+wsAddress+":"+wsPort+") <--> MC("+mcAddress+":"+mcPort+")");

        filter = new PacketFilter(); // TODO

        webThread = new WebThread(
                wsAddress,
                wsPort,
                mcAddress,
                mcPort,
                users,
                filter,
                verbose
        );

        webThread.start();
    }

    private void tellPlayer(String destination, String url) {
        Player player = Sponge.getServer().getPlayer(destination).orElse(null);

        if (player == null) {
            // TODO: server console
            System.out.println("Web client enabled: " + url);
        } else {
            //player.sendMessage(Text.of("Web client enabled: " + url));
            try {
                player.sendMessage(Text.builder()
                        .style(TextStyles.BOLD)
                        .append(Text.of("Web client enabled (click to view)"))
                        .onClick(TextActions.openUrl(new URL(url)))
                        .build());
            } catch (MalformedURLException ex) {
                ex.printStackTrace();
            }
        }
    }

    @Listener
    public void onPlayerJoin(ClientConnectionEvent.Join event) {
        if (!this.announceOnJoin) return;

        String name = event.getTargetEntity().getName();

        this.tellPlayer(name, this.users.getOrGenerateUserURL(name));
    }

    @Override
    public CommandResult execute(CommandSource commandSource, CommandContext commandContext) throws CommandException {
        if (commandSource instanceof Player) {
            // If from a player, always give URL for that user TODO: allow other users if ops? permission?

            Player player = (Player) commandSource;

            this.tellPlayer(player.getName(), this.users.getOrGenerateUserURL(player.getName()));

            return CommandResult.success();
        } else {
            String name = (String) commandContext.getOne("player").orElse(null);
            if (name == null) {
                commandSource.sendMessage(Text.of("player name required for /web"));
                return CommandResult.empty();
            }

            this.tellPlayer(null, this.users.getOrGenerateUserURL(name));

            return CommandResult.empty();
        }
    }
}
