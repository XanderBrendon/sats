import { useEffect, useState } from 'react';
import { AuthClient } from '@icp-sdk/auth/client';
import { createBackend, createCkbtc, type Backend, type Ckbtc } from '../actors';

interface InternetIdentityLoginHandlerProps {
  setCkBtcLedgerActor: (value: Ckbtc | null) => void;
  setSATSActor: (value: Backend | null) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  isConnected: boolean;
  setIsConnected: (value: boolean) => void;
  connectionType: string;
  setConnectionType: (value: string) => void;
  loggedInPrincipal: string;
  setLoggedInPrincipal: (value: string) => void;
}

// The `/authorize` path is required: @icp-sdk/auth uses this URL verbatim,
// unlike @dfinity/auth-client which appended the authorize step for you.
// Without it the popup lands on the Internet Identity home page and never
// returns a delegation.
//
// This is correct on a local network too -- icp-cli's replica trusts mainnet
// subnet signatures, so delegations from mainnet II are accepted locally and no
// local II canister is needed.
const IDENTITY_PROVIDER = 'https://id.ai/authorize';

const InternetIdentityLoginHandler: React.FC<
  InternetIdentityLoginHandlerProps
> = ({
  setCkBtcLedgerActor,
  setSATSActor,
  loading,
  setLoading,
  isConnected,
  setIsConnected,
  connectionType,
  setConnectionType,
  loggedInPrincipal,
  setLoggedInPrincipal,
}) => {
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);

  const newClient = () => new AuthClient({ identityProvider: IDENTITY_PROVIDER });

  const connect = async (client: AuthClient) => {
    const identity = await client.getIdentity();

    setLoggedInPrincipal(identity.getPrincipal().toString());
    setIsConnected(true);
    setConnectionType('ii');
    setSATSActor(createBackend(identity));
    setCkBtcLedgerActor(createCkbtc(identity));
  };

  useEffect(() => {
    const client = newClient();
    setAuthClient(client);

    // Restore a session that survived a page reload. Not awaited, so it needs
    // its own catch -- connect() throws when the ic_env cookie is missing.
    if (client.isAuthenticated()) {
      connect(client).catch((error) => {
        console.error('Could not restore the previous session:', error);
      });
    }
  }, []);

  const login = async () => {
    setLoading(true);
    try {
      const client = newClient();
      setAuthClient(client);

      if (!client.isAuthenticated()) {
        // signIn() opens the provider window, so it must run inside the click
        // handler's call stack or the browser blocks the popup.
        await client.signIn();
      }
      await connect(client);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!authClient) return;
    await authClient.signOut();
    setIsConnected(false);
    setConnectionType('');
    setLoggedInPrincipal('');
    setSATSActor(null);
    setCkBtcLedgerActor(null);
  };

  return (
    <div>
      {!isConnected ? (
        <>
          <button disabled={loading} onClick={() => login()}>
            Login with Internet Identity
          </button>
        </>
      ) : connectionType === 'ii' ? (
        <>
          <p>
            Your Internet Identity Principal is <br />
            {loggedInPrincipal}
          </p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <></>
      )}
    </div>
  );
};

export default InternetIdentityLoginHandler;
