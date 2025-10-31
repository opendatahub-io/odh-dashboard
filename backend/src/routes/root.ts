import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getModuleFederationConfigs } from '@odh-dashboard/app-config';
import { DEV_MODE } from '../utils/constants';
import { errorHandler } from '../utils';

export default async (fastify: FastifyInstance): Promise<void> => {
  let mfRemotesJson: string;
  try {
    const remotes = getModuleFederationConfigs(DEV_MODE).map((c) => ({
      name: c.name,
      remoteEntry: c.remoteEntry,
    }));
    mfRemotesJson = remotes ? JSON.stringify(remotes) : undefined;
  } catch (e) {
    fastify.log.error(e, errorHandler(e));
  }

  fastify.get('/*', async (_: FastifyRequest, reply: FastifyReply) =>
    reply.view('index.html', { mfRemotesJson }),
  );
};
