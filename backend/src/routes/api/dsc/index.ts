import { KubeFastifyInstance } from '../../../types';
import { getClusterStatus } from '../../../utils/resourceUtils';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get('/status', async () => getClusterStatus(fastify));
};
