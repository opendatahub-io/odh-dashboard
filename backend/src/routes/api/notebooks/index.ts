import { KubeFastifyInstance, Notebook } from '../../../types';
import { FastifyRequest } from 'fastify';
import {
  deleteNotebook,
  getNotebook,
  getNotebooks,
  patchNotebook,
  postNotebook,
} from './notebookUtils';

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
      return postNotebook(fastify, request);
    },
  );

  fastify.delete(
    '/:projectName/:notebookName',
    async (
      request: FastifyRequest<{
        Params: {
          projectName: string;
          notebookName: string;
        };
      }>,
    ) => {
      return deleteNotebook(fastify, request);
    },
  );

  fastify.patch('/:projectName/:notebookName', async (request: FastifyRequest) => {
    const params = request.params as {
      projectName: string;
      notebookName: string;
    };
    const requestBody = request.body as { stopped: boolean } | any;

    return await patchNotebook(fastify, requestBody, params.projectName, params.notebookName);
  });
};
