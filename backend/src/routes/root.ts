import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getModuleFederationConfigs } from '@odh-dashboard/app-config';
import { DEV_MODE } from '../utils/constants';
import { errorHandler } from '../utils';

export default async (fastify: FastifyInstance): Promise<void> => {
  let mfRemotesJson: string;
  try {
    const mfConfigs = getModuleFederationConfigs(DEV_MODE);
    const remotes = [
      ...mfConfigs
        .filter((c) => c.backend)
        .map((c) => ({
          name: c.name,
          remoteEntry: c.backend.remoteEntry,
        })),
    ];
    mfRemotesJson = remotes.length > 0 ? JSON.stringify(remotes) : undefined;
  } catch (e) {
    fastify.log.error(e, errorHandler(e));
  }

  fastify.get('/*', async (_: FastifyRequest, reply: FastifyReply) =>
    reply.view('index.html', { mfRemotesJson }),
  );
};
