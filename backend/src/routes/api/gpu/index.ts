import { KubeFastifyInstance } from '../../../types';
import { getGPUNumber } from './gpuUtils';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get('/', async () => {
    return getGPUNumber(fastify);
  });
};
