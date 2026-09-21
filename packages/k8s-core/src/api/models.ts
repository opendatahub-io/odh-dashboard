import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const ConfigMapModel: K8sModelCommon = {
  apiVersion: 'v1',
  kind: 'ConfigMap',
  plural: 'configmaps',
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

export const ServiceAccountModel: K8sModelCommon = {
  apiVersion: 'v1',
  kind: 'ServiceAccount',
  plural: 'serviceaccounts',
};

export const ClusterQueueModel: K8sModelCommon = {
  apiVersion: 'v1beta2',
  apiGroup: 'kueue.x-k8s.io',
  kind: 'ClusterQueue',
  plural: 'clusterqueues',
};

export const LocalQueueModel: K8sModelCommon = {
  apiVersion: 'v1beta2',
  apiGroup: 'kueue.x-k8s.io',
  kind: 'LocalQueue',
  plural: 'localqueues',
};

export const WorkloadModel: K8sModelCommon = {
  apiVersion: 'v1beta2',
  apiGroup: 'kueue.x-k8s.io',
  kind: 'Workload',
  plural: 'workloads',
};
