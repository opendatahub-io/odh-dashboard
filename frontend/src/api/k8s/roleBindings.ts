import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sStatus, RoleBindingKind } from '~/k8sTypes';
import { RoleBindingModel } from '~/api/models';

export const generateRoleBindingData = (
  rbName: string,
  dashboardNamespace: string,
  projectName: string,
): RoleBindingKind => {
  const roleBindingObject: RoleBindingKind = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'RoleBinding',
    metadata: {
      name: rbName,
      namespace: dashboardNamespace,
      labels: {
        'opendatahub.io/dashboard': 'true',
      },
    },
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'ClusterRole',
      name: 'system:image-puller',
    },
    subjects: [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'Group',
        name: `system:serviceaccounts:${projectName}`,
      },
    ],
  };
  return roleBindingObject;
};

export const generateRoleBindingServingRuntime = (
  name: string,
  serviceAccountName: string,
  namespace: string,
): RoleBindingKind => {
  const roleBindingObject: RoleBindingKind = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'RoleBinding',
    metadata: {
      name,
      namespace,
      labels: {
        'opendatahub.io/dashboard': 'true',
      },
    },
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'ClusterRole',
      name: 'view',
    },
    subjects: [
      {
        kind: 'ServiceAccount',
        name: serviceAccountName,
      },
    ],
  };
  return roleBindingObject;
};

export const getRoleBinding = (projectName: string, rbName: string): Promise<RoleBindingKind> =>
  k8sGetResource({
    model: RoleBindingModel,
    queryOptions: { name: rbName, ns: projectName },
  });

export const createRoleBinding = (data: RoleBindingKind): Promise<RoleBindingKind> =>
  k8sCreateResource({ model: RoleBindingModel, resource: data });

export const deleteRoleBinding = (name: string, ns: string): Promise<K8sStatus> =>
  k8sDeleteResource<RoleBindingKind, K8sStatus>({
    model: RoleBindingModel,
    queryOptions: { name, ns },
  });
