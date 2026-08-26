// Canister IDs this frontend talks to.
//
// The SATS backend ID is resolved at RUNTIME from the `ic_env` cookie that the
// frontend canister sets, not baked in at build time. That is why there is no
// longer a local/staging/production switch here: the same bundle is correct in
// every environment, because each deployment serves its own canister IDs. In
// development the Vite dev server synthesises the same cookie (see
// vite.config.ts).
import { safeGetCanisterEnv } from '@icp-sdk/core/agent/canister-env';

declare module '@icp-sdk/core/agent/canister-env' {
  interface CanisterEnv {
    readonly ['PUBLIC_CANISTER_ID:backend']: string;
  }
}

export const canisterEnv = safeGetCanisterEnv();

// ckBTC ledger. An external mainnet canister that is not part of this project,
// so it is a constant rather than something `icp deploy` injects.
export const ckbtcCanisterID = 'mxzaz-hqaaa-aaaar-qaada-cai';

export const SATSCanisterID = canisterEnv?.['PUBLIC_CANISTER_ID:backend'] ?? '';
