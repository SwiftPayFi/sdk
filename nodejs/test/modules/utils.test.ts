import { describe, expect, it } from 'vitest';

import { SwiftPay } from '../../src/index.js';
import { jsonResponse, mockFetch } from '../setup.js';

const chainFixture = {
  id: 'ethereum',
  name: 'Ethereum',
  symbol: 'ETH',
  type: 'evm',
  chainId: 1,
  nativeCurrency: 'ETH',
  blockTimeSeconds: 12,
  confirmationBlocks: 12,
  explorerUrl: 'https://etherscan.io',
  isTestnet: false,
};

const tokenFixture = {
  symbol: 'USDC',
  name: 'USD Coin',
  type: 'ERC-20',
  coingeckoId: 'usd-coin',
  networks: { '1': { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 } },
};

describe('utils module', () => {
  it('listChains() unwraps the envelope', async () => {
    const { fetch, calls } = mockFetch(() => jsonResponse({ success: true, data: [chainFixture] }));
    const client = new SwiftPay({ fetch });
    const chains = await client.utils.listChains();
    expect(chains).toEqual([chainFixture]);
    expect(calls[0]?.url).toMatch(/\/v1\/utils\/chains$/);
    expect(calls[0]?.method).toBe('GET');
  });

  it('listTokens() unwraps the envelope', async () => {
    const { fetch } = mockFetch(() => jsonResponse({ success: true, data: [tokenFixture] }));
    const client = new SwiftPay({ fetch });
    const tokens = await client.utils.listTokens();
    expect(tokens).toEqual([tokenFixture]);
  });
});
