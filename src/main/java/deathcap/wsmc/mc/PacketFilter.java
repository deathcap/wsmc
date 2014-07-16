package deathcap.wsmc.mc;

import java.util.HashSet;
import java.util.Set;

public class PacketFilter {

    private Set<Integer> whitelist = new HashSet<Integer>(); // default allow all
    private Set<Integer> blacklist = new HashSet<Integer>(); // default block none

    public boolean checkFilter(int id) {
        if (whitelist.size() != 0) {
            // must be in whitelist
            return whitelist.contains(id);
        }

        // must not be in blacklist
        return blacklist.contains(id);
    }

    public void addWhitelist(int id) {
        whitelist.add(id);
    }

    public void addBlacklist(int id) {
        blacklist.add(id);
    }
}
