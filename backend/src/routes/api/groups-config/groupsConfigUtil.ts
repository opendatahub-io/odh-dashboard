import { FastifyRequest } from 'fastify';
import {
  GroupConfigMapData,
  GroupConfigMapDataProcessed,
  GroupsConfig,
  KubeFastifyInstance,
} from '../../../types';
import createError from 'http-errors';
import {
  getGroupsConfigMapData,
  getGroupsConfigMapName,
  getAllGroups,
  updateGroupsConfigMapData,
} from '../../../utils/groupsUtils';

const SYSTEM_AUTHENTICATED = 'system:authenticated';

export const getGroupsConfig = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<GroupsConfig> => {
  const { namespace } = fastify.kube;
  const coreV1Api = fastify.kube.coreV1Api;
  const customObjectsApi = fastify.kube.customObjectsApi;

  try {
    const groupsCluster = await getAllGroups(customObjectsApi);
    const groupsConfigName = await getGroupsConfigMapName(coreV1Api, namespace);
    const groupsData = (await getGroupsConfigMapData(
      coreV1Api,
      namespace,
      groupsConfigName,
    )) as GroupConfigMapData;
    const groupsProcessed = processGroupData(groupsData);
    const groupsConfigProcessed = processGroupConfig(groupsProcessed, groupsCluster);
    if (
      groupsData.admin_groups !== groupsConfigProcessed.groupsConfigMapData.admin_groups ||
      groupsData.allowed_groups !== groupsConfigProcessed.groupsConfigMapData.allowed_groups
    ) {
      await updateGroupsConfigMapData(
        coreV1Api,
        namespace,
        groupsConfigName,
        groupsConfigProcessed.groupsConfigMapData,
      );
    }
    return groupsConfigProcessed.groupsConfig;
  } catch (e) {
    fastify.log.error('Error retrieving group configuration: ' + e.toString());
    const error = createError(500, 'Error retrieving group configuration');
    throw error;
  }
};

export const updateGroupsConfig = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ success: GroupsConfig | null; error: string | null }> => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = fastify.kube.namespace;
  const coreV1Api = fastify.kube.coreV1Api;

  const groupConfigUpdated = request.body as GroupsConfig;
  const adminConfig = groupConfigUpdated.adminGroups
    .filter((group) => group.enabled)
    .map((group) => group.name);
  const userConfig = groupConfigUpdated.userGroups
    .filter((group) => group.enabled)
    .map((group) => group.name);

  if (adminConfig.length === 0 || userConfig.length === 0) {
    return {
      success: null,
      error: 'Error, groups cannot be empty',
    };
  }
  try {
    const configMapDataUpdated: GroupConfigMapData = {
      admin_groups: adminConfig.toString(),
      allowed_groups: userConfig.toString(),
    };
    const groupsConfigName = await getGroupsConfigMapName(coreV1Api, namespace);
    const groupsData = await updateGroupsConfigMapData(
      coreV1Api,
      namespace,
      groupsConfigName,
      configMapDataUpdated,
    );
    const groupsProcessed = processGroupData(groupsData);
    const groupsCluster = await getAllGroups(customObjectsApi);
    const updatedConfig = processGroupConfig(groupsProcessed, groupsCluster);
    if (
      groupsData.admin_groups !== updatedConfig.groupsConfigMapData.admin_groups ||
      groupsData.allowed_groups !== updatedConfig.groupsConfigMapData.allowed_groups
    ) {
      await updateGroupsConfigMapData(
        coreV1Api,
        namespace,
        groupsConfigName,
        updatedConfig.groupsConfigMapData,
      );
    }
    return {
      success: updatedConfig.groupsConfig,
      error: null,
    };
  } catch (e) {
    fastify.log.error('Error updating group configuration' + e.toString());
    const error = createError(500, 'Error updating group configuration');
    return {
      success: null,
      error: error.toString(),
    };
  }
};

const processGroupData = (groupsData: GroupConfigMapData): GroupConfigMapDataProcessed => {
  const adminGroupsList = groupsData.admin_groups.split(',');
  const userGroupList = groupsData.allowed_groups.split(',');

  return {
    adminGroup: adminGroupsList,
    allowedGroup: userGroupList,
  };
};

const processGroupConfig = (
  groupsDataProcessed: GroupConfigMapDataProcessed,
  groups: string[],
): { groupsConfig: GroupsConfig; groupsConfigMapData: GroupConfigMapData } => {
  const adminGroupsConfig = groups.map((group, index) => ({
    id: index,
    name: group,
    enabled: groupsDataProcessed.adminGroup.includes(group),
  }));
  const userGroupsConfig = groups.map((group, index) => ({
    id: index,
    name: group,
    enabled: groupsDataProcessed.allowedGroup.includes(group),
  }));

  userGroupsConfig.push({
    id: userGroupsConfig.length,
    name: SYSTEM_AUTHENTICATED,
    enabled: groupsDataProcessed.allowedGroup.includes(SYSTEM_AUTHENTICATED),
  });

  const groupsConfig: GroupsConfig = {
    adminGroups: adminGroupsConfig,
    userGroups: userGroupsConfig,
  };

  const missingAdminGroups = groupsDataProcessed.adminGroup.filter(
    (group) => !groups.includes(group),
  );
  const missingUserGroups = groupsDataProcessed.allowedGroup.filter(
    (group) => !groups.includes(group) && group !== SYSTEM_AUTHENTICATED,
  );

  if (missingAdminGroups.length === 1) {
    groupsConfig.errorAdmin = `The group ${missingAdminGroups.join(
      ', ',
    )} no longer exists in OpenShift and has been removed from the selected group list.`;
  } else if (missingAdminGroups.length > 1) {
    groupsConfig.errorAdmin = `The groups ${missingAdminGroups.join(
      ', ',
    )} no longer exist in OpenShift and has been removed from the selected group list.`;
  }

  if (missingUserGroups.length === 1) {
    groupsConfig.errorUser = `The group ${missingUserGroups.join(
      ', ',
    )} no longer exists in OpenShift and has been removed from the selected group list.`;
  } else if (missingUserGroups.length > 1) {
    groupsConfig.errorUser = `The groups ${missingUserGroups.join(
      ', ',
    )} no longer exist in OpenShift and has been removed from the selected group list.`;
  }

  const updatedConfigMap: GroupConfigMapData = {
    admin_groups: groupsDataProcessed.adminGroup
      .filter((group) => groups.includes(group))
      .toString(),
    allowed_groups: groupsDataProcessed.allowedGroup
      .filter((group) => groups.includes(group) || group === SYSTEM_AUTHENTICATED)
      .toString(),
  };

  return { groupsConfig: groupsConfig, groupsConfigMapData: updatedConfigMap };
};
