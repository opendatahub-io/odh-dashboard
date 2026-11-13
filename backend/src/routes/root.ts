import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getModuleFederationConfigs } from '@odh-dashboard/app-config';
import { DEV_MODE } from '../utils/constants';
import { errorHandler } from '../utils';
import { applyContentSecurityPolicy, setNoStoreCacheHeaders } from '../utils/securityHeaders';

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

  // The SPA shell is the only document this server renders, so the CSP is applied in this
  // route's encapsulated scope only. Module `proxyService` replies that happen to be HTML
  // belong to an upstream UI and keep their own headers.
  fastify.addHook('onSend', async (_request, reply, payload) => {
    applyContentSecurityPolicy(reply);
    return payload;
  });

  // SPA shell under `/*` — not an API path, so set document cache policy here.
  fastify.get('/*', async (_: FastifyRequest, reply: FastifyReply) => {
    setNoStoreCacheHeaders(reply);
    return reply.view('index.html', { mfRemotesJson });
  });
};
