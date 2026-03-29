import { describe, it, expect } from 'vitest';
import {
  generateMnemonic,
  validateMnemonic,
  deriveWallet,
} from '../../crypto/hd.js';

describe('mnemonic', () => {
  it('generates a valid 24-word mnemonic', () => {
    const mnemonic = generateMnemonic();
    const words = mnemonic.trim().split(' ');
    expect(words).toHaveLength(24);
    expect(validateMnemonic(mnemonic)).toBe(true);
  });

  it('generates a unique mnemonic each time', () => {
    const first = generateMnemonic();
    const second = generateMnemonic();
    expect(first).not.toBe(second);
  });

  it('rejects an invalid mnemonic', () => {
    expect(validateMnemonic('invalid mnemonic phrase')).toBe(false);
  });
});

describe('ETH derivation', () => {
  // Using a known mnemonic so we can assert deterministic output
  const mnemonic =
    'witch collapse practice feed shame open despair creek road again ice least';

  it('derives a valid Ethereum address', async () => {
    const { address } = await deriveWallet(mnemonic, 'ETHEREUM', 0);
    expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('derives deterministically — same input always gives same address', async () => {
    const first = await deriveWallet(mnemonic, 'ETHEREUM', 0);
    const second = await deriveWallet(mnemonic, 'ETHEREUM', 0);
    expect(first.address).toBe(second.address);
  });

  it('derives different addresses for different indices', async () => {
    const index0 = await deriveWallet(mnemonic, 'ETHEREUM', 0);
    const index1 = await deriveWallet(mnemonic, 'ETHEREUM', 1);
    expect(index0.address).not.toBe(index1.address);
  });

  it('uses the correct BIP-44 derivation path', async () => {
    const { derivationPath } = await deriveWallet(mnemonic, 'ETHEREUM', 0);
    expect(derivationPath).toBe("m/44'/60'/0'/0/0");
  });

  it('uses the correct BIP-44 derivation path for index 3', async () => {
    const { derivationPath } = await deriveWallet(mnemonic, 'ETHEREUM', 3);
    expect(derivationPath).toBe("m/44'/60'/0'/0/3");
  });
});

describe('BTC derivation', () => {
  const mnemonic =
    'witch collapse practice feed shame open despair creek road again ice least';

  it('derives a valid Bitcoin testnet address', async () => {
    const { address } = await deriveWallet(mnemonic, 'BITCOIN', 0);
    // Testnet P2WPKH addresses start with tb1q
    expect(address).toMatch(/^tb1q[a-z0-9]+$/);
  });

  it('derives deterministically', async () => {
    const first = await deriveWallet(mnemonic, 'BITCOIN', 0);
    const second = await deriveWallet(mnemonic, 'BITCOIN', 0);
    expect(first.address).toBe(second.address);
  });

  it('derives different addresses for different indices', async () => {
    const index0 = await deriveWallet(mnemonic, 'BITCOIN', 0);
    const index1 = await deriveWallet(mnemonic, 'BITCOIN', 1);
    expect(index0.address).not.toBe(index1.address);
  });

  it('uses the correct BIP-44 derivation path', async () => {
    const { derivationPath } = await deriveWallet(mnemonic, 'BITCOIN', 0);
    expect(derivationPath).toBe("m/44'/0'/0'/0/0");
  });
});