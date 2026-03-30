import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Chain } from '../api';
import { X } from 'lucide-react';

export default function CreateWalletModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [chain, setChain] = useState<Chain>('ETHEREUM');
  const qc = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => api.createWallet(name, chain),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallets'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Create Wallet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Wallet Name</label>
            <input
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="My ETH Wallet"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Chain</label>
            <div className="grid grid-cols-2 gap-2">
              {(['ETHEREUM', 'BITCOIN'] as Chain[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setChain(c)}
                  className={`py-2 rounded-lg border text-sm font-medium transition-colors ${chain === c
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400'
                    }`}
                >
                  {c === 'ETHEREUM' ? '⟠ Ethereum' : '₿ Bitcoin'}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{(error as any).message}</p>
          )}

          <button
            onClick={() => mutate()}
            disabled={!name || isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-colors"
          >
            {isPending ? 'Creating...' : 'Create Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
}