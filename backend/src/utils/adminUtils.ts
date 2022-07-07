import {
  CustomObjectsApi,
  V1ClusterRoleBinding,
  V1ClusterRoleBindingList,
} from '@kubernetes/client-node';
import { KubeFastifyInstance } from '../types';
import { getAdminGroups, getAllowedGroups, getGroup } from './groupsUtils';

const SYSTEM_AUTHENTICATED = 'system:authenticated';

export const getGroupsConfig = async (
  fastify: KubeFastifyInstance,
  customObjectApi: CustomObjectsApi,
  username: string,
): Promise<boolean> => {
  try {
    const adminGroups = getAdminGroups();
    const adminGroupsList = adminGroups.split(',');

    if (adminGroupsList.includes(SYSTEM_AUTHENTICATED)) {
      throw new Error('It is not allowed to set system:authenticated as admin group.');
    } else {
      return await checkUserInGroups(fastify, customObjectApi, adminGroupsList, username);
    }
  } catch (e) {
    fastify.log.error(e.toString());
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
    const allowedGroups = getAllowedGroups();
    const allowedGroupsList = allowedGroups.split(',');
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
    fastify.log.error(e.toString());
    return false;
  }
};

const checkRoleBindings = (roleBindings: V1ClusterRoleBindingList, username: string): boolean => {
  return (
    roleBindings.items.filter(
      (role: V1ClusterRoleBinding): boolean =>
        role.subjects?.some((subject) => subject.name === username) &&
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
    console.log(clusterrolebinding);
    console.log(rolebinding);
    const isAdminClusterRoleBinding = checkRoleBindings(clusterrolebinding.body, username);
    const isAdminRoleBinding = checkRoleBindings(rolebinding.body, username);
    return isAdminClusterRoleBinding || isAdminRoleBinding;
  } catch (e) {
    fastify.log.error(`Failed to list rolebindings for user, ${e}`);
    return false;
  }
};

const checkUserInGroups = async (
  fastify: KubeFastifyInstance,
  customObjectApi: CustomObjectsApi,
  groupList: string[],
  userName: string,
): Promise<boolean> => {
  try {
    for (const group of groupList) {
      const groupUsers = await getGroup(customObjectApi, group);
      // Usernames with invalid characters can start with `b64:` to keep their unwanted characters
      if (groupUsers?.includes(userName) || groupUsers?.includes(`b64:${userName}`)) {
        return true;
      }
    }
  } catch (e) {
    fastify.log.error(e.toString());
  }
  return false;
};

const checkUserRetrievedGroups = async (
  fastify: KubeFastifyInstance,
  groupList: string[],
  username: string,
): Promise<boolean> => {
  try {
    if (groupList?.includes(username) || groupList?.includes(`b64:${username}`)) {
      return true;
    }
  } catch (e) {
    fastify.log.error(e.toString());
  }
  return false;
};

export const mapUserRoles = async (
  fastify: KubeFastifyInstance,
  customObjectApi: CustomObjectsApi,
  groupList: string[],
  users: string[],
): Promise<{ [username: string]: 'User' | 'Admin' }> => {
  try {
    const listGroup = await Promise.all(groupList.map((group) => getGroup(customObjectApi, group)));
    const listGroupFlattened = listGroup.reduce((acc, value) => acc.concat(value), []);
    return users.reduce((acc, username) => {
      return {
        ...acc,
        [username]: checkUserRetrievedGroups(fastify, listGroupFlattened, username)
          ? 'Admin'
          : 'User',
      };
    }, {});
  } catch (e) {
    fastify.log.error(e.toString());
  }
  return {};
};
