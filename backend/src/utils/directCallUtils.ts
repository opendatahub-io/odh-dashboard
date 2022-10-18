import { RequestOptions } from 'https';
import { DEV_MODE, USER_ACCESS_TOKEN } from './constants';
import { KubeFastifyInstance, OauthFastifyRequest } from '../types';

export const getDirectCallOptions = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  url: string,
): Promise<RequestOptions> => {
  // Use our kube setup to boostrap our request
  const kc = fastify.kube.config;
  const kubeOptions: Parameters<typeof kc.applyToRequest>[0] = { url };
  await kc.applyToRequest(kubeOptions);
  const { headers: kubeHeaders, ca } = kubeOptions;

  // Adjust the header auth token
  let headers;
  if (DEV_MODE) {
    // In dev mode, we always are logged in fully -- no service accounts
    headers = kubeHeaders;
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
    ca,
    headers,
  };
};
