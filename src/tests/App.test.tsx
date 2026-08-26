import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { StrictMode } from 'react';
import { ActorProvider, AgentProvider } from '@ic-reactor/react';
import { idlFactory } from '../declarations/backend';
import { SATSCanisterID } from '../config';

describe('App', () => {
  it('renders as expected', () => {
    render(
      <StrictMode>
        <AgentProvider withProcessEnv disableAuthenticateOnMount>
          <ActorProvider idlFactory={idlFactory} canisterId={SATSCanisterID}>
            <App />
          </ActorProvider>
        </AgentProvider>
      </StrictMode>
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('SATS');
  });
});
