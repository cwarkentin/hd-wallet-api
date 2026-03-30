import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, type Wallet, type TxResult } from '../api';
import { X, ExternalLink } from 'lucide-react';

export default function SendModal({ wallet, onClose }: { wallet: Wallet; onClose: () => void }) {
    const [toAddress, setToAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [feeRate, setFeeRate] = useState<'slow' | 'standard' | 'fast'>('standard');
    const [result, setResult] = useState<TxResult | null>(null);
    const isEth = wallet.chain === 'ETHEREUM';

    const { mutate, isPending, error } = useMutation({
        mutationFn: () =>
            isEth
                ? api.sendEth(wallet.id, toAddress, amount)
                : api.sendBtc(wallet.id, toAddress, parseInt(amount), feeRate),
        onSuccess: (data) => setResult(data),
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700">

                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-white">
                        Send {isEth ? '⟠ ETH' : '₿ BTC'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {result ? (
          <div className="space-y-3">
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
              <p className="text-green-400 font-medium mb-1">Transaction broadcast!</p>
              <p className="text-xs text-gray-400 font-mono break-all">
                {result.txHash ?? result.txid}
              </p>
            </div>
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors text-sm"
            >
              View on Explorer <ExternalLink size={14} />
            </a>
            <button
              onClick={onClose}
              className="w-full text-gray-400 hover:text-white text-sm py-2"
            >
              Close
            </button>
          </div>
            ) : (
            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">To Address</label>
                    <input
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                        placeholder={isEth ? '0x...' : 'tb1q...'}
                        value={toAddress}
                        onChange={(e) => setToAddress(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-1">
                        Amount ({isEth ? 'ETH' : 'Satoshis'})
                    </label>
                    <input
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder={isEth ? '0.001' : '10000'}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>

                {!isEth && (
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Fee Rate</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['slow', 'standard', 'fast'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFeeRate(f)}
                                    className={`py-1.5 rounded-lg border text-xs font-medium capitalize transition-colors ${feeRate === f
                                            ? 'bg-blue-600 border-blue-500 text-white'
                                            : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <p className="text-red-400 text-sm">
                        {(error as any).response?.data?.error ?? (error as any).message}
                    </p>
                )}

                <button
                    onClick={() => mutate()}
                    disabled={!toAddress || !amount || isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-colors"
                >
                    {isPending ? 'Broadcasting...' : 'Send Transaction'}
                </button>
            </div>
        )}

        </div>
    </div >
  );
}