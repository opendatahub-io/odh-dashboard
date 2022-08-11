import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, KubeStatus } from '../../../types';
import { CustomObjectsApi } from '@kubernetes/client-node';
import { getUserName } from '../../../utils/userUtils';
import { createCustomError } from '../../../utils/requestUtils';
import { getDashboardConfig } from '../../../utils/resourceUtils';

type groupObjResponse = {
  users: string[] | null;
};

const ADMIN_GROUP = 'adminGroups';
const ALLOWED_GROUP = 'allowedGroups';

const getUserList = async (fastify: KubeFastifyInstance, groupName: string): Promise<string[]> => {
  let userList: string[] = [];

  if (groupName) {
    try {
      const dashCR = getDashboardConfig().spec;
      if (groupName === 'adminGroups' || groupName === 'allowedGroups') {
        const userGroup = dashCR.groupsConfig?.[groupName];
        userList = await getGroup(fastify.kube.customObjectsApi, userGroup);
      }
    } catch (e) {
      fastify.log.error(e.toString());
    }

    return userList || [];
  }
};

const groupIncludes = (userName: string, groupUsers: string[]) => {
  // Usernames with invalid characters can start with `b64:` to keep their unwanted characters
  return groupUsers.includes(userName) || groupUsers.includes(`b64:${userName}`);
};

export const status = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ kube: KubeStatus }> => {
  const kubeContext = fastify.kube.currentContext;
  const { currentContext, namespace, currentUser, clusterID, clusterBranding } = fastify.kube;
  const customObjectsApi = fastify.kube.customObjectsApi;

  const userName = await getUserName(fastify, request, customObjectsApi);
  const adminUsers = await getUserList(fastify, ADMIN_GROUP);
  const isAdmin = groupIncludes(userName, adminUsers);
  let isAllowed = false;
  if (isAdmin) {
    isAllowed = true;
  } else {
    isAllowed = groupIncludes(userName, await getUserList(fastify, ALLOWED_GROUP));
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

export const mapUserPrivilege = async (
  fastify: KubeFastifyInstance,
  users: string[],
): Promise<{ [username: string]: 'User' | 'Admin' }> => {
  const adminUsers = await getUserList(fastify, ADMIN_GROUP);
  return users.reduce((acc, username) => {
    return { ...acc, [username]: groupIncludes(username, adminUsers) ? 'Admin' : 'User' };
  }, {});
};
