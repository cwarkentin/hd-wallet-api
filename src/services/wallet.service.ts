import { PrismaClient, Chain } from '../generated/prisma/index.js';
import { generateMnemonic, deriveWallet } from '../crypto/hd.js';
import { encrypt, decrypt } from '../crypto/encryption.js';

export class WalletService {
  constructor(private prisma: PrismaClient) {}

  async createWallet(name: string, chain: Chain) {
    const mnemonic = generateMnemonic();
    const encryptedMnemonic = encrypt(mnemonic);

    // Derive the first address (index 0) to store immediately
    const { address, derivationPath } = await deriveWallet(mnemonic, chain, 0);

    const wallet = await this.prisma.wallet.create({
      data: {
        name,
        chain,
        encryptedMnemonic,
        addressIndex: 0,
        addresses: {
          create: {
            address,
            derivationPath,
            index: 0,
          },
        },
      },
      include: { addresses: true },
    });

    return wallet;
  }

  async getWallet(id: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id },
      include: { addresses: true },
    });
    if (!wallet) throw new Error(`Wallet ${id} not found`);
    return wallet;
  }

  async listWallets() {
    return this.prisma.wallet.findMany({
      include: { addresses: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deriveNextAddress(walletId: string) {
    const wallet = await this.getWallet(walletId);
    const nextIndex = wallet.addressIndex + 1;

    // Decrypt mnemonic only in memory, never persisted in plain text
    const mnemonic = decrypt(wallet.encryptedMnemonic);
    const { address, derivationPath } = await deriveWallet(mnemonic, wallet.chain, nextIndex);

    // Atomically update the index and create the address
    const [, newAddress] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: walletId },
        data: { addressIndex: nextIndex },
      }),
      this.prisma.address.create({
        data: {
          walletId,
          address,
          derivationPath,
          index: nextIndex,
        },
      }),
    ]);

    return newAddress;
  }

  async deleteWallet(id: string) {
    await this.prisma.address.deleteMany({ where: { walletId: id } });
    await this.prisma.wallet.delete({ where: { id } });
  }
}