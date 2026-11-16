import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getModuleFederationConfigs } from '@odh-dashboard/app-config';
import { CSP_NONCE_PLACEHOLDER } from '@odh-dashboard/app-config/security-policy';
import { DEV_MODE } from '../utils/constants';
import { errorHandler } from '../utils';
import {
  applyContentSecurityPolicy,
  createCspNonce,
  getCspMode,
  setNoStoreCacheHeaders,
} from '../utils/securityHeaders';

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

  // SPA shell under `/*` — not an API path, so set document cache policy here. The CSP is
  // applied only on this route: module `proxyService` replies that happen to be HTML belong
  // to an upstream UI and keep their own headers.
  //
  // The document is rendered to a string so the per-request nonce can be written into both
  // the CSP header and the inline theme bootstrap. Rendering and sending are inseparable
  // otherwise, and a nonce that only appears in one of the two places fails closed: the
  // theme never applies.
  fastify.get('/*', async (_: FastifyRequest, reply: FastifyReply) => {
    setNoStoreCacheHeaders(reply);

    const nonce = createCspNonce();
    const html = await fastify.view('index.html', { mfRemotesJson });

    reply.type('text/html; charset=utf-8');
    applyContentSecurityPolicy(reply, getCspMode(), nonce);

    return reply.send(String(html).replaceAll(CSP_NONCE_PLACEHOLDER, nonce));
  });
};
