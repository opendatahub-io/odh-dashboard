import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { getGPUNumber } from './gpuUtils';
import { logRequestDetails } from '../../../utils/fileUtils';

/**
 * @deprecated - use accelerators instead
 */
export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get('/', async (request: OauthFastifyRequest) => {
    logRequestDetails(fastify, request);

    return getGPUNumber(fastify);
  });
};
