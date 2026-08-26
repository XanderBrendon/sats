# SATS — a low-fee ckBTC wrapper

Wrap **ckBTC** into **SATS** and transact at a fraction of the cost. One raw ckBTC
unit — one satoshi — becomes `1.00000000 SATS`, and SATS is divisible to a further
8 decimals.

Moving ckBTC costs **10 satoshis** per transfer. Moving SATS costs
**0.000001 SATS**. That is roughly ten million times cheaper, which is the point:
low-friction transactions for automated processes.

> **Building an agent?** See **[SKILLS.md](SKILLS.md)** — a guide written for
> autonomous agents using SATS for Bitcoin-denominated micropayments: when
> wrapping is worth it, the exact call sequences, the unit conversions, and the
> failure modes to guard against.

## Canisters

| | Canister ID |
|---|---|
| Backend / SATS ledger (production) | assigned on first `icp deploy -e ic` |
| ckBTC ledger (external) | `mxzaz-hqaaa-aaaar-qaada-cai` |

> The pre-icp-cli deployment has been retired. Moving the ledger libraries to
> `mo:core` changes the persisted state layout incompatibly, so the new build
> cannot upgrade those canisters in place — it deploys as a fresh ledger. Once
> deployed, `icp deploy` records the IDs in `.icp/data/mappings/ic.ids.json`;
> commit that file.

**The backend canister *is* the SATS ledger.** It embeds `icrc1-mo`, `icrc2-mo`,
`icrc3-mo` and `icrc4-mo` directly, so one canister serves both the wrapper
logic and the ICRC-1/2/3/4 token. There is no separate ledger canister.

> ⚠️ Because the ledger's minting account is the canister itself, an ICRC-1
> transfer **to** the canister ID is a burn. The canister rejects these with a
> `can_transfer` guard, but never treat the canister ID as a recipient address.
> To get ckBTC back, call `withdraw`.

## Token

| | |
|---|---|
| Name | `Sat - 1 Satoshi` |
| Symbol | `SATS` |
| Decimals | 8 |
| Transfer fee | 100 raw (`0.000001 SATS`) |
| Standards | ICRC-1, ICRC-2, ICRC-3, ICRC-4, ICRC-10, ICRC-103, ICRC-106 |

## The conversion

```
raw_SATS = raw_ckBTC × 100_000_000
```

Both tokens use 8 decimals, but one raw ckBTC unit is a satoshi and is worth a
whole SATS. The arithmetic lives in [`backend/Convert.mo`](backend/Convert.mo)
and is covered by [`backend/tests/Convert.test.mo`](backend/tests/Convert.test.mo).

| ckBTC in | SATS out |
|---|---|
| `1_000` (minimum) | `100_000_000_000` |
| `10_000` | `1_000_000_000_000` |
| `100_000_000` (1 ckBTC) | `10_000_000_000_000_000` |

## Fees

| Action | Cost |
|---|---|
| Wrap | 20 raw ckBTC — two ckBTC ledger fees (approve + `transfer_from`). No protocol fee. |
| Unwrap | 15 raw ckBTC — 10 ckBTC network fee + 5 protocol fee |
| SATS transfer | 100 raw SATS |

Minimum deposit is **1,000 raw ckBTC** (`0.00001`). Minimum withdrawal is
**16 SATS** (`1_600_000_000` raw), since the release must clear the 15-raw fee.

---

# Wrapping: ckBTC → SATS

Two calls. Approve the backend to pull your ckBTC, then deposit.

`deposit(subaccount: opt vec nat8, amount: nat) -> (Result)` — `amount` is in
**raw ckBTC**.

```bash
BACKEND=<your-backend-canister-id>   # icp canister status backend -e ic --id-only
CKBTC=mxzaz-hqaaa-aaaar-qaada-cai

icp canister call $CKBTC icrc2_approve "(record {
  spender = record { owner = principal \"$BACKEND\"; subaccount = null };
  amount = 10_010 : nat;
  fee = null; memo = null; from_subaccount = null;
  created_at_time = null; expected_allowance = null; expires_at = null;
})" --network ic

icp canister call $BACKEND deposit '(null, 10_000 : nat)' --network ic
```

Returns `variant { ok = record { … } }` carrying the ckBTC block index and the
SATS mint index, or `variant { err = text }`.

10,000 raw ckBTC mints `1_000_000_000_000` raw SATS — 10,000.00000000 SATS.

---

# Unwrapping: SATS → ckBTC

One call. No approval needed — `withdraw` burns from the caller's balance directly.

`withdraw(subaccount: opt vec nat8, amount: nat) -> (Result)` — `amount` is in
**raw SATS**.

```bash
icp canister call $BACKEND withdraw '(null, 1_600_000_000 : nat)' --network ic
```

That example burns 16.00000000 SATS and releases **1 raw ckBTC** (16 − 15 fee).

To size a withdrawal:

```
withdraw_amount = (desired_raw_ckBTC + 15) × 100_000_000
```

| Want out | `withdraw` amount |
|---|---|
| 1 sat (minimum) | `1_600_000_000` |
| 100 sats | `11_500_000_000` |
| 1,000 sats | `101_500_000_000` |

**Withdrawals floor to whole satoshis.** A request that is not a multiple of
`100_000_000` burns only the whole-satoshi portion; the remainder stays in your
balance. Nothing is lost to rounding.

---

# Checking balances

```bash
icp canister call $CKBTC icrc1_balance_of \
  "(record { owner = principal \"$P\"; subaccount = null })" --query --network ic
icp canister call $BACKEND icrc1_balance_of \
  "(record { owner = principal \"$P\"; subaccount = null })" --query --network ic
```

> **Units differ between the two calls.** `deposit` takes raw ckBTC; `withdraw`
> takes raw SATS. They are 1e8 apart. This is the easiest thing to get wrong.

---

# Development

### Toolchain

```bash
npm install -g @icp-sdk/icp-cli @icp-sdk/ic-wasm ic-mops
```

The Motoko compiler is pinned in `mops.toml` (`[toolchain] moc`) and installed
by `mops`, so the build does not depend on a system-wide compiler and is
reproducible across machines and architectures.

### Build and test

```bash
npm install            # also runs `mops install`
icp build              # both canisters
npm test               # mops test (conversion arithmetic) + vitest
```

`mops check` currently fails, but `icp build` and `mops test` do not: `check`
type-checks every file in every dependency, and two published packages ship
files that a modern `moc` rejects but that nothing reachable imports
(`icrc2-mo@0.2.1` has a migration file importing a path that does not exist,
and an old transitive `base` pin from `star` fails on `ExperimentalCycles`).
Use `icp build` to verify the backend compiles.

### Running locally

```bash
icp network start -d   # local network, on an OS-assigned port
icp deploy             # build + install + upload assets
npm start              # Vite dev server on :3000, against the local canisters
icp network stop
```

The local network is configured with `gateway.port: 0` (see `icp.yaml`) so it
never collides with another icp-cli project on port 8000. Nothing hardcodes the
port — the Vite dev server reads it back from `icp network status --json`, so
run `icp deploy backend` before `npm start`.

### How the frontend finds the backend

Canister IDs are **not** baked into the bundle. `icp deploy` injects every
canister's ID into the frontend canister, which serves them in an `ic_env`
cookie; `src/config.ts` reads that at runtime via `@icp-sdk/core`. The Vite dev
server synthesises the same cookie from `icp network status` / `icp canister
status`.

That is why there is no `build:staging` script any more: one bundle is correct
in every environment, because each deployment serves its own IDs. Staging is an
`icp.yaml` *environment* rather than a separate set of canisters:

```bash
icp deploy -e staging   # second deployment on mainnet
icp deploy -e ic        # production
```

TypeScript bindings replace `dfx generate`: `@icp-sdk/bindgen` generates
`src/bindings/` from the committed `backend/backend.did` and
`candid/ckbtc.did` during the Vite build. `backend/backend.did` is regenerated
by `mops build` — commit it whenever the backend interface changes.

### ICRC-85 cycle sharing is off

The 0.2.x ICRC libraries added ICRC-85 "Open Value Sharing", which donates
cycles to the library authors on a timer. The pre-migration libraries had no
such mechanism, so `Backend.mo` disables it (`ovs_disabled`) to keep behaviour
unchanged. To opt in, set `kill_switch = ?false`.

Note the shared `TimerTool` instance is **not** optional even with sharing
disabled: each library constructs an OVS instance that traps with
`TimerTool required on environment` when the environment has none, and the kill
switch is only consulted later, when the scheduled share action runs.

### Metadata changes need a fresh install

`icrc1_migration_state` only runs its initialiser on first install, so editing
`default_icrc1_args` and *upgrading* changes nothing. Either reinstall (which
wipes all balances) or use `admin_update_icrc1` at runtime — `#Name`, `#Symbol`,
`#Logo` and `#FeeCollector` are all updatable that way. After a runtime change,
fold the value back into the source or the next install will revert it.

## Licence

GNU — see [LICENSE](LICENSE).
