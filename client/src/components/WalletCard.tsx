import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Wallet } from '../api';
import { ChevronDown, ChevronUp, Trash2, Plus, RefreshCw } from 'lucide-react';
import SendModal from './SendModal';

export default function WalletCard({ wallet }: { wallet: Wallet }) {
    const [expanded, setExpanded] = useState(false);
    const [sending, setSending] = useState(false);
    const qc = useQueryClient();

    const { data: balanceData, refetch, isFetching } = useQuery({
        queryKey: ['balance', wallet.id],
        queryFn: () => api.getBalance(wallet.id),
        enabled: false,
    });

    const deriveMutation = useMutation({
        mutationFn: () => api.deriveAddress(wallet.id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['wallets'] }),
    });

    const deleteMutation = useMutation({
        mutationFn: () => api.deleteWallet(wallet.id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['wallets'] }),
    });

    const isEth = wallet.chain === 'ETHEREUM';
    const chainColor = isEth ? 'text-blue-400' : 'text-orange-400';
    const chainBg = isEth ? 'bg-blue-900/30 border-blue-800' : 'bg-orange-900/30 border-orange-800';

    return (
        <>
            <div className={`rounded-xl border p-4 ${chainBg}`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`text-lg font-semibold ${chainColor}`}>
                                {isEth ? '⟠' : '₿'}
                            </span>
                            <h3 className="text-white font-medium">{wallet.name}</h3>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {wallet.addresses.length} address{wallet.addresses.length !== 1 ? 'es' : ''}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => refetch()}
                            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                            title="Check balance"
                        >
                            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => setSending(true)}
                            className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Send
                        </button>
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="text-gray-400 hover:text-white p-1"
                        >
                            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                    </div>
                </div>

                {/* Balance */}
                {balanceData && (
                    <div className="mt-3 space-y-1">
                        {balanceData.balances.map((b) => (
                            <div key={b.address} className="bg-black/20 rounded-lg px-3 py-2">
                                <p className="text-xs text-gray-500 font-mono truncate">{b.address}</p>
                                <p className={`text-sm font-semibold mt-0.5 ${chainColor}`}>
                                    {isEth ? `${b.eth} ETH` : `${b.btc} BTC`}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Expanded addresses */}
                {expanded && (
                    <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Addresses</p>
                            <button
                                onClick={() => deriveMutation.mutate()}
                                disabled={deriveMutation.isPending}
                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                            >
                                <Plus size={12} />
                                {deriveMutation.isPending ? 'Deriving...' : 'Derive next'}
                            </button>
                        </div>
                        {wallet.addresses.map((addr) => (
                            <div key={addr.id} className="bg-black/20 rounded-lg px-3 py-2">
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-gray-500">{addr.derivationPath}</p>
                                    <p className="text-xs text-gray-600">#{addr.index}</p>
                                </div>
                                <p className="text-xs text-gray-300 font-mono mt-0.5 break-all">{addr.address}</p>
                            </div>
                        ))}

                        <button
                            onClick={() => deleteMutation.mutate()}
                            disabled={deleteMutation.isPending}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 mt-2 transition-colors"
                        >
                            <Trash2 size={12} />
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete wallet'}
                        </button>
                    </div>
                )}
            </div>

            {sending && (
                <SendModal wallet={wallet} onClose={() => setSending(false)} />
            )}
        </>
    );
}