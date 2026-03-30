import axios from 'axios';

const http = axios.create({ baseURL: '/api' });

export type Chain = 'ETHEREUM' | 'BITCOIN';

export interface Address {
  id: string;
  address: string;
  derivationPath: string;
  index: number;
}

export interface Wallet {
  id: string;
  name: string;
  chain: Chain;
  addressIndex: number;
  addresses: Address[];
  createdAt: string;
}

export interface Balance {
  address: string;
  derivationPath: string;
  eth?: string;
  wei?: string;
  btc?: string;
  confirmed?: number;
  unconfirmed?: number;
}

export interface BalanceResponse {
  walletId: string;
  chain: Chain;
  balances: Balance[];
}

export interface TxResult {
  from: string;
  to: string;
  txHash?: string;
  txid?: string;
  explorerUrl: string;
  amountEth?: string;
  amountSats?: number;
}

export const api = {
  // Wallets
  createWallet: (name: string, chain: Chain) =>
    http.post<Wallet>('/wallets', { name, chain }).then((r) => r.data),

  listWallets: () =>
    http.get<Wallet[]>('/wallets').then((r) => r.data),

  getBalance: (id: string) =>
    http.get<BalanceResponse>(`/wallets/${id}/balance`).then((r) => r.data),

  deriveAddress: (id: string) =>
    http.post<Address>(`/wallets/${id}/derive`).then((r) => r.data),

  deleteWallet: (id: string) =>
    http.delete(`/wallets/${id}`),

  // Transactions
  sendEth: (walletId: string, toAddress: string, amountEth: string, fromIndex = 0) =>
    http.post<TxResult>('/tx/eth/send', { walletId, toAddress, amountEth, fromIndex }).then((r) => r.data),

  sendBtc: (walletId: string, toAddress: string, amountSats: number, feeRate = 'standard', fromIndex = 0) =>
    http.post<TxResult>('/tx/btc/send', { walletId, toAddress, amountSats, feeRate, fromIndex }).then((r) => r.data),
};