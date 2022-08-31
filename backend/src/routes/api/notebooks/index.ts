import { KubeFastifyInstance, Notebook } from '../../../types';
import { FastifyRequest } from 'fastify';
import { getNotebook, getNotebooks, createNotebook, getNotebookStatus } from './notebookUtils';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get('/:projectName', async (request: FastifyRequest) => {
    const params = request.params as {
      projectName: string;
    };
    const query = request.query as {
      labels: string;
    };

    return await getNotebooks(fastify, params.projectName, query.labels);
  });

  fastify.get('/:projectName/:notebookName', async (request: FastifyRequest) => {
    const params = request.params as {
      projectName: string;
      notebookName: string;
    };

    return await getNotebook(fastify, params.projectName, params.notebookName);
  });

  fastify.get(
    '/:projectName/:notebookName/status',
    async (
      request: FastifyRequest<{
        Params: {
          projectName: string;
          notebookName: string;
        };
      }>,
    ) => {
      const { projectName, notebookName } = request.params;

      const notebook = await getNotebook(fastify, projectName, notebookName);
      const hasStopAnnotation = !!notebook?.metadata.annotations?.['kubeflow-resource-stopped'];
      const isRunning = hasStopAnnotation
        ? false
        : await getNotebookStatus(fastify, projectName, notebookName);

      return { notebook, isRunning };
    },
  );

  fastify.post(
    '/:projectName',
    async (
      request: FastifyRequest<{
        Params: {
          projectName: string;
        };
        Body: Notebook;
      }>,
    ) => {
      return createNotebook(fastify, request);
    },
  );
};
