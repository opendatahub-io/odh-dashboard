import { KubeFastifyInstance, Notebook } from '../../../types';
import { FastifyRequest } from 'fastify';
import { getNotebook, patchNotebook, createNotebook, getNotebookStatus } from './notebookUtils';
import { RecursivePartial } from '../../../typeHelpers';
import { sanitizeNotebookForSecurity, secureRoute } from '../../../utils/route-security';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/:namespace/:name',
    secureRoute(fastify)(
      async (request: FastifyRequest<{ Params: { namespace: string; name: string } }>) => {
        const { namespace, name } = request.params;
        return await getNotebook(fastify, namespace, name);
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
      ) => {
        const { namespace, name } = request.params;

        const notebook = await getNotebook(fastify, namespace, name);
        const hasStopAnnotation = !!notebook?.metadata.annotations?.['kubeflow-resource-stopped'];
        const isRunning = hasStopAnnotation
          ? false
          : await getNotebookStatus(fastify, namespace, name);

        return { notebook, isRunning };
      },
    ),
  );

  fastify.post(
    '/:namespace',
    secureRoute(fastify)(
      async (
        request: FastifyRequest<{
          Params: {
            namespace: string;
          };
          Body: Notebook;
        }>,
      ) => {
        return createNotebook(fastify, request);
      },
    ),
  );

  fastify.patch(
    '/:namespace/:name',
    secureRoute(fastify)(
      async (
        request: FastifyRequest<{
          Body: RecursivePartial<Notebook>;
          Params: {
            namespace: string;
            name: string;
          };
        }>,
      ) => {
        const { namespace, name } = request.params;
        const data = await sanitizeNotebookForSecurity(fastify, request, request.body);

        return await patchNotebook(fastify, data, namespace, name);
      },
    ),
  );
};
