package deathcap.wsmc.plugins.sponge;

import deathcap.wsmc.PlayerTeller;
import org.spongepowered.api.Sponge;
import org.spongepowered.api.entity.living.player.Player;
import org.spongepowered.api.text.Text;

public class SpongePlayerTeller implements PlayerTeller {
    @Override
    public void tellPlayer(String username, String destination, String url) {
        Player player = Sponge.getServer().getPlayer(destination).orElse(null);

        if (player == null) {
            // TODO: server console
            System.out.println("Web client enabled: " + url);
        } else {
            player.sendMessage(Text.of("Web client enabled: " + url));
            // TODO: clickable link
        }
    }
}
