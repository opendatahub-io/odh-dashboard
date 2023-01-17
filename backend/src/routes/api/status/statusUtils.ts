import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, KubeStatus } from '../../../types';
import { getUserName } from '../../../utils/userUtils';
import { createCustomError } from '../../../utils/requestUtils';
import { isUserAdmin, isUserAllowed } from '../../../utils/adminUtils';
import { DEV_MODE } from '../../../utils/constants';
import { isImpersonating } from '../../../devFlags';

export const status = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ kube: KubeStatus }> => {
  const kubeContext = fastify.kube.currentContext;
  const { config, currentContext, namespace, currentUser, clusterID, clusterBranding } =
    fastify.kube;
  const { server } = config.getCurrentCluster();

  const userName = await getUserName(fastify, request);
  const isAdmin = await isUserAdmin(fastify, userName, namespace);
  const isAllowed = isAdmin ? true : await isUserAllowed(fastify, userName);
  const impersonating = DEV_MODE ? isImpersonating() : undefined;

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
        serverURL: server,
        isImpersonating: impersonating,
      },
    };
  }
};
