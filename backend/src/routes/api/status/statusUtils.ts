import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, KubeStatus } from '../../../types';
import createError from 'http-errors';
import { CustomObjectsApi, RbacAuthorizationV1Api } from '@kubernetes/client-node';
import {
  getGroupsConfigMapName,
  getAdminGroups,
  getGroup,
  MissingGroupError,
} from '../../../utils/groupsUtils';

const SYSTEM_AUTHENTICATED = 'system:authenticated';
const DEFAULT_USERNAME = 'kube:admin';

export const status = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ kube: KubeStatus }> => {
  const kubeContext = fastify.kube.currentContext;
  const { currentContext, namespace, currentUser, clusterID, clusterBranding } = fastify.kube;
  const currentUserName =
    (request.headers['x-forwarded-user'] as string) || currentUser.username || currentUser.name;
  let userName = currentUserName?.split('/')[0];
  if (!userName || userName === 'inClusterUser') {
    userName = DEFAULT_USERNAME;
  }
  const customObjectsApi = fastify.kube.customObjectsApi;
  const coreV1Api = fastify.kube.coreV1Api;
  const rbacAuthorizationApi = fastify.kube.rbac;

  let isAdmin = false;
  let adminGroupsList: string[] = [];

  try {
    const groupConfig = await getGroupsConfigMapName(coreV1Api, namespace);
    const adminGroups = await getAdminGroups(coreV1Api, namespace, groupConfig);

    adminGroupsList = adminGroups.split(',');

    if (adminGroupsList.includes(SYSTEM_AUTHENTICATED)) {
      throw new Error('It is not allowed to set system:authenticated or as admin group.');
    } else if (adminGroups === '') {
      fastify.log.error(
        'Error, there is no group assigned for admins, getting Namespaced Admin or Cluster Admin as default admin.',
      );
      isAdmin = await isUserAdmin(rbacAuthorizationApi, userName, namespace);
    } else {
      isAdmin = await checkUserInGroups(
        fastify,
        customObjectsApi,
        rbacAuthorizationApi,
        adminGroupsList,
        userName,
        namespace,
      );
    }
  } catch (e) {
    fastify.log.error(e.toString());
  }

  if (!kubeContext && !kubeContext.trim()) {
    const error = createCustomError();
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
      },
    };
  }
};

export const checkUserInGroups = async (
  fastify: KubeFastifyInstance,
  customObjectApi: CustomObjectsApi,
  rbacAuthorizationApi: RbacAuthorizationV1Api,
  adminGroupsList: string[],
  userName: string,
  namespace: string,
): Promise<boolean> => {
  let isAdmin = false;
  try {
    for (const group of adminGroupsList) {
      const adminUsers = await getGroup(customObjectApi, group);
      if (adminUsers?.includes(userName)) {
        isAdmin = true;
      }
    }
  } catch (e) {
    if (e instanceof MissingGroupError && adminGroupsList.length === 1) {
      isAdmin = await isUserAdmin(rbacAuthorizationApi, userName, namespace);
      fastify.log.error(
        e.toString() +
          ' Getting Namespaced Admin or Cluster Admin as default admin since it was the only group.',
      );
    } else {
      fastify.log.error(e.toString());
    }
  }
  return isAdmin;
};

export const isUserAdmin = async (
  rbacAuthorizationApi: RbacAuthorizationV1Api,
  username: string,
  namespace: string,
): Promise<boolean> => {
  try {
    const rolebindings = await rbacAuthorizationApi.listNamespacedRoleBinding(namespace);
    const clusterrolebinding = await rbacAuthorizationApi.listClusterRoleBinding();
    const isClusterAdmin =
      clusterrolebinding.body.items
        .filter((role) => role.subjects?.some((subject) => subject.name === username))
        .map((element) => element.roleRef.name).length !== 0;
    const isAdmin =
      rolebindings.body.items
        .filter((role) => role.subjects?.some((subject) => subject.name === username))
        .map((element) => element.roleRef.name).length !== 0;

    return isClusterAdmin || isAdmin;
  } catch (e) {
    throw new Error(`Failed to list rolebindings for user`);
  }
};

export const createCustomError = (): createError.HttpError<500> => {
  const error = createError(500, 'failed to get kube status');
  error.explicitInternalServerError = true;
  error.error = 'failed to get kube status';
  error.message =
    'Unable to determine current login stats. Please make sure you are logged into OpenShift.';
  return error;
};
