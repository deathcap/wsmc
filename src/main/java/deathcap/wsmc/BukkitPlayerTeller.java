package deathcap.wsmc;

import org.bukkit.Bukkit;

public class BukkitPlayerTeller implements PlayerTeller {
    @Override
    public void tellPlayer(String username, String destination, String url) {
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
}
