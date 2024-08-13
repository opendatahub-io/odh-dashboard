import { getDetectedAccelerators } from './acceleratorUtils';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { logRequestDetails } from '../../../utils/fileUtils';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get('/', async (request: OauthFastifyRequest) => {
    logRequestDetails(fastify, request);

    return getDetectedAccelerators(fastify);
  });
};
