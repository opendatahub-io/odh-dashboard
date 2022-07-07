import { CoreV1Api, CustomObjectsApi, V1ConfigMap } from '@kubernetes/client-node';
import { GroupConfigMapData, GroupCustomObject, groupObjResponse } from '../types';

const GROUPS_CONFIGMAP_NAME = 'groups-config';
const GROUPS_CONFIGMAP_ADMIN_ATTRIBUTE = 'admin_groups';
const GROUPS_CONFIGMAP_USER_ATTRIBUTE = 'allowed_groups';

export class MissingGroupError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, MissingGroupError.prototype);
  }
}

export const getGroupsConfigMapName = async (
  coreV1Api: CoreV1Api,
  namespace: string,
): Promise<string> => {
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

export const getGroupsConfigMapData = async (
  coreV1Api: CoreV1Api,
  namespace: string,
  groupsConfigName: string,
): Promise<{ [key: string]: string }> => {
  try {
    return (await coreV1Api.readNamespacedConfigMap(groupsConfigName, namespace)).body.data;
  } catch (e) {
    throw new Error(
      `Failed to retrieve ConfigMap ${groupsConfigName}, might be malformed or doesn't exist.`,
    );
  }
};

export const updateGroupsConfigMapData = async (
  coreV1Api: CoreV1Api,
  namespace: string,
  groupsConfigName: string,
  groupsConfigBody: GroupConfigMapData,
): Promise<GroupConfigMapData> => {
  try {
    const cmBody: V1ConfigMap = {
      metadata: {
        name: groupsConfigName,
        namespace: namespace,
      },
      data: groupsConfigBody,
    };
    const response = await coreV1Api.replaceNamespacedConfigMap(
      groupsConfigName,
      namespace,
      cmBody,
    );
    return response.body.data as GroupConfigMapData;
  } catch (e) {
    throw new Error(
      `Failed to retrieve ConfigMap ${groupsConfigName}, might be malformed or doesn't exist.`,
    );
  }
};

export const getAdminGroups = async (
  coreV1Api: CoreV1Api,
  namespace: string,
  groupsConfigName: string,
): Promise<string> => {
  try {
    return (await getGroupsConfigMapData(coreV1Api, namespace, groupsConfigName))[
      GROUPS_CONFIGMAP_ADMIN_ATTRIBUTE
    ];
  } catch (e) {
    throw new Error(
      `Failed to retrieve ConfigMap ${groupsConfigName}, might be malformed or doesn't exist.`,
    );
  }
};

export const getUserGroups = async (
  coreV1Api: CoreV1Api,
  namespace: string,
  groupsConfigName: string,
): Promise<string> => {
  try {
    return (await getGroupsConfigMapData(coreV1Api, namespace, groupsConfigName))[
      GROUPS_CONFIGMAP_USER_ATTRIBUTE
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
    throw new MissingGroupError(`Failed to retrieve Group ${adminGroup}, might not exist.`);
  }
};

export const getAllGroups = async (customObjectsApi: CustomObjectsApi): Promise<string[]> => {
  try {
    const adminGroupResponse = await customObjectsApi.listClusterCustomObject(
      'user.openshift.io',
      'v1',
      'groups',
    );
    const groups = adminGroupResponse.body as GroupCustomObject;
    return groups.items.map((x) => x.metadata.name);
  } catch (e) {
    throw new Error(`Failed to list groups.`);
  }
};
