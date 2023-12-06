import { CustomObjectsApi } from '@kubernetes/client-node';
import { setDashboardConfig } from '../routes/api/config/configUtils';
import {
  GroupCustomObject,
  GroupObjResponse,
  GroupsConfigBody,
  KubeFastifyInstance,
} from '../types';
import { getDashboardConfig } from './resourceUtils';

export class MissingGroupError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, MissingGroupError.prototype);
  }
}

export const getGroupsCR = (): GroupsConfigBody => {
  if (getDashboardConfig().spec.groupsConfig) {
    return getDashboardConfig().spec.groupsConfig;
  }
  throw new Error(`Failed to retrieve Dashboard CR groups configuration`);
};

export const updateGroupsCR = async (
  fastify: KubeFastifyInstance,
  groupsConfigBody: GroupsConfigBody,
): Promise<GroupsConfigBody> => {
  try {
    const updatedConfig = await setDashboardConfig(fastify, {
      spec: {
        groupsConfig: groupsConfigBody,
      },
    });
    return updatedConfig.spec.groupsConfig;
  } catch (e) {
    throw new Error(`Failed to update Dashboard CR groups configuration`);
  }
};

export const getAdminGroups = (): string => {
  try {
    return getGroupsCR().adminGroups;
  } catch (e) {
    throw new Error(`${e} for adminGroups attribute`);
  }
};

export const getAllowedGroups = (): string => {
  try {
    return getGroupsCR().allowedGroups;
  } catch (e) {
    throw new Error(`${e} for allowedGroups attribute`);
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
    return (adminGroupResponse.body as GroupObjResponse).users || [];
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

export const getAllGroupsByUser = async (
  customObjectsApi: CustomObjectsApi,
  username: string,
): Promise<string[]> => {
  try {
    const adminGroupResponse = await customObjectsApi.listClusterCustomObject(
      'user.openshift.io',
      'v1',
      'groups',
    );
    const groups = adminGroupResponse.body as GroupCustomObject;
    return groups.items.filter((x) => x.users?.includes(username)).map((x) => x.metadata?.name);
  } catch (e) {
    throw new Error(`Failed to list groups filtered by username: ${e.message}.`);
  }
};
