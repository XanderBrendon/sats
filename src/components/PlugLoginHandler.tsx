import { useEffect } from 'react';
import { idlFactory as SATSFactory } from '../bindings/declarations/backend.did';
import { idlFactory as ckbtcFactory } from '../bindings/declarations/ckbtc.did';
import { Backend, Ckbtc } from '../actors';
import { SATSCanisterID, ckbtcCanisterID } from '../config';

interface PlugLoginHandlerProps {
  setCkBtcLedgerActor: (value: Ckbtc | null) => void;
  setSATSActor: (value: Backend | null) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  isConnected: boolean;
  setIsConnected: (value: boolean) => void;
  connectionType: string;
  setConnectionType: (value: string) => void;
  setCkBtcLedgerBalance: (value: bigint) => void;
  setSATSLedgerBalance: (value: bigint) => void;
  loggedInPrincipal: string;
  setLoggedInPrincipal: (value: string) => void;
}

// Plug is a browser extension with its own agent, so unlike the Internet
// Identity path it cannot read the ic_env cookie. Derive the network from where
// the page is served instead; the local gateway serves the frontend from a
// *.localhost host on a port chosen at network start.
function plugHost(): string {
  return isLocalHost() ? window.location.origin : 'https://ic0.app';
}

function isLocalHost(): boolean {
  const { hostname } = window.location;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost')
  );
}

const PlugLoginHandler: React.FC<PlugLoginHandlerProps> = ({
  setCkBtcLedgerActor,
  setSATSActor,
  loading,
  setLoading,
  isConnected,
  setIsConnected,
  connectionType,
  setConnectionType,
  setCkBtcLedgerBalance,
  setSATSLedgerBalance,
  loggedInPrincipal,
  setLoggedInPrincipal,
}) => {
  const checkConnection = async () => {
    try {
      const connection = !!(await window.ic.plug.isConnected());

      setIsConnected(connection);
      setConnectionType(connection ? 'plug' : '');
      return connection;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (isConnected && connectionType === 'plug') {
      fetchPrincipal();
      setUpActors();
    }
  }, [isConnected]);

  const fetchPrincipal = async () => {
    setLoggedInPrincipal(
      (await window.ic.plug.agent.getPrincipal()).toString()
    );
  };

  const setUpActors = async () => {
    // Plug hands back a raw Candid actor. Wrapping it in the generated classes
    // keeps the rest of the app on one actor type regardless of how the user
    // signed in.
    setSATSActor(
      new Backend(
        await window.ic.plug.createActor({
          canisterId: SATSCanisterID,
          interfaceFactory: SATSFactory,
        })
      )
    );

    setCkBtcLedgerActor(
      new Ckbtc(
        await window.ic.plug.createActor({
          canisterId: ckbtcCanisterID,
          interfaceFactory: ckbtcFactory,
        })
      )
    );
  };

  const handleLogout = async () => {
    setLoading(true);

    if (isConnected && connectionType === 'plug') {
      try {
        await window.ic.plug.disconnect();
        setSATSActor(null);
        setCkBtcLedgerActor(null);
        setIsConnected(false);
        setConnectionType('');
        setCkBtcLedgerBalance(0n);
        setSATSLedgerBalance(0n);
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    handleLogout();
    setLoading(true);
    try {
      const connected = await checkConnection();
      if (!connected) {
        await window.ic.plug.requestConnect({
          whitelist: [ckbtcCanisterID, SATSCanisterID],
          host: plugHost(),
          onConnectionUpdate: async () => {
            checkConnection();
          },
        });
      }
      // Plug's own agent does not read the ic_env cookie, so on a local network
      // it still needs the root key fetched. This reaches into Plug internals,
      // hence the guard.
      if (isLocalHost()) {
        try {
          await window.ic.plug.sessionManager.sessionData.agent.agent.fetchRootKey();
        } catch (error) {
          console.warn('Could not fetch the local root key for Plug:', error);
        }
      }
      setIsConnected(true);
      setConnectionType('plug');
    } catch (error) {
      console.error('Login failed:', error);
      setIsConnected(false);
      setConnectionType('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div>
      {!isConnected ? (
        <>
          <div className="card">
            <button onClick={handleLogin} disabled={loading}>
              Login with Plug
            </button>
          </div>
        </>
      ) : connectionType === 'plug' ? (
        <>
          <p>
            Your plug principal is
            <br />
            {loggedInPrincipal}
          </p>
          <button onClick={handleLogout} disabled={loading}>
            Logout
          </button>
        </>
      ) : (
        <></>
      )}
    </div>
  );
};

export default PlugLoginHandler;
