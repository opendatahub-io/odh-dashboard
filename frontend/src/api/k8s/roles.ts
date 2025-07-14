import { k8sCreateResource, k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions, KnownLabels, RoleKind } from '#~/k8sTypes';
import { RoleModel } from '#~/api/models';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';

export const generateRoleInferenceService = (
  roleName: string,
  inferenceServiceName: string,
  namespace: string,
): RoleKind => {
  const role: RoleKind = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'Role',
    metadata: {
      name: roleName,
      namespace,
      labels: {
        [KnownLabels.DASHBOARD_RESOURCE]: 'true',
      },
    },
    rules: [
      {
        verbs: ['get'],
        apiGroups: ['serving.kserve.io'],
        resources: ['inferenceservices'],
        resourceNames: [inferenceServiceName],
      },
    ],
  };
  return role;
};

export const getRole = (namespace: string, roleName: string): Promise<RoleKind> =>
  k8sGetResource({
    model: RoleModel,
    queryOptions: { name: roleName, ns: namespace },
  });

export const createRole = (data: RoleKind, opts?: K8sAPIOptions): Promise<RoleKind> =>
  k8sCreateResource(applyK8sAPIOptions({ model: RoleModel, resource: data }, opts));
