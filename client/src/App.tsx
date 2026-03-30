import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import WalletCard from './components/WalletCard';
import CreateWalletModal from './components/CreateWalletModal';
import { Plus, Wallet } from 'lucide-react';

export default function App() {
  const [creating, setCreating] = useState(false);

  const { data: wallets, isLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: api.listWallets,
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Wallet size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">HD Wallet</h1>
              <p className="text-xs text-gray-500">Ethereum & Bitcoin — Sepolia / Testnet</p>
            </div>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            New Wallet
          </button>
        </div>

        {/* Wallet list */}
        {isLoading ? (
          <div className="text-center text-gray-500 py-12">Loading wallets...</div>
        ) : wallets?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No wallets yet</p>
            <button
              onClick={() => setCreating(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm transition-colors"
            >
              Create your first wallet
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {wallets?.map((wallet) => (
              <WalletCard key={wallet.id} wallet={wallet} />
            ))}
          </div>
        )}
      </div>

      {creating && <CreateWalletModal onClose={() => setCreating(false)} />}
    </div>
  );
}