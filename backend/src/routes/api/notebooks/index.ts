import { KubeFastifyInstance, Notebook } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';
import { getNotebook, getNotebooks, patchNotebook, postNotebook } from './notebookUtils';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get('/:projectName', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as {
      projectName: string;
    };
    const query = request.query as {
      labels: string;
    };

    return await getNotebooks(fastify, params.projectName, query.labels);
  });

  fastify.get(
    '/:projectName/:notebookName',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as {
        projectName: string;
        notebookName: string;
      };
      const query = request.query as {
        labels: string;
      };

      return await getNotebook(fastify, params.projectName, params.notebookName);
    },
  );

  fastify.post('/:projectName', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as {
      projectName: string;
    };
    const notebookData = request.body as Notebook;

    return await postNotebook(fastify, params.projectName, notebookData);
  });

  fastify.delete(
    '/:projectName/:notebookName',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as {
        projectName: string;
        notebookName: string;
      };

      return fastify.kube.customObjectsApi.deleteNamespacedCustomObject(
        'kubeflow.org',
        'v1',
        params.projectName,
        'notebooks',
        params.notebookName,
      );
    },
  );

  fastify.patch(
    '/:projectName/:notebookName',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as {
        projectName: string;
        notebookName: string;
      };
      const requestBody = request.body as { stopped: boolean } | any;

      return await patchNotebook(fastify, requestBody, params.projectName, params.notebookName);
    },
  );
};
