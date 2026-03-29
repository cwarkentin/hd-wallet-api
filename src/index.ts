import Fastify from 'fastify';
import { config } from './config.js';
import prismaPlugin from './plugins/prisma.js';
import walletRoutes from './routes/wallet.routes.js';
import txRoutes from './routes/tx.routes.js';
import { ZodError } from 'zod';

const server = Fastify({ logger: true });

async function main() {
  server.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'Validation failed',
        issues: error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    server.log.error(error);
    return reply.code(500).send({ error: error.message ?? 'Internal server error' });
  });

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