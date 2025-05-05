import { FastifyReply, FastifyRequest } from 'fastify';
import { secureAdminRoute } from '../../../../utils/route-security';
import { KubeFastifyInstance, VariablesValidationStatus } from '../../../../types';
import { isString } from 'lodash';
import {
  apiKeyValidationStatus,
  createNIMAccount,
  deleteNIMAccount,
  errorMsgList,
  getLastAccountCheckTimestamp,
  getNIMAccount,
  isAppEnabled,
  manageNIMSecret,
} from './nimUtils';

module.exports = async (fastify: KubeFastifyInstance) => {
  const PAGE_NOT_FOUND_MESSAGE = '404 page not found';

  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    await getNIMAccount(fastify)
      .then((response) => {
        if (response) {
          // Installed
          const isEnabled = isAppEnabled(response);
          const keyValidationStatus: string = apiKeyValidationStatus(response);
          const accountStatusTimestamp: string = getLastAccountCheckTimestamp(response);
          const errorMsg: string = errorMsgList(response)[0];
          reply.send({
            isInstalled: true,
            isEnabled: isEnabled,
            variablesValidationStatus: keyValidationStatus,
            variablesValidationTimestamp: accountStatusTimestamp,
            canInstall: !isEnabled,
            error: errorMsg,
          });
        } else {
          // Not installed
          fastify.log.info(`NIM account does not exist`);
          reply.send({
            isInstalled: false,
            isEnabled: false,
            variablesValidationStatus: VariablesValidationStatus.UNKNOWN,
            variablesValidationTimestamp: '',
            canInstall: true,
            error: '',
          });
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
              variablesValidationStatus: VariablesValidationStatus.UNKNOWN,
              variablesValidationTimestamp: '',
              canInstall: false,
              error: 'NIM not installed',
            });
          }
        } else {
          fastify.log.error(`An unexpected error occurred: ${e.response.body?.message}`);
          reply.send({
            isInstalled: false,
            isEnabled: false,
            variablesValidationStatus: VariablesValidationStatus.UNKNOWN,
            variablesValidationTimestamp: '',
            canInstall: false,
            error: 'An unexpected error occurred. Please try again later.',
          });
        }
      });
  });

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
          await manageNIMSecret(fastify, enableValues);
          // Ensure the account exists
          try {
            const account = await getNIMAccount(fastify);
            const nimAccount = !account ? await createNIMAccount(fastify) : account;
            const isEnabled = isAppEnabled(nimAccount);
            const keyValidationStatus: string = apiKeyValidationStatus(nimAccount);
            const accountStatusTimestamp: string = getLastAccountCheckTimestamp(nimAccount);
            reply.send({
              isInstalled: true,
              isEnabled: isEnabled,
              variablesValidationStatus: keyValidationStatus,
              variablesValidationTimestamp: accountStatusTimestamp,
              canInstall: !isEnabled,
              error: '',
            });
          } catch (accountError: any) {
            const message = `Failed to create or retrieve NIM account: ${accountError.response?.body?.message}`;
            fastify.log.error(message);
            reply.status(accountError.response?.statusCode || 500).send(new Error(message));
          }
        } catch (secretError: any) {
          const message = `Failed to create NIM secret. ${secretError.response?.body?.message}`;
          fastify.log.error(message);
          reply.status(secretError.response?.statusCode || 500).send(new Error(message));
        }
      },
    ),
  );

  fastify.delete(
    '/',
    secureAdminRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) =>
      deleteNIMAccount(fastify)
        .then((res) => res)
        .catch((res) => {
          reply.send(res);
        }),
    ),
  );
};
