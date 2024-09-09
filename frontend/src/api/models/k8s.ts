import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const ConfigMapModel: K8sModelCommon = {
  apiVersion: 'v1',
  kind: 'ConfigMap',
  plural: 'configmaps',
};

export const EventModel: K8sModelCommon = {
  apiVersion: 'v1',
  kind: 'Event',
  plural: 'events',
};

export const PodModel: K8sModelCommon = {
  apiVersion: 'v1',
  kind: 'Pod',
  plural: 'pods',
};

export const StatefulSetModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'apps',
  kind: 'StatefulSet',
  plural: 'statefulsets',
};

export const PVCModel: K8sModelCommon = {
  apiVersion: 'v1',
  kind: 'PersistentVolumeClaim',
  plural: 'persistentvolumeclaims',
};

export const StorageClassModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'storage.k8s.io',
  kind: 'StorageClass',
  plural: 'storageclasses',
};

export const NamespaceModel: K8sModelCommon = {
  apiVersion: 'v1',
  kind: 'Namespace',
  plural: 'namespaces',
};

export const RoleModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'rbac.authorization.k8s.io',
  kind: 'Role',
  plural: 'roles',
};

export const RoleBindingModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'rbac.authorization.k8s.io',
  kind: 'RoleBinding',
  plural: 'rolebindings',
};

export const SecretModel: K8sModelCommon = {
  apiVersion: 'v1',
  kind: 'Secret',
  plural: 'secrets',
};

export const SelfSubjectAccessReviewModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'authorization.k8s.io',
  kind: 'SelfSubjectAccessReview',
  plural: 'selfsubjectaccessreviews',
};

export const SelfSubjectRulesReviewModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'authorization.k8s.io',
  kind: 'SelfSubjectRulesReview',
  plural: 'selfsubjectrulesreviews',
};

export const ServiceModel: K8sModelCommon = {
  apiVersion: 'v1',
  kind: 'Service',
  plural: 'services',
};

export const ServiceAccountModel: K8sModelCommon = {
  apiVersion: 'v1',
  kind: 'ServiceAccount',
  plural: 'serviceaccounts',
};
