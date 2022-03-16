import { KubeFastifyInstance, Project, ProjectList } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      labels: string;
    };
    console.log(query);
    const kubeResponse = await fastify.kube.customObjectsApi.listClusterCustomObject(
      'project.openshift.io',
      'v1',
      'projects',
      undefined,
      undefined,
      undefined,
      query.labels,
    );
    return kubeResponse.body as ProjectList;
  });

  fastify.get('/:projectName', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as {
      projectName: string;
    };

    const kubeResponse = await fastify.kube.customObjectsApi.getClusterCustomObject(
      'project.openshift.io',
      'v1',
      'projects',
      params.projectName,
    );
    return kubeResponse.body as Project;
  });

  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const kubeResponse = await fastify.kube.customObjectsApi.createClusterCustomObject(
      'project.openshift.io',
      'v1',
      'projects',
      request.body as any,
    );
    return kubeResponse.body as Project;
  });
};
