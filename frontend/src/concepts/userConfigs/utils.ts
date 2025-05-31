import { AuthKind, GroupKind } from '#~/k8sTypes';
import { getAuth, patchAuth } from '#~/api';
import { GroupsConfig } from './groupTypes';

const ALL_USERS = 'system:authenticated';

const getError = (array: string[], predicate: (group: string) => boolean): string | undefined => {
  let error;
  if (array.length === 0) {
    error = 'No group is set in the group config, please set one or more group.';
    // eslint-disable-next-line no-console
    console.error(error);
    return error;
  }

  const missingItems = array.filter(predicate);
  if (missingItems.length === 0) {
    return undefined;
  }

  error = `The group${missingItems.length === 1 ? '' : 's'} ${missingItems.join(
    ', ',
  )} no longer exists in OpenShift and has been removed from the selected group list.`;
  // eslint-disable-next-line no-console
  console.error(error);
  return error;
};

const compileGroupValues = (
  adminGroups: string[],
  allowedGroups: string[],
  groups: GroupKind[],
): GroupsConfig => {
  const groupNames = groups.map((g) => g.metadata.name);

  const data: GroupsConfig = {
    allowedGroups: [
      ...groupNames.map((name) => ({
        id: name,
        name,
        enabled: allowedGroups.includes(name),
      })),
      { id: ALL_USERS, name: ALL_USERS, enabled: allowedGroups.includes(ALL_USERS) },
    ],
    adminGroups: groupNames.map((name) => ({
      id: name,
      name,
      enabled: adminGroups.includes(name),
    })),
  };

  const errorAdmin = getError(adminGroups, (group) => !groupNames.includes(group));
  if (errorAdmin) {
    data.errorAdmin = errorAdmin;
  }
  const errorUser = getError(
    allowedGroups,
    (group) => !groupNames.includes(group) && group !== ALL_USERS,
  );
  if (errorUser) {
    data.errorUser = errorUser;
  }

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
