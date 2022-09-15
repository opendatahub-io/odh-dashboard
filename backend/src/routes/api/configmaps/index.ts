import { FastifyRequest } from 'fastify';
import { V1ConfigMap } from '@kubernetes/client-node';
import { KubeFastifyInstance } from '../../../types';
import { secureRoute } from '../../../utils/route-security';
import { createCustomError } from '../../../utils/requestUtils';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/:namespace/:name',
    secureRoute(fastify)(
      async (request: FastifyRequest<{ Params: { namespace: string; name: string } }>) => {
        const cmName = request.params.name;
        const cmNamespace = request.params.namespace;
        return fastify.kube.coreV1Api
          .readNamespacedConfigMap(cmName, cmNamespace)
          .then((res) => res.body)
          .catch((res) => {
            const e = res.response.body;
            const error = createCustomError(
              `ConfigMap could not be read`,
              e.message || res.message,
              e.code,
            );
            fastify.log.error(`Configmap ${cmName} could not be read, ${error}`);
            throw error;
          });
      },
    ),
  );

  fastify.post(
    '/',
    secureRoute(fastify)(async (request: FastifyRequest<{ Body: V1ConfigMap }>) => {
      const cmRequest = request.body;
      return fastify.kube.coreV1Api
        .createNamespacedConfigMap(cmRequest.metadata.namespace, cmRequest)
        .then((res) => res.body)
        .catch((res) => {
          const e = res.response.body;
          const error = createCustomError(
            `ConfigMap could not be created`,
            e.message || res.message,
            e.code,
          );
          fastify.log.error(`Configmap ${cmRequest.metadata.name} could not be created, ${error}`);
          throw error;
        });
    }),
  );

  fastify.put(
    '/',
    secureRoute(fastify)(async (request: FastifyRequest<{ Body: V1ConfigMap }>) => {
      const cmRequest = request.body;
      return fastify.kube.coreV1Api
        .replaceNamespacedConfigMap(
          cmRequest.metadata.name,
          cmRequest.metadata.namespace,
          cmRequest,
        )
        .then((res) => res.body)
        .catch((res) => {
          const e = res.response.body;
          const error = createCustomError(
            `ConfigMap could not be updated`,
            e.message || res.message,
            e.code,
          );
          fastify.log.error(`Configmap ${cmRequest.metadata.name} could not be updated, ${error}`);
          throw error;
        });
    }),
  );

  fastify.delete(
    '/:namespace/:name',
    secureRoute(fastify)(
      async (request: FastifyRequest<{ Params: { namespace: string; name: string } }>) => {
        const cmName = request.params.name;
        const cmNamespace = request.params.namespace;
        return fastify.kube.coreV1Api
          .deleteNamespacedConfigMap(cmName, cmNamespace)
          .then((res) => res.body)
          .catch((res) => {
            const e = res.response.body;
            const error = createCustomError(
              `ConfigMap could not be deleted`,
              e.message || res.message,
              e.code,
            );
            fastify.log.error(`Configmap ${cmName} could not be deleted, ${error}`);
            throw error;
          });
      },
    ),
  );
};
