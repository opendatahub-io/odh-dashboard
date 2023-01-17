import { FastifyInstance, FastifyRequest } from 'fastify';
import { setImpersonate } from '../../../devFlags';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.post('/', async (request: FastifyRequest<{ Body: { impersonate: boolean } }>) => {
    setImpersonate(request.body.impersonate);
    return null;
  });
};
