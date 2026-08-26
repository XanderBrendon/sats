import './App.css';
import { useState, useEffect } from 'react';
import headerLogo from './assets/logo.png';
import sckbtcLogo from './assets/sats.png';
import ckbtcLogo from './assets/ckbtc.png';
import { Principal } from '@icp-sdk/core/principal';

import { createCkbtc, type Backend, type Ckbtc } from './actors';
import { CircularProgress } from '@mui/material';
import CkBTCMintingField from './components/CkBTCMintingField';
import SatsWithdrawField from './components/SatsWithdrawField';

import bigintToFloatString from './bigIntToFloatString';
import PlugLoginHandler from './components/PlugLoginHandler';
import InternetIdentityLoginHandler from './components/InternetIdentityLoginHandler';
import TokenManagement from './components/TokenManagement';
import { SATSCanisterID } from './config';


function App() {
  const [loading, setLoading] = useState(false);
  // const [icpBalance, setIcpBalance] = useState<bigint>(0n);
  const [ckbtcLedgerBalance, setCkBtcLedgerBalance] = useState<bigint>(0n);
  const [SATSLedgerBalance, setSATSLedgerBalance] = useState<bigint>(0n);

  const [ckbtcLedgerAllowance, setCkBtcLedgerAllowance] = useState<bigint>(0n);
  const [SATSLedgerAllowance, setSATSLedgerAllowance] = useState<bigint>(0n);

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionType, setConnectionType] = useState<string>('');

  const [SATSActor, setSATSActor] = useState<Backend | null>(null);
  const [ckbtcLedgerActor, setCkBtcLedgerActor] = useState<Ckbtc | null>(null);

  const [totalckBTCHeld, setTotalckBTCHeld] = useState<string>('');

  const [loggedInPrincipal, setLoggedInPrincipal] = useState('');

  const ckbtcFee: bigint = 10n; // ckBTC ledger fee, raw
  const SATSFee: bigint = 100n; // SATS ledger fee, raw

  // Read anonymously: the vault total is public and must render before anyone
  // connects a wallet.
  const fetchTotalTokens = async () => {
    if (!SATSCanisterID) return;

    const totalckBTCHeldResponse = await createCkbtc().icrc1_balance_of({
      owner: Principal.fromText(SATSCanisterID),
    });

    setTotalckBTCHeld(bigintToFloatString(totalckBTCHeldResponse, 8));
  };

  const cleanUp = () => {
    setLoading(false);
    if (ckbtcLedgerActor && SATSActor) {
      fetchBalances();
      //fetchStats();
    } else {
      console.error('Actors were not loaded when trying to cleanup!');
    }
  };

  useEffect(() => {
    //console.log('Component mounted, waiting for user to log in...');
    fetchTotalTokens();
    // checkLoggedIn();

    //setUpActors(); // can't use plug actors as anonymous?
    //console.log("first time", isConnected);
    //checkConnection();
  }, []); // Dependency array remains empty if you only want this effect to run once on component mount

  useEffect(() => {
    // This code runs after `icpActor` and `icdvActor` have been updated.
    //console.log('actors updated', ckbtcLedgerActor, SATSActor);

    fetchBalances();
    //fetchMinters();
    // Note: If `fetchBalances` depends on `icpActor` or `icdvActor`, you should ensure it's capable of handling null values or wait until these values are not null.
  }, [ckbtcLedgerActor, SATSActor]);

  const isValidPrincipal = (principalString: string): boolean => {
    try {
      Principal.fromText(principalString);
      return true;
    } catch (error) {
      return false;
    }
  };

  const getCkBtcLedgerBalance = async () => {
    if (ckbtcLedgerActor === null) return;

    if (!isValidPrincipal(loggedInPrincipal)) return;

    const ckbtcLedgerBalanceResponse = await ckbtcLedgerActor.icrc1_balance_of({
      owner: Principal.fromText(loggedInPrincipal),
    });

    //console.log('Fetching balances...', { ckbtcLedgerBalanceResponse });

    setCkBtcLedgerBalance(ckbtcLedgerBalanceResponse);
  };

  const getSckBTCLedgerBalance = async () => {
    if (SATSActor === null) return;
    if (!isValidPrincipal(loggedInPrincipal)) return;
    const SATSLedgerBalanceResponse = await SATSActor.icrc1_balance_of({
      owner: Principal.fromText(loggedInPrincipal),
    });

    setSATSLedgerBalance(SATSLedgerBalanceResponse);

    //console.log('Fetching balances...', { SATSLedgerBalanceResponse });
  };

  const getCkBtcLedgerAllowance = async () => {
    if (ckbtcLedgerActor === null) return;
    if (!SATSCanisterID || !isValidPrincipal(loggedInPrincipal)) return;
    const ckbtcLedgerAllowanceResponse = await ckbtcLedgerActor.icrc2_allowance({
      account: { owner: Principal.fromText(loggedInPrincipal) },
      spender: { owner: Principal.fromText(SATSCanisterID) },
    });

    setCkBtcLedgerAllowance(ckbtcLedgerAllowanceResponse.allowance);

    // console.log(
    //   'Fetching balances... (ckbtcLedgerAllowanceResponse)',
    //   ckbtcLedgerAllowanceResponse.allowance
    // ); // Need to add check if response was good.
  };

  const getSckBTCLedgerAllowance = async () => {
    if (SATSActor === null) return;
    if (!SATSCanisterID || !isValidPrincipal(loggedInPrincipal)) return;
    const SATSLedgerAllowanceResponse = await SATSActor.icrc2_allowance({
      account: { owner: Principal.fromText(loggedInPrincipal) },
      spender: { owner: Principal.fromText(SATSCanisterID) },
    });

    setSATSLedgerAllowance(SATSLedgerAllowanceResponse.allowance); // Need to add check if response was good.

    // console.log(
    //   'Fetching balances... (SATSLedgerAllowanceResponse)',
    //   SATSLedgerAllowanceResponse.allowance
    // );
  };

  const fetchBalances = async () => {
    //
    // You'd need to replace this with actual logic to instantiate your actors and fetch balances
    // This is a placeholder for actor creation and balance fetching

    fetchTotalTokens();

    //if (!isConnected) return;

    // console.log('Fetching balances...', ckbtcLedgerActor, SATSActor);
    if (ckbtcLedgerActor === null || SATSActor === null) return;
    // Fetch balances (assuming these functions return balances in a suitable format)

    getCkBtcLedgerBalance();
    getSckBTCLedgerBalance();
    getCkBtcLedgerAllowance();
    getSckBTCLedgerAllowance();
  };

  return (
    <div className="App">
      <div>
        <a href="https://app.sneeddao.com" target="_blank">
          <img src={headerLogo} className="logo" alt="SATS logo" />
        </a>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <h1>SATS</h1>
          <img src={sckbtcLogo} alt="SATS Logo" style={{ height: '40px', width: 'auto' }} />
        </div>
        <h2>Reduce the fees associated with Bitcoin by wrapping ckBTC for SATS</h2>
        <h3>
          Total ckBTC In Vault:{' '}
          {totalckBTCHeld !== '' ? (
            <>{totalckBTCHeld} ckBTC</>
          ) : (
            <>
              <CircularProgress size={16} />
            </>
          )}{' '}
        </h3>
      </div>

      <PlugLoginHandler
        setCkBtcLedgerActor={setCkBtcLedgerActor}
        setSATSActor={setSATSActor}
        loading={loading}
        setLoading={setLoading}
        isConnected={isConnected}
        setIsConnected={setIsConnected}
        connectionType={connectionType}
        setConnectionType={setConnectionType}
        setCkBtcLedgerBalance={setCkBtcLedgerBalance}
        setSATSLedgerBalance={setSATSLedgerBalance}
        loggedInPrincipal={loggedInPrincipal}
        setLoggedInPrincipal={setLoggedInPrincipal}
      />

      <InternetIdentityLoginHandler
        setCkBtcLedgerActor={setCkBtcLedgerActor}
        setSATSActor={setSATSActor}
        loading={loading}
        setLoading={setLoading}
        isConnected={isConnected}
        setIsConnected={setIsConnected}
        connectionType={connectionType}
        setConnectionType={setConnectionType}
        loggedInPrincipal={loggedInPrincipal}
        setLoggedInPrincipal={setLoggedInPrincipal}
              />
      {!isConnected ? (
        <></>
      ) : (
        <>
          <div
            style={{
              marginTop: '16px',
              flexDirection: 'column',
              display: 'flex',
              alignItems: 'center',
              minWidth: '250px',
              width: 'fit-content', // I can't get it to stop expanding and contracting.
            }}
            className="card"
          >
            <div
              style={{
                border: '3px solid lightgrey',
                padding: '10px',
                width: '100%',
                backgroundColor: 'rgba(192, 192, 192, 0.3)',
              }}
            >
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={ckbtcLogo} alt="ckBTC Logo" style={{ height: '24px', width: 'auto' }} />
                Wrap ckBTC:
              </h2>
              <h3>$ckBTC Balance: {bigintToFloatString(ckbtcLedgerBalance)}</h3>
              <CkBTCMintingField
                loading={loading}
                setLoading={setLoading}
                ckbtcLedgerBalance={ckbtcLedgerBalance}
                ckbtcFee={ckbtcFee}
                isConnected={isConnected}
                SATSCanisterID={SATSCanisterID}
                ckbtcLedgerActor={ckbtcLedgerActor}
                cleanUp={cleanUp}
                SATSActor={SATSActor}
                minimumTransactionAmount={1000n}
              />
              <p></p>
            </div>
            <div
              style={{
                border: '3px solid lightgrey',
                padding: '10px',
                width: '100%',
                marginTop: '16px',
                backgroundColor: 'rgba(192, 192, 192, 0.3)',
              }}
            >
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={sckbtcLogo} alt="SATS Logo" style={{ height: '24px', width: 'auto' }} />
                Unwrap SATS:
              </h2>
              <p style={{ fontSize: '14px', color: '#222', marginTop: '4px', marginBottom: '8px' }}>Unwrapping costs 15 SATS per transaction — 10 for the ckBTC network fee and 5 for the vault</p>
              <h3>
                $SATS Balance: {bigintToFloatString(SATSLedgerBalance, 8)}
              </h3>
              <SatsWithdrawField
                loading={loading}
                setLoading={setLoading}
                SATSLedgerBalance={SATSLedgerBalance}
                SATSFee={SATSFee}
                ckbtcFee={ckbtcFee}
                isConnected={isConnected}
                SATSActor={SATSActor}
                SATSCanisterID={SATSCanisterID}
                cleanUp={cleanUp}
              />
            </div>

            <div
              style={{
                border: '3px solid lightgrey',
                padding: '10px',
                width: '100%',
                marginTop: '16px',
                backgroundColor: 'rgba(192, 192, 192, 0.3)',
              }}
            >
              <TokenManagement
                loading={loading}
                setLoading={setLoading}
                tokens={[
                  {
                    tokenActor: ckbtcLedgerActor,
                    tokenFee: ckbtcFee,
                    tokenTicker: 'ckBTC',
                    tokenDecimals: 8,
                    tokenLedgerBalance: ckbtcLedgerBalance,
                  },
                  {
                    tokenActor: SATSActor,
                    tokenFee: SATSFee,
                    tokenTicker: 'SATS',
                    tokenDecimals: 8,
                    tokenLedgerBalance: SATSLedgerBalance,
                  },
                ]}
                cleanUp={cleanUp}
                loggedInPrincipal={loggedInPrincipal}
                fetchBalances={fetchBalances}
              />
            </div>
          </div>
        </>
      )}
      <p className="read-the-docs">
        ⚠️ IMPORTANT NOTICE - NO RESPONSIBILITY DISCLAIMER ⚠️

BY USING THE SATS PLATFORM, YOU EXPLICITLY ACKNOWLEDGE AND AGREE THAT YOU ARE USING THE PLATFORM ENTIRELY AT YOUR OWN RISK. WE ACCEPT ABSOLUTELY NO RESPONSIBILITY OR LIABILITY WHATSOEVER FOR ANY CONSEQUENCES RESULTING FROM YOUR USE OF THE PLATFORM.

THIS INCLUDES, BUT IS NOT LIMITED TO: FINANCIAL LOSSES, TECHNICAL ISSUES, SECURITY BREACHES, SMART CONTRACT VULNERABILITIES, REGULATORY COMPLIANCE, OR ANY OTHER POTENTIAL RISKS OR DAMAGES.
      </p>
    </div>
  );
}

export default App;
