import { FastifyRequest } from 'fastify';
import {
  GroupsConfig,
  GroupsConfigBody,
  GroupsConfigBodyList,
  GroupStatus,
  KubeFastifyInstance,
} from '../../../types';
import { getAllGroups, getGroupsCR, updateGroupsCR } from '../../../utils/groupsUtils';
import { getUserName } from '../../../utils/userUtils';
import { isUserAdmin } from '../../../utils/adminUtils';
import createError from 'http-errors';

const SYSTEM_AUTHENTICATED = 'system:authenticated';

export const getGroupsConfig = async (fastify: KubeFastifyInstance): Promise<GroupsConfig> => {
  const customObjectsApi = fastify.kube.customObjectsApi;

  try {
    const groupsCluster = await getAllGroups(customObjectsApi);
    const groupsData = getGroupsCR();
    const groupsProcessed = processGroupData(groupsData);
    const groupsConfigProcessed = processGroupConfig(groupsProcessed, groupsCluster);
    await removeDeletedGroups(fastify, groupsData, groupsConfigProcessed.groupsCRData);

    return groupsConfigProcessed.groupsConfig;
  } catch (e) {
    fastify.log.error('Error retrieving group configuration: ' + e.toString());
    const error = createError(500, 'Error retrieving group configuration');
    throw error;
  }
};

const transformGroupsConfig = (groupStatus: GroupStatus[]): string[] => {
  return groupStatus.filter((group) => group.enabled).map((group) => group.name);
};

export const updateGroupsConfig = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{ Body: GroupsConfig }>,
): Promise<{ success: GroupsConfig | null; error: string | null }> => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const { namespace } = fastify.kube;

  const username = await getUserName(fastify, request);
  const isAdmin = await isUserAdmin(fastify, username, namespace);

  if (!isAdmin) {
    const error = createError(403, 'Error updating groups, user needs to be admin');
    throw error;
  }

  const groupConfigUpdated = request.body;
  const adminConfig = transformGroupsConfig(groupConfigUpdated.adminGroups);
  const allowedConfig = transformGroupsConfig(groupConfigUpdated.allowedGroups);

  if (adminConfig.length === 0 || allowedConfig.length === 0) {
    const error = createError(403, 'Error, groups cannot be empty');
    throw error;
  }
  try {
    const dataUpdated: GroupsConfigBody = {
      adminGroups: adminConfig.join(','),
      allowedGroups: allowedConfig.join(','),
    };

    const groupsData = await updateGroupsCR(fastify, dataUpdated);
    const groupsProcessed = processGroupData(groupsData);
    const groupsCluster = await getAllGroups(customObjectsApi);
    const updatedConfig = processGroupConfig(groupsProcessed, groupsCluster);
    await removeDeletedGroups(fastify, groupsData, updatedConfig.groupsCRData);
    return {
      success: updatedConfig.groupsConfig,
      error: null,
    };
  } catch (e) {
    fastify.log.error('Error updating group configuration' + e.toString());
    const error = createError(500, 'Error updating group configuration');
    throw error;
  }
};

const processGroupData = (groupsData: GroupsConfigBody): GroupsConfigBodyList => {
  const adminGroupsList = groupsData.adminGroups.split(',');
  const userGroupList = groupsData.allowedGroups.split(',');

  return {
    adminGroups: adminGroupsList,
    allowedGroups: userGroupList,
  };
};

const mapListToGroupStatus =
  (list: string[]) =>
  (group: string, index: number): GroupStatus => ({
    id: index,
    name: group,
    enabled: list.includes(group),
  });

/**
 * Process the CR Groups data and removes deleted groups that might be selected
 * @param groupsDataList CR Groups data in Array format
 * @param groups All the current groups in the cluster
 * @returns Processed object with the groups, removing missing groups that might be selected
 */
const processGroupConfig = (
  groupsDataList: GroupsConfigBodyList,
  groups: string[],
): { groupsConfig: GroupsConfig; groupsCRData: GroupsConfigBody } => {
  const adminGroupsConfig = groups.map(mapListToGroupStatus(groupsDataList.adminGroups));
  const allowedGroupsConfig = groups.map(mapListToGroupStatus(groupsDataList.allowedGroups));

  allowedGroupsConfig.push({
    id: allowedGroupsConfig.length,
    name: SYSTEM_AUTHENTICATED,
    enabled: groupsDataList.allowedGroups.includes(SYSTEM_AUTHENTICATED),
  });

  const groupsConfig: GroupsConfig = {
    adminGroups: adminGroupsConfig,
    allowedGroups: allowedGroupsConfig,
    errorAdmin: getError(groupsDataList.adminGroups, (group) => !groups.includes(group)),
    errorUser: getError(
      groupsDataList.allowedGroups,
      (group) => !groups.includes(group) && group !== SYSTEM_AUTHENTICATED,
    ),
  };

  const updatedBody: GroupsConfigBody = {
    adminGroups: groupsDataList.adminGroups.filter((group) => groups.includes(group)).join(','),
    allowedGroups: groupsDataList.allowedGroups
      .filter((group) => groups.includes(group) || group === SYSTEM_AUTHENTICATED)
      .join(','),
  };

  return { groupsConfig, groupsCRData: updatedBody };
};

const getError = (array: string[], predicate: (group: string) => boolean): string | undefined => {
  const missingItems = array.filter(predicate);
  if (missingItems.length === 0) return undefined;

  return `The group${missingItems.length === 1 ? '' : 's'} ${missingItems.join(
    ', ',
  )} no longer exists in OpenShift and has been removed from the selected group list.`;
};

/**
 * Check if any selected groups has been deleted and update the configuration if so
 * @param fastify Fastify instance
 * @param groupsData Custom Resource Data for group configuration
 * @param groupsConfigProcessed Processed data with missing groups deleted
 */
const removeDeletedGroups = async (
  fastify: KubeFastifyInstance,
  groupsData: GroupsConfigBody,
  groupsCRData: GroupsConfigBody,
): Promise<void> => {
  if (
    groupsData.adminGroups !== groupsCRData.adminGroups ||
    groupsData.allowedGroups !== groupsCRData.allowedGroups
  ) {
    await updateGroupsCR(fastify, groupsCRData);
  }
};
