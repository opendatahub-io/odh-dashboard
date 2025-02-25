import { FastifyRequest } from 'fastify';
import https from 'https';
import createError from 'http-errors';
import { setImpersonateAccessToken } from '../../../devFlags';
import { KubeFastifyInstance } from '../../../types';
import {
  DEV_IMPERSONATE_PASSWORD,
  DEV_IMPERSONATE_USER,
  DEV_OAUTH_PREFIX,
} from '../../../utils/constants';
import { createCustomError } from '../../../utils/requestUtils';
import { devRoute } from '../../../utils/route-security';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.post(
    '/',
    devRoute(async (request: FastifyRequest<{ Body: { impersonate: boolean } }>) => {
      return new Promise<{ code: number; response: string }>((resolve, reject) => {
        const doImpersonate = request.body.impersonate;
        if (doImpersonate) {
          const apiPath = fastify.kube.config.getCurrentCluster().server;
          const namedHost = apiPath.slice('https://api.'.length).split(':')[0];
          const url = `https://${DEV_OAUTH_PREFIX}.${namedHost}/oauth/authorize?response_type=token&client_id=openshift-challenging-client`;
          // Custom call, don't use proxy
          const httpsRequest = https
            .get(
              url,
              {
                headers: {
                  // This usage of toString is fine for internal dev flows
                  // eslint-disable-next-line no-restricted-properties
                  Authorization: `Basic ${Buffer.from(
                    `${DEV_IMPERSONATE_USER}:${DEV_IMPERSONATE_PASSWORD}`,
                  ).toString('base64')}`,
                },
              },
              (res) => {
                // 302 Found means the success of this call
                if (res.statusCode === 302) {
                  /**
                   * we will get the location in the headers like:
                   * https://oauth-openshift.apps.juntwang.dev.datahub.redhat.com/oauth/token/implicit#access_token={ACCESS_TOKEN_WE_WANT}
                   * &expires_in=86400&scope=user%3Afull&token_type=Bearer
                   */
                  const searchParams = new URLSearchParams(res.headers.location.split('#')[1]);
                  const accessToken = searchParams.get('access_token');
                  if (accessToken) {
                    setImpersonateAccessToken(accessToken);
                    resolve({ code: 200, response: accessToken });
                  } else {
                    reject({
                      code: 500,
                      response: 'Cannot fetch the impersonate token from the server.',
                    });
                  }
                } else {
                  reject({
                    code: 403,
                    response:
                      'Authorization error, please check the username and password in your local env file.',
                  });
                }
              },
            )
            .on('error', () => {
              reject({
                code: 500,
                response: 'There are some errors on the server, please try again later.',
              });
            });
          httpsRequest.end();
        } else {
          setImpersonateAccessToken('');
          resolve({ code: 200, response: '' });
        }
      }).catch((e: createError.HttpError) => {
        if (e?.code) {
          throw createCustomError(
            'Error impersonating user',
            e.response?.message || 'Impersonating user error',
            e.code,
          );
        }
        throw e;
      });
    }),
  );
};
