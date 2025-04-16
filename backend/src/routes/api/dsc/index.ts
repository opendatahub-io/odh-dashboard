import { KubeFastifyInstance } from '../../../types';
import { getClusterStatus } from '../../../utils/resourceUtils';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get('/status', async () => getClusterStatus(fastify));
};
