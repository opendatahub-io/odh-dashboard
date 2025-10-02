import {
  CustomObjectsApi,
  V1ClusterRoleBinding,
  V1ClusterRoleBindingList,
} from '@kubernetes/client-node';
import { KubeFastifyInstance, ResourceAccessReviewResponse } from '../types';
import { getAllGroupsByUser, getGroup } from './groupsUtils';
import { flatten, uniq } from 'lodash';
import { getNamespaces } from '../utils/notebookUtils';
import { getAuth } from './resourceUtils';
import { BYOIDC_GROUPS_HEADER } from './constants';

const SYSTEM_AUTHENTICATED = 'system:authenticated';
/** Usernames with invalid characters can start with `b64:` to keep their unwanted characters */
export const KUBE_SAFE_PREFIX = 'b64:';

/**
 * Check if user is admin based on BYOIDC groups header
 * @param request FastifyRequest containing headers
 * @returns true if user is admin based on groups in header
 */
export const isUserAdminFromHeaders = (request: any): boolean => {
  const groupsHeader = request.headers[BYOIDC_GROUPS_HEADER] as string;
  
  if (!groupsHeader) {
    return false;
  }

  // Parse pipe-separated groups
  const groups = groupsHeader.split('|').map(group => group.trim());
  
  // Check for admin groups (these are already mapped by kube-rbac-proxy)
  const adminGroups = [
    'cluster-admins',
    'system:admin',
    'cluster-admin',
    'system:masters'
  ];
  
  return groups.some(group => adminGroups.includes(group));
};

const getGroupUserList = async (
  fastify: KubeFastifyInstance,
  groupListNames: string[],
  additionalUsers: string[] = [],
): Promise<string[]> => {
  const customObjectApi = fastify.kube.customObjectsApi;
  return Promise.all(groupListNames.map((group) => getGroup(customObjectApi, group))).then(
    (usersPerGroup: string[][]) => uniq([...flatten(usersPerGroup), ...additionalUsers]),
  );
};

export const getAdminUserList = async (fastify: KubeFastifyInstance): Promise<string[]> => {
  const auth = getAuth();
  return getGroupUserList(fastify, auth.spec.adminGroups);
};

export const getClusterAdminUserList = async (fastify: KubeFastifyInstance): Promise<string[]> => {
  // fetch all the users and groups who have cluster-admin role and put them into the admin user list
  const { workbenchNamespace } = getNamespaces(fastify);
  const clusterAdminUsersAndGroups = await fastify.kube.customObjectsApi
    // This is not actually fetching all the groups who have admin access to the notebook resources
    // But only the cluster admins
    // The "*" in the verb field is more like a placeholder
    .createClusterCustomObject('authorization.openshift.io', 'v1', 'resourceaccessreviews', {
      resource: 'notebooks',
      resourceAPIGroup: 'kubeflow.org',
      resourceAPIVersion: 'v1',
      verb: '*',
      namespace: workbenchNamespace,
    })
    .then((rar) => rar.body as ResourceAccessReviewResponse)
    .catch((e) => {
      fastify.log.error(`Failure to fetch cluster admin users and groups: ${e.response.body}`);
      return { users: [], groups: [] };
    });
  const clusterAdminUsers = clusterAdminUsersAndGroups.users || [];
  const clusterAdminGroups = clusterAdminUsersAndGroups.groups || [];
  const filteredClusterAdminGroups = clusterAdminGroups.filter(
    (group) => !group.startsWith('system:'),
  );
  const filteredClusterAdminUsers = clusterAdminUsers.filter((user) => !user.startsWith('system:'));
  return getGroupUserList(fastify, filteredClusterAdminGroups, filteredClusterAdminUsers);
};

export const getAllowedUserList = async (fastify: KubeFastifyInstance): Promise<string[]> => {
  const auth = getAuth();
  return getGroupUserList(
    fastify,
    auth.spec.allowedGroups.filter((groupName) => groupName && !groupName.startsWith('system:')), // Handle edge-cases and ignore k8s defaults
  );
};

export const getGroupsConfig = async (
  fastify: KubeFastifyInstance,
  customObjectApi: CustomObjectsApi,
  username: string,
): Promise<boolean> => {
  try {
    const auth = getAuth();
    const adminGroupsList: string[] = auth.spec.adminGroups;

    if (adminGroupsList.includes(SYSTEM_AUTHENTICATED)) {
      throw new Error('It is not allowed to set system:authenticated as admin group.');
    } else {
      return await checkUserInGroups(fastify, customObjectApi, adminGroupsList, username);
    }
  } catch (e) {
    fastify.log.error(e, 'Error getting groups config');
    return false;
  }
};

export const isUserAdmin = async (
  fastify: KubeFastifyInstance,
  username: string,
  namespace: string,
  request?: any,
): Promise<boolean> => {
  // Check BYOIDC header-based admin detection first if request is provided
  if (request && request.headers && request.headers[BYOIDC_GROUPS_HEADER]) {
    try {
      const isAdminFromHeaders = isUserAdminFromHeaders(request);
      if (isAdminFromHeaders) {
        fastify.log.debug('User is admin based on BYOIDC groups header');
        return true;
      }
    } catch (e) {
      fastify.log.warn(`BYOIDC header-based admin check failed, falling back to OpenShift API: ${e.message}`);
      // Fall through to OpenShift API fallback
    }
  }

  // Fallback to traditional OpenShift admin detection
  const isAdmin: boolean = await isUserClusterRole(fastify, username, namespace);
  return isAdmin || (await getGroupsConfig(fastify, fastify.kube.customObjectsApi, username));
};

export const isUserAllowed = async (
  fastify: KubeFastifyInstance,
  username: string,
): Promise<boolean> => {
  try {
    const auth = getAuth();
    const allowedGroupsList: string[] = auth.spec.allowedGroups;

    if (allowedGroupsList.includes(SYSTEM_AUTHENTICATED)) {
      return true;
    } else {
      return await checkUserInGroups(
        fastify,
        fastify.kube.customObjectsApi,
        allowedGroupsList,
        username,
      );
    }
  } catch (e) {
    fastify.log.error(e, 'Error determining isUserAllowed.');
    return false;
  }
};

const checkRoleBindings = (
  roleBindings: V1ClusterRoleBindingList,
  username: string,
  groups: string[],
): boolean => {
  return (
    roleBindings.items.filter(
      (role: V1ClusterRoleBinding): boolean =>
        role.subjects?.some(
          (subject) => subject.name === username || groups.includes(subject.name),
        ) &&
        role.roleRef.kind === 'ClusterRole' &&
        role.roleRef.name === 'cluster-admin',
    ).length !== 0
  );
};

export const isUserClusterRole = async (
  fastify: KubeFastifyInstance,
  username: string,
  namespace: string,
): Promise<boolean> => {
  try {
    const clusterrolebinding = await fastify.kube.rbac.listClusterRoleBinding();
    const rolebinding = await fastify.kube.rbac.listNamespacedRoleBinding(namespace);
    const groups = await getAllGroupsByUser(fastify.kube.customObjectsApi, username);
    const isAdminClusterRoleBinding = checkRoleBindings(clusterrolebinding.body, username, groups);
    const isAdminRoleBinding = checkRoleBindings(rolebinding.body, username, groups);
    return isAdminClusterRoleBinding || isAdminRoleBinding;
  } catch (e) {
    fastify.log.error(
      `Failed to list rolebindings for user, ${e.response?.body?.message || e.message}`,
    );
    return false;
  }
};

const checkUserInGroups = async (
  fastify: KubeFastifyInstance,
  customObjectApi: CustomObjectsApi,
  groupList: string[],
  userName: string,
): Promise<boolean> => {
  for (const group of groupList) {
    try {
      const groupUsers = await getGroup(customObjectApi, group);
      if (
        groupUsers?.includes(userName) ||
        groupUsers?.includes(`${KUBE_SAFE_PREFIX}${userName}`)
      ) {
        return true;
      }
    } catch (e) {
      fastify.log.error(e, 'Error checking if user is in group.');
    }
  }
  return false;
};
