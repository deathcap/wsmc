package deathcap.wsmc;

// Generic interface to tell a player (or null for console) about a URL to click on

public interface PlayerTeller {
    public void tellPlayer(String username, String destination, String url);
}
