import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { getAcceleratorNumbers } from './acceleratorUtils';
import { logRequestDetails } from '../../../utils/fileUtils';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get('/', async (request: OauthFastifyRequest) => {
    logRequestDetails(fastify, request);

    return getAcceleratorNumbers(fastify);
  });
};
