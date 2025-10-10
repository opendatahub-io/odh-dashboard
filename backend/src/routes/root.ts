import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getModuleFederationConfig } from './module-federation';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/*', async (_: FastifyRequest, reply: FastifyReply) => {
    const remotes = getModuleFederationConfig(fastify)?.map((c) => ({
      name: c.name,
      remoteEntry: c.remoteEntry,
    }));
    const mfRemotesJson = remotes ? JSON.stringify(remotes) : undefined;
    return reply.view('index.html', { mfRemotesJson });
  });
};
