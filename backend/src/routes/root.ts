import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getModuleFederationConfigs } from '@odh-dashboard/app-config';
import { DEV_MODE } from '../utils/constants';
import { errorHandler } from '../utils';

// The rendered value is placed in an application/json script element. Escape
// HTML-significant characters so configuration cannot terminate that element.
const escapeJsonForHtmlScript = (json: string): string =>
  json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

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
    mfRemotesJson =
      remotes.length > 0 ? escapeJsonForHtmlScript(JSON.stringify(remotes)) : undefined;
  } catch (e) {
    fastify.log.error(e, errorHandler(e));
  }

  fastify.get('/*', async (_: FastifyRequest, reply: FastifyReply) =>
    reply.header('Cache-Control', 'no-cache').view('index.html', { mfRemotesJson }),
  );
};
