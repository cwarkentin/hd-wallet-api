import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { fp } from '../fp.js';
import { FastifyPluginAsync } from 'fastify';


const prismaPlugin: FastifyPluginAsync = fp(async (server: any) => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  server.decorate('prisma', prisma);

  server.addHook('onClose', async (server: any) => {
    await server.prisma.$disconnect();
  });
});

export default prismaPlugin;

declare module 'fastify' {
  interface FastifyInstance {
    prisma: InstanceType<typeof PrismaClient>;
  }
}