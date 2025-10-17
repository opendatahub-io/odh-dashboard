import { KubeFastifyInstance } from '../../../types';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  await fastify.register(require('./featureStores'));
  await fastify.register(require('./fsworkbenchIntegration'));
};
