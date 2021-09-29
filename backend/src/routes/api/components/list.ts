import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, OdhApplication } from '../../../types';
import { getApplications } from '../../../utils/resourceUtils';

export const listComponents = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<OdhApplication[]> => {
  const applications = await getApplications();
  const query = request.query as { [key: string]: string };

  if (query.installed) {
    return Promise.resolve(applications.filter((app) => app.spec.isEnabled));
  }
  return Promise.resolve(applications);
};
