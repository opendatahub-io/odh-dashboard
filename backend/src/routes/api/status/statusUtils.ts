import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, KubeStatus } from '../../../types';
import createError from 'http-errors';
import { CoreV1Api, CustomObjectsApi } from '@kubernetes/client-node';

type groupObjResponse = {
  users: string[] | null;
};

const SYSTEM_AUTHENTICATED = 'system:authenticated';
const GROUPS_CONFIGMAP_NAME = 'groups-config';
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
  let isAdmin = false;

  try {
    const groupConfig = await getGroupsConfig(coreV1Api, namespace);
    const adminGroup = await getGroupsAdminConfig(coreV1Api, namespace, groupConfig);

    if (adminGroup === SYSTEM_AUTHENTICATED || adminGroup === '') {
      throw new Error(
        'It is not allowed to set "system:authenticated" or an empty string as admin group.',
      );
    } else {
      const adminUsers = await getGroup(customObjectsApi, adminGroup);
      isAdmin = adminUsers?.includes(userName) ?? false;
    }
  } catch (e) {
    fastify.log.error(e.toString());
  }

  if (!kubeContext && !kubeContext.trim()) {
    const error = createCustomError;
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

export const createCustomError = (): createError.HttpError<500> => {
  const error = createError(500, 'failed to get kube status');
  error.explicitInternalServerError = true;
  error.error = 'failed to get kube status';
  error.message =
    'Unable to determine current login stats. Please make sure you are logged into OpenShift.';
  return error;
};

export const getGroupsConfig = async (coreV1Api: CoreV1Api, namespace: string): Promise<string> => {
  try {
    return (await coreV1Api.readNamespacedConfigMap(GROUPS_CONFIGMAP_NAME, namespace)).body.data[
      'groups-config'
    ];
  } catch (e) {
    throw new Error(
      `Failed to retrieve ConfigMap ${GROUPS_CONFIGMAP_NAME}, might be malformed or doesn't exist.`,
    );
  }
};

export const getGroupsAdminConfig = async (
  coreV1Api: CoreV1Api,
  namespace: string,
  groupsConfigName: string,
): Promise<string> => {
  try {
    return (await coreV1Api.readNamespacedConfigMap(groupsConfigName, namespace)).body.data[
      'admin_groups'
    ];
  } catch (e) {
    throw new Error(
      `Failed to retrieve ConfigMap ${groupsConfigName}, might be malformed or doesn't exist.`,
    );
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
