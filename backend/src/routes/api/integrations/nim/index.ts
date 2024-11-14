import { FastifyReply, FastifyRequest } from 'fastify';
import { secureAdminRoute } from '../../../../utils/route-security';
import { KubeFastifyInstance } from '../../../../types';
import { isString } from 'lodash';
import { createNIMAccount, createNIMSecret, getNIMAccount, isAppEnabled } from './nimUtils';

module.exports = async (fastify: KubeFastifyInstance) => {
  const { namespace } = fastify.kube;
  const PAGE_NOT_FOUND_MESSAGE = '404 page not found';

  fastify.get(
    '/',
    secureAdminRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      await getNIMAccount(fastify, namespace)
        .then((response) => {
          if (response) {
            // installed
            const isEnabled = isAppEnabled(response);
            reply.send({ isInstalled: true, isEnabled: isEnabled, canInstall: false, error: '' });
          } else {
            // Not installed
            fastify.log.info(`NIM account does not exist`);
            reply.send({ isInstalled: false, isEnabled: false, canInstall: true, error: '' });
          }
        })
        .catch((e) => {
          if (e.response?.statusCode === 404) {
            // 404 error means the Account CRD does not exist, so cannot create CR based on it.
            if (
              isString(e.response.body) &&
              e.response.body.trim() === PAGE_NOT_FOUND_MESSAGE.trim()
            ) {
              fastify.log.error(`NIM not installed, ${e.response?.body}`);
              reply.status(404).send({
                isInstalled: false,
                isAppEnabled: false,
                canInstall: false,
                error: 'NIM not installed',
              });
            }
          } else {
            fastify.log.error(`An unexpected error occurred: ${e.message || e}`);
            reply.status(500).send({
              isInstalled: false,
              isAppEnabled: false,
              canInstall: false,
              error: 'An unexpected error occurred. Please try again later.',
            });
          }
        });
    }),
  );

  fastify.post(
    '/',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{
          Body: { [key: string]: string };
        }>,
        reply: FastifyReply,
      ) => {
        const enableValues = request.body;

        await createNIMSecret(fastify, namespace, enableValues)
          .then(async () => {
            await createNIMAccount(fastify, namespace)
              .then((response) => {
                if (isAppEnabled(response)) {
                  reply.send({ isAppEnabled: true, canEnable: false, error: '' });
                } else {
                  reply.send({ isAppEnabled: false, canEnable: true, error: '' });
                }
              })
              .catch((e) => {
                fastify.log.error(`Failed to create NIM account.`);
                reply
                  .status(e.response.statusCode)
                  .send(new Error(`Failed to create NIM account, ${e.response?.body?.message}`));
              });
          })
          .catch((e) => {
            if (e.response?.statusCode === 409) {
              fastify.log.error(`NIM secret already exists, skipping creation.`);
              reply.status(409).send(new Error(`NIM secret already exists, skipping creation.`));
            } else {
              fastify.log.error(`Failed to create NIM secret. ${e.response?.body?.message}`);
              reply
                .status(e.response.statusCode)
                .send(new Error(`Failed to create NIM secret, ${e.response?.body?.message}`));
            }
          });
      },
    ),
  );
};
