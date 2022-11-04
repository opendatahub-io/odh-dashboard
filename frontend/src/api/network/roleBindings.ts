import { k8sCreateResource, k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { getModelRoleBinding, getModelServiceAccountName } from 'pages/modelServing/utils';
import { RoleBindingKind } from '../../k8sTypes';
import { RoleBindingModel } from '../models';

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

export const generateRoleBindingServingRuntime = (namespace: string): RoleBindingKind => {
  const name = getModelRoleBinding(namespace);
  const saName = getModelServiceAccountName(namespace);

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
        name: saName,
      },
    ],
  };
  return roleBindingObject;
};

export const getRoleBinding = (projectName: string, rbName: string): Promise<RoleBindingKind> => {
  return k8sGetResource({
    model: RoleBindingModel,
    queryOptions: { name: rbName, ns: projectName },
  });
};

export const createRoleBinding = (data: RoleBindingKind): Promise<RoleBindingKind> => {
  return k8sCreateResource({ model: RoleBindingModel, resource: data });
};
