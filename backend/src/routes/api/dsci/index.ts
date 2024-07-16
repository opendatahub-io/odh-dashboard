import { getClusterInitialization } from '../../../utils/dsci';
import { KubeFastifyInstance } from '../../../types';
import { secureRoute } from '../../../utils/route-security';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/status',
    secureRoute(fastify)(async () => getClusterInitialization(fastify)),
  );
};
