package deathcap.wsmc.mc.ping;

import java.util.List;

public class PingResponse {

    public String description;
    public Version version;
    public Modinfo modinfo;

    public class Version {
        public String name;
        public int protocol;
    }

    public class Modinfo {
        public String type;
        public List<Mod> modList;

        public class Mod {
            public String modid;
            public String version;
        }
    }
}
