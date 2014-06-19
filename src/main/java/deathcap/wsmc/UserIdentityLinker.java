package deathcap.wsmc;

import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class UserIdentityLinker implements Listener {

    private Map<UUID, String> keys = new HashMap<UUID, String>(); // TODO: persist
    private SecureRandom random = new SecureRandom();
    private final String webURL;

    public UserIdentityLinker(String webURL) {
        this.webURL = webURL;
    }

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

        String username = player.getName();
        String key = this.getOrGenerateUserKey(player);
        String msg = "Web client enabled: "+webURL+"#u="+username+";k="+key;//TODO: urlencode; custom

        player.sendMessage(msg);
    }
}
