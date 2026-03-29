import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletService } from '../../services/wallet.service.js';

// Mock Prisma
const mockPrisma = {
  wallet: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  address: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
});

describe('WalletService.createWallet', () => {
  it('creates a wallet with an encrypted mnemonic', async () => {
    const service = new WalletService(mockPrisma as any);

    mockPrisma.wallet.create.mockResolvedValue({
      id: 'test-id',
      name: 'Test Wallet',
      chain: 'ETHEREUM',
      encryptedMnemonic: 'encrypted',
      addressIndex: 0,
      addresses: [{ address: '0xabc', derivationPath: "m/44'/60'/0'/0/0", index: 0 }],
      createdAt: new Date(),
    });

    const wallet = await service.createWallet('Test Wallet', 'ETHEREUM');

    expect(mockPrisma.wallet.create).toHaveBeenCalledOnce();

    // Verify the mnemonic stored is encrypted, not plaintext
    const callArg = mockPrisma.wallet.create.mock.calls[0][0];
    expect(callArg.data.encryptedMnemonic).not.toMatch(/^[a-z]+ [a-z]+/); // not plaintext words
    expect(callArg.data.name).toBe('Test Wallet');
    expect(callArg.data.chain).toBe('ETHEREUM');
    expect(wallet.id).toBe('test-id');
  });
});

describe('WalletService.getWallet', () => {
  it('returns the wallet when found', async () => {
    const service = new WalletService(mockPrisma as any);

    mockPrisma.wallet.findUnique.mockResolvedValue({
      id: 'test-id',
      name: 'Test Wallet',
      chain: 'ETHEREUM',
      addresses: [],
    });

    const wallet = await service.getWallet('test-id');
    expect(wallet.id).toBe('test-id');
    expect(mockPrisma.wallet.findUnique).toHaveBeenCalledWith({
      where: { id: 'test-id' },
      include: { addresses: true },
    });
  });

  it('throws when wallet not found', async () => {
    const service = new WalletService(mockPrisma as any);
    mockPrisma.wallet.findUnique.mockResolvedValue(null);
    await expect(service.getWallet('missing-id')).rejects.toThrow('Wallet missing-id not found');
  });
});

describe('WalletService.deriveNextAddress', () => {
  it('derives the next address and increments the index', async () => {
    const service = new WalletService(mockPrisma as any);
    const { encrypt } = await import('../../crypto/encryption.js');
    const { generateMnemonic } = await import('../../crypto/hd.js');

    const mnemonic = generateMnemonic();
    const encryptedMnemonic = encrypt(mnemonic);

    mockPrisma.wallet.findUnique.mockResolvedValue({
      id: 'test-id',
      chain: 'ETHEREUM',
      encryptedMnemonic,
      addressIndex: 0,
      addresses: [],
    });

    mockPrisma.$transaction.mockImplementation(async (ops: any[]) => {
      return Promise.all(ops.map((op) => op));
    });

    mockPrisma.address.create.mockResolvedValue({
      id: 'addr-id',
      address: '0xnew',
      derivationPath: "m/44'/60'/0'/0/1",
      index: 1,
    });

    mockPrisma.wallet.update.mockResolvedValue({});

    const address = await service.deriveNextAddress('test-id');

    expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
      where: { id: 'test-id' },
      data: { addressIndex: 1 },
    });
    expect(address.index).toBe(1);
  });
});