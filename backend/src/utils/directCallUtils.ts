import { DEV_MODE, USER_ACCESS_TOKEN } from './constants';
import { KubeFastifyInstance, OauthFastifyRequest } from '../types';
import { getImpersonateAccessToken, isImpersonating } from '../devFlags';
import type { FastifyRequest } from 'fastify';

export const getAccessToken = (options: Partial<FastifyRequest>): string | undefined =>
  typeof options.headers?.Authorization === 'string'
    ? options.headers.Authorization.match(/^Bearer (.*?)$/)[1]
    : undefined;

export const getDirectCallOptions = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  url: string,
): Promise<Pick<FastifyRequest, 'headers'>> => {
  // Use our kube setup to boostrap our request
  const kc = fastify.kube.config;
  const kubeOptions: Parameters<typeof kc.applyToRequest>[0] = { url };
  await kc.applyToRequest(kubeOptions);
  const { headers: kubeHeaders } = kubeOptions;

  // Adjust the header auth token
  let headers;
  const raw = request.headers[USER_ACCESS_TOKEN];
  const accessToken = Array.isArray(raw) ? raw[0] : raw;

  if (accessToken) {
    headers = {
      ...kubeHeaders,
      Authorization: `Bearer ${accessToken}`,
    };
  } else if (DEV_MODE) {
    // No forwarded token in dev mode — use kubeconfig identity directly
    headers = kubeHeaders;
    if (isImpersonating() && !url.includes('thanos-querier-openshift-monitoring')) {
      headers = {
        ...kubeHeaders,
        Authorization: `Bearer ${getImpersonateAccessToken()}`,
      };
    }
  } else {
    fastify.log.error(
      `No ${USER_ACCESS_TOKEN} header. Cannot make a pass through call as this user.`,
    );
    throw new Error('No access token provided by oauth. Cannot make any API calls to kube.');
  }

  return {
    headers,
  };
};
