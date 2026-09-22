import {
  OwnerReference,
  k8sDeleteResource,
  k8sPatchResource,
  K8sStatus,
  K8sResourceCommon,
  k8sListResourceItems,
} from '@openshift/dynamic-plugin-sdk-utils';
import { genRandomChars } from '@odh-dashboard/foundation';
import { KnownLabels, applyK8sAPIOptions } from '@odh-dashboard/k8s-core';
import { addOwnerReference } from '@odh-dashboard/k8s-core/api/k8sUtils';
import { RoleBindingModel } from '@odh-dashboard/k8s-core/api/models';
import {
  K8sAPIOptions,
  RoleBindingKind,
  RoleBindingRoleRef,
  RoleBindingSubject,
} from '#~/k8sTypes';
import { RoleBindingPermissionsRoleType } from '#~/concepts/roleBinding/types';

export const generateRoleBindingPermissions = (
  namespace: string,
  rbSubjectKind: RoleBindingSubject['kind'],
  rbSubjectName: RoleBindingSubject['name'],
  rbRoleRefName: RoleBindingPermissionsRoleType | string, //string because with MR this can include MR name
  rbRoleRefKind: RoleBindingRoleRef['kind'],
  rbLabels: { [key: string]: string } = {
    [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    [KnownLabels.PROJECT_SHARING]: 'true',
  },
  ownerReference?: K8sResourceCommon,
): RoleBindingKind => {
  const roleBindingObject: RoleBindingKind = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'RoleBinding',
    metadata: {
      name: `dashboard-permissions-${genRandomChars()}`,
      namespace,
      labels: rbLabels,
    },
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: rbRoleRefKind,
      name: rbRoleRefName,
    },
    subjects: [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: rbSubjectKind,
        name: rbSubjectName,
      },
    ],
  };
  return addOwnerReference(roleBindingObject, ownerReference);
};

export const listRoleBindings = (
  namespace?: string,
  labelSelector?: string,
): Promise<RoleBindingKind[]> => {
  const queryOptions = {
    ...(namespace && { ns: namespace }),
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResourceItems<RoleBindingKind>({
    model: RoleBindingModel,
    queryOptions,
  });
};

export const deleteRoleBinding = (
  rbName: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<RoleBindingKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: RoleBindingModel,
        queryOptions: { name: rbName, ns: namespace },
      },
      opts,
    ),
  );

export const patchRoleBindingOwnerRef = (
  rbName: string,
  namespace: string,
  ownerReferences: OwnerReference[],
  opts?: K8sAPIOptions,
): Promise<RoleBindingKind> =>
  k8sPatchResource<RoleBindingKind>(
    applyK8sAPIOptions(
      {
        model: RoleBindingModel,
        queryOptions: { name: rbName, ns: namespace },
        patches: [
          {
            op: 'replace',
            path: '/metadata/ownerReferences',
            value: ownerReferences,
          },
        ],
      },
      opts,
    ),
  );

export const patchRoleBindingSubjects = (
  rbName: string,
  namespace: string,
  subjects: RoleBindingSubject[],
  opts?: K8sAPIOptions,
): Promise<RoleBindingKind> =>
  k8sPatchResource<RoleBindingKind>(
    applyK8sAPIOptions(
      {
        model: RoleBindingModel,
        queryOptions: { name: rbName, ns: namespace },
        patches: [
          {
            op: 'replace',
            path: '/subjects',
            value: subjects,
          },
        ],
      },
      opts,
    ),
  );
