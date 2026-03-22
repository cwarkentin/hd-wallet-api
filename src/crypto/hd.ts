import * as bip39 from 'bip39';
import { BIP32Factory, BIP32Interface } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { ethers } from 'ethers';

const bip32 = BIP32Factory(ecc);

export type Chain = 'ETHEREUM' | 'BITCOIN';

// BIP-44 coin types: 60 = ETH, 0 = BTC
const COIN_TYPE: Record<Chain, number> = {
  ETHEREUM: 60,
  BITCOIN: 0,
};

export function generateMnemonic(): string {
  return bip39.generateMnemonic(256); // 24 words
}

export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}

export async function deriveWallet(
  mnemonic: string,
  chain: Chain,
  index: number
): Promise<{ address: string; privateKey: string; derivationPath: string }> {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = bip32.fromSeed(seed);
  const coinType = COIN_TYPE[chain];
  const path = `m/44'/${coinType}'/0'/0/${index}`;
  const child = root.derivePath(path);

  if (!child.privateKey) throw new Error('Failed to derive private key');

  if (chain === 'ETHEREUM') {
    const wallet = new ethers.Wallet(Buffer.from(child.privateKey).toString('hex'));
    return { address: wallet.address, privateKey: wallet.privateKey, derivationPath: path };
  } else {
    // Bitcoin address derivation handled in btc.ts
    const { deriveBitcoinAddress } = await import('./btc.ts');
    const address = deriveBitcoinAddress(child);
    return {
      address,
      privateKey: Buffer.from(child.privateKey).toString('hex'),
      derivationPath: path,
    };
  }
}