package deathcap.wsmc;

import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.event.Listener;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;

// Links a random "key" to the player's identity for websocket authentication
public class UserIdentityLinker implements Listener, UserAuthenticator {

    private Map<String, String> keys = new HashMap<String, String>(); // TODO: persist TODO: UUID? but need player name anyway
    private SecureRandom random = new SecureRandom();
    private final String webURL;
    private final boolean allowAnonymous;

    public UserIdentityLinker(String externalScheme, String externalDomain, int externalPort, boolean allowAnonymous) {
        this(externalScheme
                + "://"
                + externalDomain
                + (externalPort != 80
                ? (":" + externalPort) : "")
                + "/", allowAnonymous);
    }

    public UserIdentityLinker(String webURL, boolean allowAnonymous) {
        this.webURL = webURL;
        this.allowAnonymous = allowAnonymous;
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

    public String getOrGenerateUserURL(String name) {
        String key = this.getOrGenerateUserKey(name);
        String url = this.webURL+"#"+name+":"+key; // TODO: urlencode
        return url;
    }

    private String getOrGenerateUserKey(String name) {
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
}
