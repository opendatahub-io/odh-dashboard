import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const ClusterQueueModel: K8sModelCommon = {
  apiVersion: 'v1beta1',
  apiGroup: 'kueue.x-k8s.io',
  kind: 'ClusterQueue',
  plural: 'clusterqueues',
};

export const LocalQueueModel: K8sModelCommon = {
  apiVersion: 'v1beta1',
  apiGroup: 'kueue.x-k8s.io',
  kind: 'LocalQueue',
  plural: 'localqueues',
};

export const WorkloadModel: K8sModelCommon = {
  apiVersion: 'v1beta1',
  apiGroup: 'kueue.x-k8s.io',
  kind: 'Workload',
  plural: 'workloads',
};

export const WorkloadPriorityClassModel: K8sModelCommon = {
  apiVersion: 'v1beta1',
  apiGroup: 'kueue.x-k8s.io',
  kind: 'WorkloadPriorityClass',
  plural: 'workloadpriorityclasses',
};
