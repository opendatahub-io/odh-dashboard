import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, KubeStatus } from '../../../types';
import { getUserInfo } from '../../../utils/userUtils';
import { createCustomError } from '../../../utils/requestUtils';
import { isUserAdmin, isUserAllowed } from '../../../utils/adminUtils';
import { isImpersonating } from '../../../devFlags';

export const status = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ kube: KubeStatus }> => {
  const kubeContext = fastify.kube.currentContext;
  const { config, currentContext, namespace, currentUser, clusterID, clusterBranding } =
    fastify.kube;
  const currentCluster = config.getCurrentCluster();
  if (currentCluster === null) {
    throw new Error('The current cluster cannot be null');
  }

  const { server } = currentCluster;

  const { userName, userID } = await getUserInfo(fastify, request);
  const isAdmin = await isUserAdmin(fastify, userName, namespace, request);
  const isAllowed = isAdmin ? true : await isUserAllowed(fastify, userName);

  if (!kubeContext && !kubeContext.trim()) {
    const error = createCustomError(
      'failed to get kube status',
      'Unable to determine current login stats. Please make sure you are logged into OpenShift.',
    );
    fastify.log.error(error, 'failed to get status');
    throw error;
  } else {
    const impersonating = isImpersonating();
    const data: KubeStatus = {
      currentContext,
      currentUser,
      namespace,
      userName,
      userID,
      clusterID,
      clusterBranding,
      isAdmin,
      isAllowed,
      serverURL: server,
    };
    if (impersonating) {
      data.isImpersonating = impersonating;
    }
    return {
      kube: data,
    };
  }
};
