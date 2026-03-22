import Fastify from 'fastify';
import { config } from './config.js';
import prismaPlugin from './plugins/prisma.js';
import walletRoutes from './routes/wallet.routes.js';
import txRoutes from './routes/tx.routes.js';

const server = Fastify({ logger: true });

async function main() {
  await server.register(prismaPlugin);
  await server.register(walletRoutes, { prefix: '/wallets' });
  await server.register(txRoutes, { prefix: '/tx' });

  server.get('/health', async () => ({ status: 'ok' }));

  await server.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});