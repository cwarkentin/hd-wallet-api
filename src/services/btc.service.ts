const BASE_URL = 'https://blockstream.info/testnet/api';

export interface UTXO {
    txid: string;
    vout: number;
    value: number;
    rawHex: string;
}

export class BtcService {
    private async fetch<T>(path: string): Promise<T> {
        const res = await fetch(`${BASE_URL}${path}`);
        if (!res.ok) throw new Error(`Blockstream API error: ${res.status} ${res.statusText}`);
        return res.json() as Promise<T>;
    }

    async getBalance(address: string): Promise<{ confirmed: number; unconfirmed: number; btc: string }> {
        const data = await this.fetch<{
            chain_stats: { funded_txo_sum: number; spent_txo_sum: number };
            mempool_stats: { funded_txo_sum: number; spent_txo_sum: number };
        }>(`/address/${address}`);

        const confirmed =
            data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
        const unconfirmed =
            data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum;

        return {
            confirmed,
            unconfirmed,
            btc: (confirmed / 1e8).toFixed(8),
        };
    }

    async getUTXOs(address: string): Promise<UTXO[]> {
        const utxos = await this.fetch<Array<{
            txid: string;
            vout: number;
            value: number;
        }>>(`/address/${address}/utxo`);

        const withHex = await Promise.all(
            utxos.map(async (utxo) => {
                // Fetch raw hex as plain text, not JSON
                const res = await fetch(`${BASE_URL}/tx/${utxo.txid}/hex`);
                if (!res.ok) throw new Error(`Failed to fetch tx hex: ${res.status}`);
                const rawHex = await res.text();
                return { ...utxo, rawHex };
            })
        );

        return withHex;
    }

    async getTransactionHistory(address: string) {
        return this.fetch<Array<{
            txid: string;
            fee: number;
            status: { confirmed: boolean; block_time: number };
            vin: Array<{ prevout: { scriptpubkey_address: string; value: number } }>;
            vout: Array<{ scriptpubkey_address: string; value: number }>;
        }>>(`/address/${address}/txs`);
    }

    async getFeeEstimates(): Promise<{ slow: number; standard: number; fast: number }> {
        const fees = await this.fetch<Record<string, number>>('/fee-estimates');
        return {
            slow: Math.ceil(fees['6'] ?? 1),      // ~1 hour
            standard: Math.ceil(fees['3'] ?? 2),  // ~30 min
            fast: Math.ceil(fees['1'] ?? 3),      // next block
        };
    }

    async broadcast(rawTxHex: string): Promise<{ txid: string; explorerUrl: string }> {
        const res = await fetch(`${BASE_URL}/tx`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: rawTxHex,
        });

        if (!res.ok) throw new Error(`Broadcast failed: ${await res.text()}`);

        const txid = await res.text();
        return {
            txid,
            explorerUrl: `https://blockstream.info/testnet/tx/${txid}`,
        };
    }
}