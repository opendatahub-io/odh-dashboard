import { getClusterInitialization } from '../../../utils/dsci';
import { KubeFastifyInstance } from '../../../types';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get('/status', async () => getClusterInitialization(fastify));
};
