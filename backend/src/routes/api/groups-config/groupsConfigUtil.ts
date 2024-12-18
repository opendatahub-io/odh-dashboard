/**
 * @fileOverview
 * @deprecated
 * The Whole file is deprecated. The exposed functions of the module are deprecated to help.
 * We are moving to direct k8s auth control and doing away with the OdhDashboardConfig group info.
 */
import { FastifyRequest } from 'fastify';
import createError from 'http-errors';
import {
  GroupsConfig,
  GroupsConfigBody,
  GroupsConfigBodyList,
  GroupStatus,
  KubeFastifyInstance,
} from '../../../types';
import { getAllGroups, getGroupsCR, updateGroupsCR } from '../../../utils/groupsUtils';
import { getUserInfo } from '../../../utils/userUtils';
import { isUserAdmin } from '../../../utils/adminUtils';

const SYSTEM_AUTHENTICATED = 'system:authenticated';

/** @deprecated - see RHOAIENG-16988 */
export const getGroupsConfig = async (fastify: KubeFastifyInstance): Promise<GroupsConfig> => {
  const { customObjectsApi } = fastify.kube;

  const groupsCluster = await getAllGroups(customObjectsApi);
  const groupsData = getGroupsCR();
  const groupsProcessed = processGroupData(groupsData);
  const groupsConfigProcessed = processGroupConfig(fastify, groupsProcessed, groupsCluster);
  await removeDeletedGroups(fastify, groupsData, groupsConfigProcessed.groupsCRData);
  return groupsConfigProcessed.groupsConfig;
};

const transformGroupsConfig = (groupStatus: GroupStatus[]): string[] =>
  groupStatus.filter((group) => group.enabled).map((group) => group.name);

/** @deprecated - see RHOAIENG-16988 */
export const updateGroupsConfig = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{ Body: GroupsConfig }>,
): Promise<GroupsConfig> => {
  const { customObjectsApi } = fastify.kube;
  const { namespace } = fastify.kube;

  const userInfo = await getUserInfo(fastify, request);
  const isAdmin = await isUserAdmin(fastify, userInfo.userName, namespace);

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
  const dataUpdated: GroupsConfigBody = {
    adminGroups: adminConfig.join(','),
    allowedGroups: allowedConfig.join(','),
  };

  const groupsData = await updateGroupsCR(fastify, dataUpdated);
  const groupsProcessed = processGroupData(groupsData);
  const groupsCluster = await getAllGroups(customObjectsApi);
  const updatedConfig = processGroupConfig(fastify, groupsProcessed, groupsCluster);
  await removeDeletedGroups(fastify, groupsData, updatedConfig.groupsCRData);
  return updatedConfig.groupsConfig;
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
  fastify: KubeFastifyInstance,
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
    errorAdmin: getError(
      fastify,
      groupsDataList.adminGroups.filter((group) => group),
      (group) => !groups.includes(group),
    ),
    errorUser: getError(
      fastify,
      groupsDataList.allowedGroups.filter((group) => group),
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

const getError = (
  fastify: KubeFastifyInstance,
  array: string[],
  predicate: (group: string) => boolean,
): string | undefined => {
  let error;
  if (array.length === 0) {
    error = 'No group is set in the group config, please set one or more group.';
    fastify.log.error(error);
    return error;
  }

  const missingItems = array.filter(predicate);
  if (missingItems.length === 0) {
    return undefined;
  }

  error = `The group${missingItems.length === 1 ? '' : 's'} ${missingItems.join(
    ', ',
  )} no longer exists in OpenShift and has been removed from the selected group list.`;
  fastify.log.error(error);
  return error;
};

/**
 * @deprecated - see RHOAIENG-16988
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
