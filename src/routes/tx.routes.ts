import { FastifyPluginAsync } from 'fastify';

const txRoutes: FastifyPluginAsync = async (server) => {
  server.get('/', async () => {
    return { message: 'tx routes coming soon' };
  });
};

export default txRoutes;