import { V1ResourceAttributes, V1SelfSubjectAccessReview } from '@kubernetes/client-node';
import {
  K8sStatus,
  KubeFastifyInstance,
  OauthFastifyRequest,
  ResourceAccessReviewResponse,
} from '../types';
import { getGroup } from './groupsUtils';
import { flatten, uniq } from 'lodash';
import { getNamespaces } from '../utils/notebookUtils';
import { getAuth } from './resourceUtils';
import { isK8sStatus } from './pass-through';
import { createSelfSubjectAccessReview } from './authUtils';

/** Usernames with invalid characters can start with `b64:` to keep their unwanted characters */
export const KUBE_SAFE_PREFIX = 'b64:';

/** @deprecated -- don't rely on groups (legacy usage only) */
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

/** @deprecated -- don't rely on groups (legacy usage only) */
export const getAdminUserList = async (fastify: KubeFastifyInstance): Promise<string[]> => {
  const auth = getAuth();
  return getGroupUserList(fastify, auth.spec.adminGroups);
};

/** @deprecated -- don't rely on groups (legacy usage only) */
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

/** @deprecated -- don't rely on groups (legacy usage only) */
export const getAllowedUserList = async (fastify: KubeFastifyInstance): Promise<string[]> => {
  const auth = getAuth();
  return getGroupUserList(
    fastify,
    auth.spec.allowedGroups.filter((groupName) => groupName && !groupName.startsWith('system:')), // Handle edge-cases and ignore k8s defaults
  );
};

const SingletonAuthResource: V1ResourceAttributes = {
  group: 'services.platform.opendatahub.io',
  resource: 'auths',
  name: 'default-auth',
};

const handleSSARCheck =
  (fastify) =>
  (v: V1SelfSubjectAccessReview | K8sStatus): boolean => {
    fastify.log.info(`>>>>>>> ${JSON.stringify(v)}`);

    return isK8sStatus(v) ? false : v.status.allowed;
  };

export const isUserAdmin = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
): Promise<boolean> =>
  createSelfSubjectAccessReview(fastify, request, {
    ...SingletonAuthResource,
    verb: 'patch',
  })
    .then(handleSSARCheck(fastify))
    .catch(() => false);

export const isUserAllowed = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
): Promise<boolean> =>
  createSelfSubjectAccessReview(fastify, request, {
    ...SingletonAuthResource,
    verb: 'get',
  })
    .then(handleSSARCheck(fastify))
    .catch(() => false);
