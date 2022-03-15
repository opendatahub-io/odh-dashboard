import { KubeFastifyInstance, Notebook, NotebookList } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      labels: string;
    };
    console.log(query);
    const kubeResponse = await fastify.kube.customObjectsApi.listClusterCustomObject(
      'kubeflow.org',
      'v1',
      'notebooks',
      undefined,
      undefined,
      undefined,
      query.labels,
    );
    return kubeResponse.body as NotebookList;
  });
};
