import { FastifyPluginAsync } from 'fastify';
import { WalletService } from '../services/wallet.service.js';
import { CreateWalletSchema, DeriveAddressSchema } from '../schemas/wallet.schema.js';

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
};

export default walletRoutes;