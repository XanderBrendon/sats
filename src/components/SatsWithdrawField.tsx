import { useEffect, useState } from 'react';
import { TextField, ThemeProvider } from '@mui/material';
import theme from '../theme';
import bigintToFloatString from '../bigIntToFloatString';
import { _SERVICE as satsService } from '../declarations/service_hack/service';
import ShowTransactionStatus from './ShowTransactionStatus';

interface SatsWithdrawFieldProps {
  loading: boolean;
  setLoading: (value: boolean) => void;
  SATSLedgerBalance: bigint;
  SATSFee: bigint;
  ckbtcFee: bigint;
  isConnected: boolean;
  SATSActor: satsService | null;
  SATSCanisterID: string;
  cleanUp: () => void;
}

const BobWithdrawField: React.FC<SatsWithdrawFieldProps> = ({
  loading,
  setLoading,
  SATSLedgerBalance,
  ckbtcFee,
  SATSFee,
  isConnected,
  SATSActor,
  SATSCanisterID,
  cleanUp,
}) => {
  const [satsFieldValue, setSatsFieldValue] = useState<string>('');
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(false);
  const [textFieldErrored, setTextFieldErrored] = useState<boolean>(false);
  const [satsFieldNatValue, setSatsFieldNatValue] = useState<bigint>(0n);
  const [statusArray, setStatusArray] = useState<string[]>(['']);
  const [textFieldValueTooLow, setTextFieldValueTooLow] =
    useState<boolean>(true);

  // 16 SATS. Withdrawal releases whole satoshis only and must clear the
  // 15 raw ckBTC fee, so anything below this is rejected by the backend.
  const minimumTransactionAmount: bigint = 1_600_000_000n;

  const handleWithdrawl = async () => {
    if (!isConnected) {
      addStatus('You must be logged in to swap!');
      return;
    }

    if (
      satsFieldNatValue + ckbtcFee + SATSFee > SATSLedgerBalance ||
      SATSLedgerBalance < minimumTransactionAmount
    ) {
      // Cover the ckbtc transfer from backend fee. Cover the SATS approval fee. The SATS is burned without a fee applied.
      addStatus('You do not have enough SATS.');
      return;
    }

    if (!SATSActor) {
      addStatus('SATS actor not loaded!');
      return;
    }

    setLoading(true);

    // No approval step: withdraw burns from the caller's balance directly,
    // and the fee comes out of the released ckBTC rather than being added on top.
    const result = await ckbtcWithdraw(satsFieldNatValue);

    if (!result) {
      addStatus('SATS was approved, but was not transferred.');
    }

    await cleanUp();
    setSatsFieldNatValue(0n);
    setSatsFieldValue('');
  };

  const ckbtcWithdraw = async (amountInE8s: bigint) => {
    if (!SATSActor) {
      return false;
    }

    try {
      addStatus(
        `Depositing ${bigintToFloatString(
          amountInE8s,
          6
        )} SATS to burn for ckBTC.`
      );
      const result = await SATSActor.withdraw([], amountInE8s);
      if ('ok' in result) {
        addStatus(
          `Swapped ${bigintToFloatString(
            amountInE8s,
            6
          )} SATS for ${bigintToFloatString(
            amountInE8s,
            8
          )} ckBTC! SATS burned on block ${
            result.ok[0]
          }. ckBTC transferred on block ${result.ok[1]}`
        );
        return true;
      } else {
        addStatus(
          "failed to burn SATS and return ckBTC (Check your web browser's console)"
        );
        console.error(
          'failed to burn SATS and return ckBTC',
          result.err.toString()
        );
        return false;
      }
    } catch (error) {
      console.error('Burning SATS and returning ckBTC failed:', error);
      addStatus(
        "Burning SATS and returning ckBTC failed (Check your web browser's console)"
      );
      return false;
    }
  };

  const addStatus = (inputText: string) => {
    setStatusArray((prevArray) => [inputText, ...prevArray]);
  };

  const handleFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const regex = /^\d*\.?\d{0,6}$/; // Regex to allow numbers with up to 8 decimal places
    const newFieldValue = event.target.value;

    if (regex.test(newFieldValue) || newFieldValue === '') {
      setSatsFieldValue(newFieldValue);
    }
  };

  useEffect(() => {
    const SATSNatValue =
      satsFieldValue && satsFieldValue !== '.'
        ? BigInt((parseFloat(satsFieldValue) * 1_0000_0000).toFixed(0)) // Convert to Nat with 8 decimals
        : 0n;

    // console.log(SATSNatValue);
    setButtonDisabled(SATSNatValue + ckbtcFee + SATSFee > SATSLedgerBalance);
    setTextFieldValueTooLow(SATSNatValue < minimumTransactionAmount);
    setTextFieldErrored(
      (SATSLedgerBalance < minimumTransactionAmount && SATSNatValue > 0) ||
        (SATSLedgerBalance >= minimumTransactionAmount &&
          SATSNatValue + ckbtcFee + SATSFee > SATSLedgerBalance)
    );
    setSatsFieldNatValue(SATSNatValue);
  }, [satsFieldValue, SATSLedgerBalance]);

  return (
    <ThemeProvider theme={theme}>
      {SATSLedgerBalance < minimumTransactionAmount ? (
        <>
          <div>
            {`You need at least ${bigintToFloatString(
              minimumTransactionAmount,
              6
            )}
            $SATS to unwrap to ckBTC`}
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
          width: '100%',
        }}
      >
        <div>
          <TextField
            label="SATS"
            variant="filled"
            value={satsFieldValue}
            onChange={handleFieldChange}
            helperText={
              buttonDisabled
                ? "You don't have enough SATS!"
                : textFieldValueTooLow
                ? `You must input at least ${bigintToFloatString(
                    minimumTransactionAmount,
                    6
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
            onClick={handleWithdrawl}
            disabled={loading || buttonDisabled}
            style={{
              height: '56px', // Match this with TextField's height
              width: '200px', // Set the same width as TextField
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {'Unwrap to ckBTC'}
          </button>
        </div>
      </div>
      <div>
        <ShowTransactionStatus statusArray={statusArray} loading={loading} />
      </div>
    </ThemeProvider>
  );
};

export default BobWithdrawField;
