import { KubeFastifyInstance } from '../../../types';
import { getAIHub, getAIHubFetchError } from '../../../utils/resourceUtils';
import { getAIHubRouteError } from '../../../utils/aihub';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get('/', async () => {
    const fetchError = getAIHubFetchError();
    if (fetchError) {
      throw getAIHubRouteError(fetchError);
    }

    const aiHub = getAIHub(fastify);
    if (!aiHub) {
      throw getAIHubRouteError({ response: { statusCode: 404 } });
    }
    return aiHub;
  });
};
