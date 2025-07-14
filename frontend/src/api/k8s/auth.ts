import { k8sGetResource, k8sPatchResource, Patch } from '@openshift/dynamic-plugin-sdk-utils';
import { AuthModel } from '#~/api';
import { AuthKind } from '#~/k8sTypes';

export const AUTH_SINGLETON_NAME = 'auth';

export const getAuth = (): Promise<AuthKind> =>
  k8sGetResource<AuthKind>({ model: AuthModel, queryOptions: { name: AUTH_SINGLETON_NAME } });

export type GroupData = { adminGroups?: string[]; allowedGroups?: string[] };
export const patchAuth = (groupData: GroupData): Promise<AuthKind> => {
  const { adminGroups, allowedGroups } = groupData;
  const patches: Patch[] = [];
  if (adminGroups) {
    patches.push({
      value: adminGroups,
      op: 'replace',
      path: '/spec/adminGroups',
    });
  }
  if (allowedGroups) {
    patches.push({
      value: allowedGroups,
      op: 'replace',
      path: '/spec/allowedGroups',
    });
  }

  return k8sPatchResource<AuthKind>({
    model: AuthModel,
    queryOptions: { name: AUTH_SINGLETON_NAME },
    patches,
  });
};
