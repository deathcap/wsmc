package deathcap.wsmc;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.UnknownHostException;

public class ExternalNetworkAddressChecker {
    public static String autoConfigureIfNeeded(String externalDomain) {
        // If 'auto', try to get external IP (hits Amazon), or if empty, get local hostname
        // TODO: is it reasonable to contact an external server by default? Erring on the conservative side
        if (externalDomain.equals("auto")) {
            externalDomain = checkip();
        }
        if (externalDomain.equals("")) {
            externalDomain = getHostName();
        }

        return externalDomain;
    }

    private static String checkip() {
        try {
            URL url = new URL("http://checkip.amazonaws.com/");
            BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(url.openStream()));
            return bufferedReader.readLine().trim();
        } catch (MalformedURLException ex) {

        } catch (IOException ex) {

        }

        return ExternalNetworkAddressChecker.getHostName();
    }

    private static String getHostName() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (UnknownHostException ex) {
            return "localhost";
        }
    }
}
