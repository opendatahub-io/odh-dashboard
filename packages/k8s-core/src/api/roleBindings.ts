import { k8sCreateResource, k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { RoleBindingModel } from './models';
import { KnownLabels, applyK8sAPIOptions } from '../index';
import type { K8sAPIOptions, RoleBindingKind, RoleBindingRoleRef } from '../k8sTypes';

export const generateRoleBindingServiceAccount = (
  name: string,
  serviceAccountName: string,
  roleRef: Omit<RoleBindingRoleRef, 'apiGroup'>,
  namespace: string,
): RoleBindingKind => ({
  apiVersion: 'rbac.authorization.k8s.io/v1',
  kind: 'RoleBinding',
  metadata: {
    name,
    namespace,
    labels: {
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    },
  },
  roleRef: {
    apiGroup: 'rbac.authorization.k8s.io',
    ...roleRef,
  },
  subjects: [
    {
      kind: 'ServiceAccount',
      name: serviceAccountName,
    },
  ],
});

export const getRoleBinding = (projectName: string, rbName: string): Promise<RoleBindingKind> =>
  k8sGetResource({
    model: RoleBindingModel,
    queryOptions: { name: rbName, ns: projectName },
  });

export const createRoleBinding = (
  data: RoleBindingKind,
  opts?: K8sAPIOptions,
): Promise<RoleBindingKind> =>
  k8sCreateResource(applyK8sAPIOptions({ model: RoleBindingModel, resource: data }, opts));
