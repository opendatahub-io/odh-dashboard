import { KubeFastifyInstance } from '../../../types';
import { getAIHub, getAIHubFetchError } from '../../../utils/resourceUtils';
import { isAIHubResourceNotFoundError, getAIHubRouteError } from '../../../utils/aihub';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get('/', async () => {
    const aiHub = getAIHub(fastify);
    const fetchError = getAIHubFetchError();
    if (fetchError) {
      if (isAIHubResourceNotFoundError(fetchError)) {
        return null;
      }
      throw getAIHubRouteError(fetchError);
    }

    if (!aiHub) {
      throw getAIHubRouteError();
    }
    return aiHub;
  });
};
