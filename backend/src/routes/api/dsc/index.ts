import { KubeFastifyInstance } from '../../../types';
import { secureRoute } from '../../../utils/route-security';
import { getClusterStatus } from '../../../utils/dsc';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/status',
    secureRoute(fastify)(async () => {
      return getClusterStatus(fastify);
    }),
  );
};
