import { KubeFastifyInstance, NotebookData, NotebookState } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';
import { getNotebookStatus, enableNotebook } from './utils';
import { secureRoute } from '../../../utils/route-security';
import { stopNotebook, getNotebook } from '../../../utils/notebookUtils';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/:namespace/:name',
    secureRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
        reply: FastifyReply,
      ) => {
        const { namespace, name } = request.params;
        return getNotebook(fastify, namespace, name).catch((e) => {
          if (e.statusCode !== 404) {
            fastify.log.error(
              `Failed get notebook status, ${e.response?.body?.message || e.message}}`,
            );
          }
          reply.status(404).send(e.response?.body?.message || e.message);
        });
      },
    ),
  );

  fastify.get(
    '/:namespace/:name/status',
    secureRoute(fastify)(
      async (
        request: FastifyRequest<{
          Params: { namespace: string; name: string };
        }>,
        reply: FastifyReply,
      ) => {
        const { namespace, name } = request.params;

        return getNotebookStatus(fastify, namespace, name).catch((e) => {
          if (e.statusCode !== 404) {
            fastify.log.error(
              `Failed get notebook status, ${e.response?.body?.message || e.message}}`,
            );
          }
          reply.status(404).send(e.response?.body?.message || e.message);
        });
      },
    ),
  );

  fastify.post(
    '/',
    secureRoute(fastify)(
      async (
        request: FastifyRequest<{
          Body: NotebookData;
        }>,
        reply: FastifyReply,
      ) => {
        if (request.body.state !== NotebookState.Started) {
          reply.status(400).send('Failed to start the Notebook');
        }

        return enableNotebook(fastify, request).catch((e) => {
          fastify.log.error(`${e.response?.body?.message || e.message}}`);
          reply.status(400).send(e.response?.body?.message || e.message);
        });
      },
    ),
  );

  fastify.patch(
    '/',
    secureRoute(fastify)(
      async (
        request: FastifyRequest<{
          Body: NotebookData;
        }>,
        reply: FastifyReply,
      ) => {
        if (request.body.state !== NotebookState.Stopped) {
          reply.status(400).send('Failed to stop the Notebook');
        }

        return stopNotebook(fastify, request).catch((e) => {
          fastify.log.error(
            `Failed to delete notebook, ${e.response?.body?.message || e.message}}`,
          );
          reply.status(400).send(e.response?.body?.message || e.message);
        });
      },
    ),
  );
};
