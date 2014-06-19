package deathcap.wsmc;

public interface UserAuthenticator {
    public String verifyLogin(String clientCredential);
}
