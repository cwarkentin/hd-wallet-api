import { FastifyPluginAsync } from 'fastify';
import { WalletService } from '../services/wallet.service.js';
import { CreateWalletSchema, DeriveAddressSchema } from '../schemas/wallet.schema.js';
import { EthService } from '../services/eth.service.js';
import { BtcService } from '../services/btc.service.js';

const walletRoutes: FastifyPluginAsync = async (server) => {
  // POST /wallets — create a new wallet
  server.post('/', async (request, reply) => {
    const body = CreateWalletSchema.parse(request.body);
    const service = new WalletService(server.prisma);
    const wallet = await service.createWallet(body.name, body.chain);
    return reply.code(201).send(wallet);
  });

  // GET /wallets — list all wallets
  server.get('/', async (_request, reply) => {
    const service = new WalletService(server.prisma);
    const wallets = await service.listWallets();
    return reply.send(wallets);
  });

  // GET /wallets/:id — get a single wallet with addresses
  server.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const service = new WalletService(server.prisma);
    const wallet = await service.getWallet(request.params.id);
    return reply.send(wallet);
  });

  // POST /wallets/:id/derive — derive the next address
  server.post<{ Params: { id: string } }>('/:id/derive', async (request, reply) => {
    const { walletId } = DeriveAddressSchema.parse({ walletId: request.params.id });
    const service = new WalletService(server.prisma);
    const address = await service.deriveNextAddress(walletId);
    return reply.code(201).send(address);
  });

  // DELETE /wallets/:id — delete a wallet
  server.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const service = new WalletService(server.prisma);
    await service.deleteWallet(request.params.id);
    return reply.code(204).send();
  });

  // GET /wallets/:id/balance — get balance for all addresses in a wallet
  server.get<{ Params: { id: string } }>('/:id/balance', async (request, reply) => {
    const walletService = new WalletService(server.prisma);
    const wallet = await walletService.getWallet(request.params.id);

    if (wallet.chain === 'ETHEREUM') {
      const ethService = new EthService();
      const balances = await Promise.all(
        wallet.addresses.map(async (addr) => {
          const balance = await ethService.getBalance(addr.address);
          return { address: addr.address, derivationPath: addr.derivationPath, ...balance };
        })
      );
      return reply.send({ walletId: wallet.id, chain: wallet.chain, balances });
    }

    if (wallet.chain === 'BITCOIN') {
      const btcService = new BtcService();
      const balances = await Promise.all(
        wallet.addresses.map(async (addr) => {
          const balance = await btcService.getBalance(addr.address);
          return { address: addr.address, derivationPath: addr.derivationPath, ...balance };
        })
      );
      return reply.send({ walletId: wallet.id, chain: wallet.chain, balances });
    }
  });
};

export default walletRoutes;