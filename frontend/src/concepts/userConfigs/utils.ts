import * as _ from 'lodash-es';
import { AuthKind, GroupKind } from '#~/k8sTypes';
import { getAuth, patchAuth } from '#~/api';
import { GroupsConfig } from './groupTypes';

const ALL_USERS = 'system:authenticated';

const compileGroupValues = (
  adminGroups: string[],
  allowedGroups: string[],
  groups: GroupKind[],
): GroupsConfig => {
  const groupNames = groups.map((g) => g.metadata.name);

  const data: GroupsConfig = {
    allowedGroups: [
      ..._.uniq([...groupNames, ...allowedGroups, ALL_USERS]).map((name) => ({
        id: name,
        name,
        enabled: allowedGroups.includes(name),
      })),
    ],
    adminGroups: _.uniq([...groupNames, ...adminGroups]).map((name) => ({
      id: name,
      name,
      enabled: adminGroups.includes(name),
    })),
  };

  return data;
};

const convertAuthToGroupValues = (auth: AuthKind, groups: GroupKind[]): GroupsConfig => {
  const {
    spec: { adminGroups, allowedGroups },
  } = auth;

  return compileGroupValues(adminGroups, allowedGroups, groups);
};

export const fetchAuthGroups = async (groups: GroupKind[]): Promise<GroupsConfig> =>
  getAuth().then((auth) => convertAuthToGroupValues(auth, groups));

export const updateAuthGroups = async (
  groupConfigs: GroupsConfig,
  groups: GroupKind[],
): Promise<GroupsConfig> => {
  const adminGroups = groupConfigs.adminGroups.filter((g) => g.enabled).map((g) => g.name);
  const allowedGroups = groupConfigs.allowedGroups.filter((g) => g.enabled).map((g) => g.name);

  return patchAuth({ adminGroups, allowedGroups }).then((auth) =>
    convertAuthToGroupValues(auth, groups),
  );
};
