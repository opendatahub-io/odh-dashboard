import { KubeFastifyInstance } from '../../../types';
import { getGPUNumber } from './gpuUtils';
import { secureRoute } from '../../../utils/route-security';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/',
    secureRoute(fastify)(async () => {
      return getGPUNumber(fastify);
    }),
  );
};
