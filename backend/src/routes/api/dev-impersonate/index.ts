import { FastifyRequest } from 'fastify';
import https from 'https';
import { setImpersonateAccessToken } from '../../../devFlags';
import { KubeFastifyInstance } from '../../../types';
import { DEV_IMPERSONATE_PASSWORD, DEV_IMPERSONATE_USER } from '../../../utils/constants';
import { devRoute } from '../../../utils/route-security';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.post(
    '/',
    devRoute(async (request: FastifyRequest<{ Body: { impersonate: boolean } }>) => {
      const doImpersonate = request.body.impersonate;
      if (doImpersonate) {
        const apiPath = fastify.kube.config.getCurrentCluster().server;
        const namedHost = apiPath.slice('https://api.'.length).split(':')[0];
        const url = `https://oauth-openshift.apps.${namedHost}/oauth/authorize?response_type=token&client_id=openshift-challenging-client`;
        https
          .get(
            url,
            {
              headers: {
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
                const accessToken = res.headers.location.split('access_token=')[1]?.split('&')[0];
                setImpersonateAccessToken(accessToken);
              } else {
                setImpersonateAccessToken('');
              }
            },
          )
          .on('error', () => {
            setImpersonateAccessToken('');
          });
      } else {
        setImpersonateAccessToken('');
      }
      return null;
    }),
  );
};
