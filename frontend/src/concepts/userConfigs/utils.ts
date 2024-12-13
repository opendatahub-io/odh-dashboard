import { AccessReviewResourceAttributes, AuthKind, GroupKind } from '~/k8sTypes';
import {
  AUTH_SINGLETON_NAME,
  AuthModel,
  getAuthResource,
  patchAuthResource,
  useAccessReview,
} from '~/api';
import { GroupValues } from './groupTypes';

const authCheck: AccessReviewResourceAttributes = {
  group: AuthModel.apiGroup,
  resource: AuthModel.plural,
  name: AUTH_SINGLETON_NAME,
  verb: 'update', // If they can get the data but not updated, we can assume they cannot access it
};

export const useDoesUserHaveAuthAccess = (): ReturnType<typeof useAccessReview> =>
  useAccessReview(authCheck);

const ALL_USERS = 'system:authenticated';

const compileGroupValues = (
  adminGroups: string[],
  allowedGroups: string[],
  groups: GroupKind[],
): GroupValues => ({
  allowedGroups: [
    ...groups.map((group) => ({
      id: group.metadata.name,
      name: group.metadata.name,
      enabled: allowedGroups.includes(group.metadata.name),
    })),
    { id: ALL_USERS, name: ALL_USERS, enabled: allowedGroups.includes(ALL_USERS) },
  ],
  adminGroups: groups.map((group) => ({
    id: group.metadata.name,
    name: group.metadata.name,
    enabled: adminGroups.includes(group.metadata.name),
  })),
});
const convertAuthToGroupValues = (auth: AuthKind, groups: GroupKind[]): GroupValues => {
  const {
    spec: { adminGroups, allowedGroups },
  } = auth;

  return compileGroupValues(adminGroups, allowedGroups, groups);
};

export const fetchAuthGroups = async (groups: GroupKind[]): Promise<GroupValues> =>
  getAuthResource().then((auth) => convertAuthToGroupValues(auth, groups));

export const updateAuthGroups = async (
  groupConfigs: GroupValues,
  groups: GroupKind[],
): Promise<GroupValues> => {
  const adminGroups = groupConfigs.adminGroups.filter((g) => g.enabled).map((g) => g.name);
  const allowedGroups = groupConfigs.allowedGroups.filter((g) => g.enabled).map((g) => g.name);

  return patchAuthResource({ adminGroups, allowedGroups }).then((auth) =>
    convertAuthToGroupValues(auth, groups),
  );
};
