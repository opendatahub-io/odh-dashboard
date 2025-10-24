import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getModuleFederationConfig } from './module-federation';

export default async (fastify: FastifyInstance): Promise<void> => {
  const remotes = getModuleFederationConfig(fastify)?.map((c) => ({
    name: c.name,
    remoteEntry: c.remoteEntry,
  }));
  const mfRemotesJson = remotes ? JSON.stringify(remotes) : undefined;

  fastify.get('/*', async (_: FastifyRequest, reply: FastifyReply) =>
    reply.view('index.html', { mfRemotesJson }),
  );
};
