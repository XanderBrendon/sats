/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { icpBindgen } from '@icp-sdk/bindgen/plugins/vite';
import { execSync } from 'node:child_process';

// Which icp-cli environment the dev server talks to. `local` by default;
// set ICP_ENVIRONMENT=ic (or =staging) to point `vite dev` at a deployed one.
const environment = process.env.ICP_ENVIRONMENT ?? 'local';

// Canisters whose IDs the frontend needs. In production the frontend canister
// serves these in the `ic_env` cookie; the dev server has to synthesise it.
const CANISTER_NAMES = ['backend'];

// Returns undefined when the local network or the backend canister is not up
// yet, so `vite dev` still starts (the app then reports a missing canister ID
// rather than the dev server refusing to boot).
function icpEnvironmentCookie():
  | { headers: Record<string, string>; proxy: Record<string, unknown> }
  | undefined {
  try {
    return readIcpEnvironment();
  } catch (error) {
    console.warn(
      `\n[icp] Could not read environment '${environment}'. ` +
        'Run `icp network start -d` and `icp deploy backend`, then restart the dev server.\n' +
        `${error instanceof Error ? error.message : String(error)}\n`
    );
    return undefined;
  }
}

function readIcpEnvironment(): { headers: Record<string, string>; proxy: Record<string, unknown> } {
  const networkStatus = JSON.parse(
    execSync(`icp network status -e ${environment} --json`, { encoding: 'utf-8' })
  );

  const canisterParams = CANISTER_NAMES.map((name) => {
    const id = execSync(`icp canister status ${name} -e ${environment} --id-only`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();
    return `PUBLIC_CANISTER_ID:${name}=${id}`;
  }).join('&');

  return {
    headers: {
      'Set-Cookie': `ic_env=${encodeURIComponent(
        `${canisterParams}&ic_root_key=${networkStatus.root_key}`
      )}; SameSite=Lax;`,
    },
    // No hardcoded port: the local network is configured with gateway.port 0,
    // so the address comes back from `icp network status`.
    proxy: {
      '/api': { target: networkStatus.api_url, changeOrigin: true },
    },
  };
}

export default defineConfig(({ command }) => ({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  plugins: [
    react(),
    // Replaces `dfx generate`. Both .did files are committed, so the bindings
    // regenerate identically without a deployed canister.
    icpBindgen({ didFile: './backend/backend.did', outDir: './src/bindings' }),
    icpBindgen({ didFile: './candid/ckbtc.did', outDir: './src/bindings' }),
  ],
  // Only synthesise the cookie for `vite dev`. `vite build` must not shell out
  // to icp-cli, and neither must vitest -- which also runs with command
  // 'serve' but never talks to a network.
  ...(command === 'serve' && !process.env.VITEST
    ? { server: icpEnvironmentCookie() }
    : {}),
  test: {
    environment: 'jsdom',
    setupFiles: 'setupTests.ts',
    cache: { dir: '../node_modules/.vitest' },
  },
}));
