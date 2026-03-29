import { ethers } from 'ethers';
import { config } from '../config.js';

export class EthService {
  private provider: ethers.AlchemyProvider;

  constructor() {
    this.provider = new ethers.AlchemyProvider('sepolia', config.alchemyApiKey);
  }

  async getBalance(address: string): Promise<{ wei: string; eth: string }> {
    const balance = await this.provider.getBalance(address);
    return {
      wei: balance.toString(),
      eth: ethers.formatEther(balance),
    };
  }

  async getTransactionHistory(address: string) {
    const [sent, received] = await Promise.all([
      this.provider.send('alchemy_getAssetTransfers', [
        {
          fromBlock: '0x0',
          fromAddress: address,
          category: ['external', 'erc20'],
          withMetadata: true,
          maxCount: '0x14', // 20 results
        },
      ]),
      this.provider.send('alchemy_getAssetTransfers', [
        {
          fromBlock: '0x0',
          toAddress: address,
          category: ['external', 'erc20'],
          withMetadata: true,
          maxCount: '0x14',
        },
      ]),
    ]);

    return {
      sent: sent.transfers,
      received: received.transfers,
    };
  }

  async buildTransaction(params: {
    fromAddress: string;
    toAddress: string;
    amountEth: string;
  }) {
    const { fromAddress, toAddress, amountEth } = params;

    const [nonce, feeData, balance] = await Promise.all([
      this.provider.getTransactionCount(fromAddress, 'latest'),
      this.provider.getFeeData(),
      this.provider.getBalance(fromAddress),
    ]);

    const value = ethers.parseEther(amountEth);

    if (balance < value) throw new Error('Insufficient balance');

    return {
      to: toAddress,
      value: value.toString(),
      nonce,
      maxFeePerGas: feeData.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
      gasLimit: '21000', // standard ETH transfer
      chainId: 11155111, // Sepolia testnet
    };
  }

  async signAndBroadcast(params: {
    privateKeyHex: string;
    toAddress: string;
    amountEth: string;
    fromAddress: string;
  }) {
    const { privateKeyHex, toAddress, amountEth, fromAddress } = params;

    const wallet = new ethers.Wallet(privateKeyHex, this.provider);
    const tx = await this.buildTransaction({ fromAddress, toAddress, amountEth });

    const sentTx = await wallet.sendTransaction({
      to: tx.to,
      value: tx.value,
      nonce: tx.nonce,
      maxFeePerGas: tx.maxFeePerGas ?? undefined,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas ?? undefined,
      gasLimit: tx.gasLimit,
      chainId: tx.chainId,
    });

    return {
      txHash: sentTx.hash,
      explorerUrl: `https://sepolia.etherscan.io/tx/${sentTx.hash}`,
    };
  }
}