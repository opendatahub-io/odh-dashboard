import { FastifyReply, FastifyRequest } from 'fastify';
import { secureAdminRoute } from '../../../../utils/route-security';
import { KubeFastifyInstance } from '../../../../types';
import { isString } from 'lodash';
import { createNIMAccount, createNIMSecret, getNIMAccount, isAppEnabled } from './nimUtils';

module.exports = async (fastify: KubeFastifyInstance) => {
  const PAGE_NOT_FOUND_MESSAGE = '404 page not found';

  fastify.get(
    '/',
    secureAdminRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      await getNIMAccount(fastify)
        .then((response) => {
          if (response) {
            // Installed
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
              fastify.log.info(`NIM not installed, ${e.response?.body}`);
              reply.send({
                isInstalled: false,
                isEnabled: false,
                canInstall: false,
                error: 'NIM not installed',
              });
            }
          } else {
            fastify.log.error(`An unexpected error occurred: ${e.response.body?.message}`);
            reply.send({
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

        try {
          const { createdNew } = await createNIMSecret(fastify, enableValues);
          // If the secret already exists, ensure the account is created or retrieved
          if (!createdNew) {
            try {
              const account = await getNIMAccount(fastify);
              if (!account) {
                // If the account does not exist, create it
                const response = await createNIMAccount(fastify);
                const isEnabled = isAppEnabled(response);
                reply.send({
                  isInstalled: true,
                  isEnabled: isEnabled,
                  canInstall: false,
                  error: '',
                });
              } else {
                // If the account exists, get its status
                const isEnabled = isAppEnabled(account);
                reply.send({
                  isInstalled: true,
                  isEnabled: isEnabled,
                  canInstall: false,
                  error: '',
                });
              }
            } catch (accountError: any) {
              const message =
                accountError.response?.statusCode === 409
                  ? 'NIM account already exists.'
                  : `Failed to create or retrieve NIM account: ${accountError.response?.body?.message}`;
              fastify.log.error(message);
              reply.status(accountError.response?.statusCode || 500).send(new Error(message));
            }
          } else {
            // If the secret is newly created, ensure the account is created
            try {
              const response = await createNIMAccount(fastify);
              const isEnabled = isAppEnabled(response);
              reply.send({
                isInstalled: true,
                isEnabled: isEnabled,
                canInstall: false,
                error: '',
              });
            } catch (accountError: any) {
              const message = `Failed to create NIM account: ${accountError.response?.body?.message}`;
              fastify.log.error(message);
              reply.status(accountError.response?.statusCode || 500).send(new Error(message));
            }
          }
        } catch (secretError: any) {
          if (secretError.response?.statusCode === 409) {
            fastify.log.error(`NIM secret already exists, skipping creation.`);
            reply.status(409).send(new Error(`NIM secret already exists, skipping creation.`));
          } else {
            fastify.log.error(
              `Failed to create NIM secret. ${secretError.response?.body?.message}`,
            );
            reply
              .status(secretError.response?.statusCode || 500)
              .send(
                new Error(`Failed to create NIM secret, ${secretError.response?.body?.message}`),
              );
          }
        }
      },
    ),
  );
};
