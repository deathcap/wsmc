package deathcap.wsmc;

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
import java.util.UUID;

// Links a random "key" to the player's identity for websocket authentication
public class UserIdentityLinker implements Listener, CommandExecutor {

    private Map<UUID, String> keys = new HashMap<UUID, String>(); // TODO: persist
    private SecureRandom random = new SecureRandom();
    private final String webURL;
    private final boolean announceOnJoin;

    public UserIdentityLinker(String webURL, boolean announceOnJoin) {
        this.webURL = webURL;
        this.announceOnJoin = announceOnJoin;
    }

    // Generate a random secret key, suitable for embedding in a URL
    private String newRandomKey() {
        byte[] bytes = new byte[4]; // TODO: more bytes?
        random.nextBytes(bytes);
        int n = bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
        String s = ""+n; // TODO: base36(?) encoding
        return s;
    }

    public String getOrGenerateUserKey(Player player) {
        UUID uuid = player.getUniqueId();

        String key = keys.get(uuid);
        if (key == null) {
            key = newRandomKey();
            keys.put(uuid, key);
        }

        return key;
    }

    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {
        if (!this.announceOnJoin) return;

        Player player = event.getPlayer();
        /* TODO: how do we send links? can generate this JSON
        with http://deathcap.github.io/tellraw2dom/ but need to find proper API,
        sendRawMessage() seems to just send {"text":...}
        String raw =
        "{" +
            "\"extra\": [" +
            "{" +
                "\"text\": \"Web client enabled (click to view)\"," +
                    "\"bold\": \"true\"," +
                    "\"clickEvent\": {" +
                        "\"action\": \"open_url\"," +
                        "\"value\": \"https://github.com\"" +
                    "}" +
                "}" +
            "]" +
        "}";
         */

        // TODO: don't show if client brand is our own
        // TODO: option to only show on first connect

        this.tellPlayer(player);
    }

    // Give a player a URL to authenticate and join over the websocket
    private void tellPlayer(Player player) {
        String username = player.getName();
        String key = this.getOrGenerateUserKey(player);
        String msg = "Web client enabled: "+webURL+"#u="+username+";k="+key;//TODO: urlencode; custom

        player.sendMessage(msg);
    }

    @Override
    public boolean onCommand(CommandSender commandSender, Command command, String label, String[] split) {
        if (commandSender instanceof Player) {
            Player player = (Player)commandSender;
            this.tellPlayer(player);

            return true;
        } else {
            // TODO: lookup player name from argument, for console administrators
            commandSender.sendMessage("player required for /web");
            return false;
        }
    }
}
