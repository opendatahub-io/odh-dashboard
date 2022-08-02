import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, KubeStatus } from '../../../types';
import { CustomObjectsApi } from '@kubernetes/client-node';
import { getUserName } from '../../../utils/userUtils';
import { createCustomError } from '../../../utils/requestUtils';
import { getDashboardConfig } from '../../../utils/resourceUtils';

type groupObjResponse = {
  users: string[] | null;
};

const SYSTEM_AUTHENTICATED = 'system:authenticated';

export const status = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ kube: KubeStatus }> => {
  const kubeContext = fastify.kube.currentContext;
  const { currentContext, namespace, currentUser, clusterID, clusterBranding } = fastify.kube;
  const customObjectsApi = fastify.kube.customObjectsApi;
  let isAdmin = false;
  let isAllowed = false;

  const userName = await getUserName(fastify, request, customObjectsApi);

  try {
    const dashCR = getDashboardConfig().spec;
    const adminGroup = dashCR.groupsConfig.adminGroups;
    const allowedGroup = dashCR.groupsConfig.allowedGroups;

    if (adminGroup === SYSTEM_AUTHENTICATED || adminGroup === '') {
      throw new Error(
        'It is not allowed to set system:authenticated or an empty string as admin group.',
      );
    } else {
      const adminUsers = await getGroup(customObjectsApi, adminGroup);
      isAdmin = adminUsers?.includes(userName) ?? false;
    }

    if (allowedGroup === '') {
      throw new Error('It is not allowed to set an empty string as allowed group.');
    } else {
      const allowedUsers = await getGroup(customObjectsApi, allowedGroup);
      isAllowed = allowedUsers?.includes(userName) ?? false;
    }
  } catch (e) {
    fastify.log.error(e.toString());
  }

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
      },
    };
  }
};

export const getGroup = async (
  customObjectsApi: CustomObjectsApi,
  adminGroup: string,
): Promise<string[]> => {
  try {
    const adminGroupResponse = await customObjectsApi.getClusterCustomObject(
      'user.openshift.io',
      'v1',
      'groups',
      adminGroup,
    );
    return (adminGroupResponse.body as groupObjResponse).users;
  } catch (e) {
    throw new Error(`Failed to retrieve Group ${adminGroup}, might not exist.`);
  }
};
