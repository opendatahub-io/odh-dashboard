import { getClusterInitialization } from '../../../utils/dsci';
import { KubeFastifyInstance } from '../../../types';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get('/status', async () => getClusterInitialization(fastify));
};
