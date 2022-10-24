import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, KubeStatus } from '../../../types';
import { getUserName } from '../../../utils/userUtils';
import { createCustomError } from '../../../utils/requestUtils';
import { isUserAdmin, isUserAllowed } from '../../../utils/adminUtils';

export const status = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ kube: KubeStatus }> => {
  const kubeContext = fastify.kube.currentContext;
  const { currentContext, namespace, currentUser, clusterID, clusterBranding, saToken } =
    fastify.kube;

  const userName = await getUserName(fastify, request);
  const isAdmin = await isUserAdmin(fastify, userName, namespace);
  const isAllowed = isAdmin ? true : await isUserAllowed(fastify, userName);

  if (!kubeContext && !kubeContext.trim()) {
    const error = createCustomError(
      'failed to get kube status',
      'Unable to determine current login stats. Please make sure you are logged into OpenShift.',
    );
    fastify.log.error(error, 'failed to get status');
    throw error;
  } else {
    return {
      kube: {
        currentContext,
        currentUser,
        namespace,
        userName,
        clusterID,
        clusterBranding,
        isAdmin,
        isAllowed,
        saToken,
      },
    };
  }
};
