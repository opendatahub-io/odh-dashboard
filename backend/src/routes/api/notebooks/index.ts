import { KubeFastifyInstance, Notebook } from '../../../types';
import { FastifyRequest } from 'fastify';
import {
  getNotebook,
  patchNotebook,
  createNotebook,
  getNotebookStatus,
  getRoute,
  patchNotebookRoute,
} from './notebookUtils';
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

        const notebookName = notebook?.metadata.name;
        let newNotebook: Notebook;
        if (isRunning && !notebook?.metadata.annotations?.['opendatahub.io/link']) {
          const route = await getRoute(fastify, namespace, notebookName).catch((e) => {
            fastify.log.warn(`Failed getting route ${notebookName}: ${e.message}`);
            return undefined;
          });
          if (route) {
            newNotebook = await patchNotebookRoute(fastify, route, namespace, notebookName).catch(
              (e) => {
                fastify.log.warn(`Failed patching route to notebook ${notebookName}: ${e.message}`);
                return notebook;
              },
            );
          }
        }

        return { notebook: newNotebook || notebook, isRunning };
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
        reply,
      ) => {
        const { namespace, name } = request.params;
        const data = await sanitizeNotebookForSecurity(fastify, request, request.body);

        return patchNotebook(fastify, data, namespace, name).catch((e) => {
          fastify.log.error(`Failed to patch notebook, ${e.response?.data?.message || e.message}}`);
          reply.status(400).send(e.response?.data?.message || e.message);
        });
      },
    ),
  );
};
