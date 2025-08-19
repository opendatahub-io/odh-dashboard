import { DEV_MODE, USER_ACCESS_TOKEN } from './constants';
import { KubeFastifyInstance, OauthFastifyRequest } from '../types';
import { getImpersonateAccessToken, isImpersonating } from '../devFlags';
import { FastifyRequest } from 'fastify/types/request';

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
  if (DEV_MODE) {
    // In dev mode, we always are logged in fully -- no service accounts
    headers = kubeHeaders;
    // Fakes the call as another user to test permissions
    if (isImpersonating() && !url.includes('thanos-querier-openshift-monitoring')) {
      // We are impersonating an endpoint that is not thanos -- use the token from the impersonated user
      // Thanos Querier does not grant basic user access on external routes
      headers = {
        ...kubeHeaders,
        Authorization: `Bearer ${getImpersonateAccessToken()}`,
      };
    }
  } else {
    // When not in dev mode, we want to switch the token from the service account to the user
    const accessToken = request.headers[USER_ACCESS_TOKEN];
    if (!accessToken) {
      fastify.log.error(
        `No ${USER_ACCESS_TOKEN} header. Cannot make a pass through call as this user.`,
      );
      throw new Error('No access token provided by oauth. Cannot make any API calls to kube.');
    }
    headers = {
      ...kubeHeaders,
      Authorization: `Bearer ${accessToken}`,
    };
  }

  return {
    headers,
  };
};
