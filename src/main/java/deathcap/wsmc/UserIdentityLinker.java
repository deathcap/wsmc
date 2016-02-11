package deathcap.wsmc;

import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;

// Links a random "key" to the player's identity for websocket authentication
public class UserIdentityLinker implements Listener, CommandExecutor, UserAuthenticator {

    private Map<String, String> keys = new HashMap<String, String>(); // TODO: persist TODO: UUID? but need player name anyway
    private SecureRandom random = new SecureRandom();
    private final String webURL;
    private final boolean announceOnJoin;
    private final boolean allowAnonymous;
    private final WsmcBukkitPlugin plugin;

    public UserIdentityLinker(String externalScheme, String externalDomain, int externalPort, boolean announceOnJoin, boolean allowAnonymous, WsmcBukkitPlugin plugin) {
        this(externalScheme
                + "://"
                + externalDomain
                + (externalPort != 80
                ? (":" + externalPort) : "")
                + "/", announceOnJoin, allowAnonymous, plugin);
    }

    public UserIdentityLinker(String webURL, boolean announceOnJoin, boolean allowAnonymous, WsmcBukkitPlugin plugin) {
        this.webURL = webURL;
        this.announceOnJoin = announceOnJoin;
        this.allowAnonymous = allowAnonymous;
        this.plugin = plugin;
    }

    // Try to login, returning username if successful, null otherwise
    public String verifyLogin(String clientCredential) {
        String[] a = clientCredential.split(":");
        if (a.length == 0 || a.length > 2) {
            System.out.println("invalid credential format received: "+clientCredential);
            return null;
        }

        if (a.length == 1) {
            if (!this.allowAnonymous) {
                System.out.println("user attempted to login anonymously (but denied by minecraft.allow-anonymous false): "+clientCredential);
                return null;
            }
            return clientCredential; // WARNING: anyone can login as anyone if this is enabled (off by default)
        }

        String username = a[0];
        String actualKey = a[1];
        String expectedKey = this.keys.get(username);
        if (expectedKey == null) {
            System.out.println("no such user recognized for "+clientCredential+", need to login first, run /web, or enable minecraft.allow-anonymous");
            return null;
        }
        if (!expectedKey.equals(actualKey)) {
            System.out.println("login failure for "+clientCredential+", expected "+expectedKey);
            return null;
        }
        // TODO: return failures to ws

        System.out.println("successfully verified websocket connection for "+username);
        return username;
    }


    private static final String KEY_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
    private static final int KEY_LENGTH = 8;
    // Generate a random secret key, suitable for embedding in a URL
    private String newRandomKey() {
        StringBuilder sb = new StringBuilder();

        for (int i = 0; i < KEY_LENGTH; ++i) {
            int index = random.nextInt(KEY_ALPHABET.length());
            char c = KEY_ALPHABET.charAt(index);
            sb.append(c);

        }

        return sb.toString();
    }

    public String getOrGenerateUserKey(String name) {
        //UUID uuid = player.getUniqueId(); // TODO?
        //String name = player.getName();

        String key = keys.get(name);
        if (key == null) {
            key = newRandomKey();
            keys.put(name, key);
            System.out.println("new key generated for "+name+": "+key);
        }

        return key;
    }

    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {
        if (!this.announceOnJoin) return;

        Player player = event.getPlayer();

        // TODO: don't show if client brand is our own
        // TODO: option to only show on first connect

        this.tellPlayer(player, player);
    }

    // Give a player a URL to authenticate and join over the websocket
    private void tellPlayer(Player whom, Player destination) {
        this.tellPlayer(whom.getName(), destination.getName());
    }

    private void tellPlayer(String username, String destination) {
        String key = this.getOrGenerateUserKey(username);
        String url = this.webURL+"#"+username+":"+key; // TODO: urlencode
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
            plugin.getServer().dispatchCommand(Bukkit.getConsoleSender(), "tellraw "+destination+" "+raw);
        }
    }

    @Override
    public boolean onCommand(CommandSender commandSender, Command command, String label, String[] args) {
        if (commandSender instanceof Player) {
            Player player = (Player)commandSender;
            this.tellPlayer(player, player);

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

            this.tellPlayer(playerName, null);

            return false;
        }
    }
}
