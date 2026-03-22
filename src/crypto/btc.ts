import { BIP32Interface } from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';

const ECPair = ECPairFactory(ecc);

// Use testnet for development!
export const NETWORK = bitcoin.networks.testnet;

export function deriveBitcoinAddress(node: BIP32Interface): string {
  const pubkey = node.publicKey;
  const { address } = bitcoin.payments.p2wpkh({ pubkey, network: NETWORK });
  if (!address) throw new Error('Failed to derive Bitcoin address');
  return address;
}

export function buildBitcoinTx(params: {
  utxos: Array<{ txid: string; vout: number; value: number; rawHex: string }>;
  toAddress: string;
  amount: number; // satoshis
  changeAddress: string;
  feeRate: number; // sat/vbyte
  privateKeyHex: string;
}): string {
  const { utxos, toAddress, amount, changeAddress, feeRate, privateKeyHex } = params;

  const psbt = new bitcoin.Psbt({ network: NETWORK });
  let inputTotal = 0;

  for (const utxo of utxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: bitcoin.payments.p2wpkh({
          pubkey: ECPair.fromPrivateKey(Buffer.from(privateKeyHex, 'hex')).publicKey,
          network: NETWORK,
        }).output!,
        value: BigInt(utxo.value),
      },
    });
    inputTotal += utxo.value;
  }

  // Estimate fee (simple: 140 vbytes for 1-in-2-out P2WPKH)
  const estimatedFee = feeRate * 140;
  const change = inputTotal - amount - estimatedFee;
  if (change < 0) throw new Error('Insufficient funds');

  psbt.addOutput({ address: toAddress, value: BigInt(amount) });
  if (change > 546) psbt.addOutput({ address: changeAddress, value: BigInt(change) }); // dust threshold

  const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKeyHex, 'hex'), { network: NETWORK });
  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();

  return psbt.extractTransaction().toHex();
}