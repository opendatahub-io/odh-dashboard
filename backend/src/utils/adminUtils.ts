import {
  CustomObjectsApi,
  V1ClusterRoleBinding,
  V1ClusterRoleBindingList,
} from '@kubernetes/client-node';
import { KubeFastifyInstance, ResourceAccessReviewResponse } from '../types';
import { getAdminGroups, getAllGroupsByUser, getAllowedGroups, getGroup } from './groupsUtils';
import { flatten, uniq } from 'lodash';
import { getNamespaces } from '../utils/notebookUtils';
import { getAuth } from './resourceUtils';

const SYSTEM_AUTHENTICATED = 'system:authenticated';
/** Usernames with invalid characters can start with `b64:` to keep their unwanted characters */
export const KUBE_SAFE_PREFIX = 'b64:';

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
  if (auth) {
    return getGroupUserList(fastify, auth.spec.adminGroups);
  }

  // FIXME: see RHOAIENG-16988
  const adminGroups = getAdminGroups();
  const adminGroupsList = adminGroups
    .split(',')
    .filter((groupName) => groupName && !groupName.startsWith('system:')); // Handle edge-cases and ignore k8s defaults

  return getGroupUserList(fastify, adminGroupsList);
};

export const getClusterAdminUserList = async (fastify: KubeFastifyInstance): Promise<string[]> => {
  // fetch all the users and groups who have cluster-admin role and put them into the admin user list
  const { notebookNamespace } = getNamespaces(fastify);
  const clusterAdminUsersAndGroups = await fastify.kube.customObjectsApi
    // This is not actually fetching all the groups who have admin access to the notebook resources
    // But only the cluster admins
    // The "*" in the verb field is more like a placeholder
    .createClusterCustomObject('authorization.openshift.io', 'v1', 'resourceaccessreviews', {
      resource: 'notebooks',
      resourceAPIGroup: 'kubeflow.org',
      resourceAPIVersion: 'v1',
      verb: '*',
      namespace: notebookNamespace,
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
  if (auth) {
    return getGroupUserList(fastify, auth.spec.allowedGroups);
  }

  // FIXME: see RHOAIENG-16988
  const allowedGroups = getAllowedGroups();
  const allowedGroupList = allowedGroups
    .split(',')
    .filter((groupName) => groupName && !groupName.startsWith('system:')); // Handle edge-cases and ignore k8s defaults
  return getGroupUserList(fastify, allowedGroupList);
};

export const getGroupsConfig = async (
  fastify: KubeFastifyInstance,
  customObjectApi: CustomObjectsApi,
  username: string,
): Promise<boolean> => {
  try {
    const auth = getAuth();

    let adminGroupsList: string[];
    if (auth) {
      adminGroupsList = auth.spec.adminGroups;
    } else {
      // FIXME: see RHOAIENG-16988
      const adminGroups = getAdminGroups();
      adminGroupsList = adminGroups.split(',');
    }

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
): Promise<boolean> => {
  const isAdmin: boolean = await isUserClusterRole(fastify, username, namespace);
  return isAdmin || (await getGroupsConfig(fastify, fastify.kube.customObjectsApi, username));
};

export const isUserAllowed = async (
  fastify: KubeFastifyInstance,
  username: string,
): Promise<boolean> => {
  try {
    const auth = getAuth();

    let allowedGroupsList: string[];
    if (auth) {
      allowedGroupsList = auth.spec.allowedGroups;
    } else {
      // FIXME: see RHOAIENG-16988
      const allowedGroups = getAllowedGroups();
      allowedGroupsList = allowedGroups.split(',');
    }

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
