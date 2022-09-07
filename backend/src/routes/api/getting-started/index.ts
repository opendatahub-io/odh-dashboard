import { FastifyInstance } from 'fastify';
import { OdhGettingStarted } from '../../../types';
import { listGettingStartedDocs } from './list';
import { secureRoute } from '../../../utils/route-security';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/',
    secureRoute(fastify)(async (request, reply) => {
      return listGettingStartedDocs(request)
        .then((res: OdhGettingStarted[]) => {
          return res;
        })
        .catch((res) => {
          reply.send(res);
        });
    }),
  );
};
