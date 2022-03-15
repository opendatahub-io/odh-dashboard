import {
  KubeFastifyInstance,
  Notebook,
  NotebookList,
  Project,
  ProjectList,
  Route,
} from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      labels: string;
    };

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
    const createProjectResponse = await fastify.kube.customObjectsApi.createClusterCustomObject(
      'project.openshift.io',
      'v1',
      'projects',
      request.body as Project,
    );
    const project = createProjectResponse.body as Project;
    const projectName = project.metadata.name;
    const user = project.metadata?.labels?.['opendatahub.io/user'];

    await fastify.kube.rbacAuthorizationV1Api.createNamespacedRoleBinding(projectName, {
      metadata: {
        name: 'admin',
        labels: {
          'opendatahub.io/odh-managed': 'true',
        },
      },
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: 'admin',
      },
      subjects: [
        {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'User',
          name: user,
        },
      ],
    });

    return createProjectResponse.body as Project;
  });

  fastify.delete('/:projectName', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as {
      projectName: string;
    };

    return fastify.kube.customObjectsApi.deleteClusterCustomObject(
      'project.openshift.io',
      'v1',
      'projects',
      params.projectName,
    );
  });

  fastify.get('/:projectName/notebooks', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as {
      projectName: string;
    };
    const query = request.query as {
      labels: string;
    };

    const kubeResponse = await fastify.kube.customObjectsApi.listNamespacedCustomObject(
      'kubeflow.org',
      'v1',
      params.projectName,
      'notebooks',
      undefined,
      undefined,
      undefined,
      query.labels,
    );
    return kubeResponse.body as NotebookList;
  });

  fastify.get(
    '/:projectName/notebooks/:notebookName',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as {
        projectName: string;
        notebookName: string;
      };
      const query = request.query as {
        labels: string;
      };

      const kubeResponse = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
        'kubeflow.org',
        'v1',
        params.projectName,
        'notebooks',
        params.notebookName,
      );
      return kubeResponse.body as Notebook;
    },
  );

  fastify.post('/:projectName/notebooks', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as {
      projectName: string;
    };
    const query = request.query as {
      labels: string;
    };
    const body = request.body as Notebook;
    const notebookName = body?.metadata?.name;

    const createRouteResponse = await fastify.kube.customObjectsApi.createNamespacedCustomObject(
      'route.openshift.io',
      'v1',
      params.projectName,
      'routes',
      {
        metadata: {
          name: notebookName,
        },
        spec: {
          to: {
            kind: 'Service',
            name: notebookName,
            weight: 100,
          },
          port: {
            targetPort: `http-${notebookName}`,
          },
          tls: {
            termination: 'edge',
            insecureEdgeTerminationPolicy: 'Redirect',
          },
          wildcardPolicy: 'None',
        },
      },
    );

    const route = createRouteResponse.body as Route;

    const notebookData = request.body as Notebook;
    if (!notebookData?.metadata?.annotations) {
      notebookData.metadata.annotations = {};
    }
    notebookData.metadata.annotations['opendatahub.io/link'] = `https://${route.spec.host}`;

    const createNotebookResponse = await fastify.kube.customObjectsApi.createNamespacedCustomObject(
      'kubeflow.org',
      'v1',
      params.projectName,
      'notebooks',
      notebookData,
    );

    return createNotebookResponse.body as Notebook;
  });

  fastify.delete(
    '/:projectName/notebooks/:notebookName',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as {
        projectName: string;
        notebookName: string;
      };

      try {
        await fastify.kube.customObjectsApi.deleteNamespacedCustomObject(
          'route.openshift.io',
          'v1',
          params.projectName,
          'routes',
          params.notebookName,
        );
      } catch (e) {
        if (e.response?.statusCode !== 404) {
          fastify.log.error(
            `Unable to delete notebook route ${params.notebookName}: ${e.toString()}`,
          );
        }
      }

      return fastify.kube.customObjectsApi.deleteNamespacedCustomObject(
        'kubeflow.org',
        'v1',
        params.projectName,
        'notebooks',
        params.notebookName,
      );
    },
  );
};
