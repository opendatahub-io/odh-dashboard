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

export const PVCModel: K8sModelCommon = {
  apiVersion: 'v1',
  kind: 'PersistentVolumeClaim',
  plural: 'persistentvolumeclaims',
};

export const NamespaceModel: K8sModelCommon = {
  apiVersion: 'v1',
  kind: 'Namespace',
  plural: 'namespaces',
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

export const ServiceAccountModel: K8sModelCommon = {
  apiVersion: 'v1',
  kind: 'ServiceAccount',
  plural: 'serviceaccounts',
};
