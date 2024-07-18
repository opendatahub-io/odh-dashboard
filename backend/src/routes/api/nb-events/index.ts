import { FastifyRequest } from 'fastify';
import { secureRoute } from '../../../utils/route-security';
import { KubeFastifyInstance } from '../../../types';
import { checkUserNotebookPermissions, getNotebookEvents } from './eventUtils';
import { createCustomError } from '../../../utils/requestUtils';
import { isK8sStatus } from '../k8s/pass-through';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  const routeHandler = secureRoute(fastify)(
    async (
      request: FastifyRequest<{
        Params: {
          namespace: string;
          notebookName: string;
          podUID: string | undefined;
        };
      }>,
    ) => {
      const { namespace, notebookName, podUID } = request.params;
      const selfSubjectAccessReview = await checkUserNotebookPermissions(
        fastify,
        request,
        notebookName,
        namespace,
      );
      if (isK8sStatus(selfSubjectAccessReview)) {
        throw createCustomError(
          selfSubjectAccessReview.reason,
          selfSubjectAccessReview.message,
          selfSubjectAccessReview.code,
        );
      }
      if (selfSubjectAccessReview.status.allowed === true) {
        return getNotebookEvents(fastify, namespace, notebookName, podUID);
      }
      throw createCustomError(
        '404 Referenced pod not found for the notebook',
        'Referenced pod not found for the notebook',
        404,
      );
    },
  );

  fastify.get('/:namespace/:notebookName', routeHandler);
  fastify.get('/:namespace/:notebookName/:podUID', routeHandler);
};
