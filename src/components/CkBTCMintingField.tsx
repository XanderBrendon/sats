import { useEffect, useState } from 'react';
import { TextField, ThemeProvider } from '@mui/material';
import theme from '../theme';
import bigintToFloatString from '../bigIntToFloatString';
import { Principal } from '@icp-sdk/core/principal';
import type { Backend, Ckbtc } from '../actors';
import ShowTransactionStatus from './ShowTransactionStatus';

interface CkBTCMintingFieldProps {
  loading: boolean;
  setLoading: (value: boolean) => void;
  ckbtcLedgerBalance: bigint;
  ckbtcFee: bigint;
  isConnected: boolean;
  SATSCanisterID: string;
  cleanUp: () => void;
  ckbtcLedgerActor: Ckbtc | null;
  SATSActor: Backend | null;
  minimumTransactionAmount: bigint;
}

const CkBTCMintingField: React.FC<CkBTCMintingFieldProps> = ({
  loading,
  setLoading,
  ckbtcLedgerBalance,
  ckbtcFee,
  isConnected,
  SATSCanisterID,
  cleanUp,
  ckbtcLedgerActor,
  SATSActor,
  minimumTransactionAmount,
}) => {
  const [ckbtcFieldValue, setCkbtcFieldValue] = useState<string>('');
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(false);
  const [textFieldErrored, setTextFieldErrored] = useState<boolean>(false);
  const [statusArray, setStatusArray] = useState<string[]>(['']);
  const [ckbtcFieldNatValue, setCkbtcFieldNatValue] = useState<bigint>(0n);
  const [textFieldValueTooLow, setTextFieldValueTooLow] =
    useState<boolean>(true);

  const handleFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const regex = /^\d*\.?\d{0,8}$/; // Regex to allow numbers with up to 8 decimal places
    const newFieldValue = event.target.value;

    if (regex.test(newFieldValue) || newFieldValue === '') {
      setCkbtcFieldValue(newFieldValue);
    }
  };

  const handleMint = async () => {
    if (!isConnected) {
      addStatus('You must be logged in to swap!');
      return;
    }

    if (
      ckbtcFieldNatValue + ckbtcFee * 2n > ckbtcLedgerBalance ||
      ckbtcLedgerBalance < minimumTransactionAmount
    ) {
      addStatus('You do not have enough ckBTC.');
      return;
    }

    if (!ckbtcLedgerActor || !SATSActor) {
      addStatus('Actors not loaded!');
      return;
    }

    setLoading(true);

    const approvalResult = await approveCkBtc(ckbtcFieldNatValue + ckbtcFee);

    if (!approvalResult) {
      cleanUp();
      return;
    }

    const result = await ckbtcDeposit(ckbtcFieldNatValue);

    if (!result) {
      addStatus('ckBTC was approved, but was not transferred.');
    }

    cleanUp();
    setCkbtcFieldNatValue(0n);
    setCkbtcFieldValue('');
  };

  const approveCkBtc = async (amountInE8s: bigint) => {
    if (!ckbtcLedgerActor) return false;

    addStatus(
      `Requesting to approve ${bigintToFloatString(amountInE8s, 8)} ckBTC.`
    );

    try {
      // Optional Candid fields are plain optional properties in the generated
      // bindings, so anything not being set is simply omitted.
      const approvalResult = await ckbtcLedgerActor.icrc2_approve({
        amount: amountInE8s, // Approve amount and the fee to send ckbtc back during icrc2_transfer_from() in deposit() function
        spender: {
          owner: Principal.fromText(SATSCanisterID),
        },
        fee: ckbtcFee,
        created_at_time: BigInt(Date.now()) * 1000000n,
      });

      if (approvalResult.__kind__ === 'Ok') {
        addStatus(
          `${bigintToFloatString(amountInE8s, 8)} ckBTC approved for transfer!`
        );
        return true;
      } else {
        addStatus('ckBTC was not approved for transfer.');
        return false;
      }
    } catch (error) {
      console.error('Error occurred when approving ckBTC:', error);
      addStatus(
        "Error occurred when approving ckBTC (Check your web browser's console)"
      );
      return false;
    }
  };

  const ckbtcDeposit = async (amountInE8s: bigint) => {
    if (!SATSActor) {
      return false;
    }

    try {
      addStatus(
        `Depositing ${bigintToFloatString(amountInE8s, 8)} ckBTC to mint SATS.`
      );
      const result = await SATSActor.deposit(null, amountInE8s);

      if (result.__kind__ === 'ok') {
        addStatus(
          `Swapped ${bigintToFloatString(
            amountInE8s,
            8
          )} ckBTC for ${bigintToFloatString(
            amountInE8s,
            6
          )} SATS! ckBTC transferred on block ${result.ok[0].toString()}. SATS minted on block ${result.ok[1].toString()}.`
        );
        return true;
      } else {
        addStatus(
          "Failed to deposit ckBTC to mint SATS (Check your web browser's console)"
        );
        console.error(
          'Failed to deposit ckBTC to mint SATS: ',
          result.err.toString()
        );
        return false;
      }
    } catch (error) {
      console.error('Failed when depositing ckBTC to mint SATS:', error);
      addStatus(
        "Failed when depositing ckBTC to mint SATS (Check your web browser's console)"
      );
      return false;
    }
  };

  const addStatus = (inputText: string) => {
    setStatusArray((prevArray) => [inputText, ...prevArray]);
  };

  useEffect(() => {
    const ckbtcNatValue =
      ckbtcFieldValue && ckbtcFieldValue !== '.'
        ? BigInt((parseFloat(ckbtcFieldValue) * 1_0000_0000).toFixed(0)) // Convert to Nat
        : 0n;

    // console.log(ckbtcNatValue);
    setButtonDisabled(ckbtcNatValue + ckbtcFee * 2n > ckbtcLedgerBalance);
    setTextFieldValueTooLow(ckbtcNatValue < minimumTransactionAmount);
    setTextFieldErrored(
      (ckbtcLedgerBalance < minimumTransactionAmount && ckbtcNatValue > 0) ||
        (ckbtcLedgerBalance >= minimumTransactionAmount &&
          ckbtcNatValue + ckbtcFee * 2n > ckbtcLedgerBalance)
    );
    setCkbtcFieldNatValue(ckbtcNatValue);
  }, [ckbtcFieldValue, ckbtcLedgerBalance]);

  return (
    <ThemeProvider theme={theme}>
      {ckbtcLedgerBalance <= minimumTransactionAmount ? (
        <>
          <div>
            You need at least {bigintToFloatString(minimumTransactionAmount, 8)}{' '}
            $ckBTC to wrap to SATS
          </div>
        </>
      ) : (
        <></>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'start',
        }}
      >
        <div>
          <TextField
            label="ckBTC"
            variant="filled"
            value={ckbtcFieldValue}
            onChange={handleFieldChange}
            helperText={
              buttonDisabled
                ? "You don't have enough ckBTC!"
                : textFieldValueTooLow
                ? `You must input at least ${bigintToFloatString(
                    minimumTransactionAmount,
                    8
                  )} to swap.`
                : ''
            }
            error={textFieldErrored}
            disabled={loading}
            slotProps={{
              input: {
                inputMode: 'decimal', // Helps show the numeric pad with decimal on mobile devices
              },
            }}
            style={{ width: '200px', minHeight: '84px' }} // Set a fixed width or use a percentage
          />
        </div>
        <div style={{ height: '100%', paddingLeft: '2px' }}>
          <button
            onClick={handleMint}
            disabled={loading || buttonDisabled}
            style={{
              height: '56px', // Match this with TextField's height
              width: '200px', // Set the same width as TextField
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {'Wrap ckBTC'}
          </button>
        </div>
      </div>
      <div>
        <ShowTransactionStatus statusArray={statusArray} loading={loading} />

      </div>
    </ThemeProvider>
  );
};

export default CkBTCMintingField;
