import { KubeFastifyInstance } from '../../../types';
import featureStores from './featureStores';
import fsworkbenchIntegration from './fsworkbenchIntegration';
import connectedWorkbenches from './connectedWorkbenches';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  await fastify.register(featureStores);
  await fastify.register(fsworkbenchIntegration);
  await fastify.register(connectedWorkbenches);
};
