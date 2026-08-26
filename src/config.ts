// Single source of truth for the canister IDs this frontend talks to.
//
// The backend target is chosen at build time, not at runtime:
//   DFX_NETWORK=local   -> local replica backend
//   DEPLOY_ENV=staging  -> backend-staging
//   otherwise           -> production backend
//
// Build the staging bundle with `npm run build:staging` so the staging asset
// canister can never ship a bundle wired to production.

const isLocal = process.env.DFX_NETWORK === 'local';
const isStaging = process.env.DEPLOY_ENV === 'staging';

// ckBTC ledger.
export const ckbtcCanisterID = 'mxzaz-hqaaa-aaaar-qaada-cai';

export const SATSCanisterID = isLocal
  ? 'bkyz2-fmaaa-aaaaa-qaaaq-cai'
  : isStaging
  ? '5r3gp-3iaaa-aaaap-qqaeq-cai'
  : '4fu6t-haaaa-aaaap-quxda-cai';
