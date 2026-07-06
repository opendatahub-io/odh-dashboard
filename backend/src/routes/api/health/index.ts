import { health } from './healthUtils';
import { KubeFastifyInstance } from '../../../types';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  // Unsecured route for health check
  fastify.get('/', async () => health(fastify));
};
