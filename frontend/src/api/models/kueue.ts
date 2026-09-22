import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const WorkloadPriorityClassModel: K8sModelCommon = {
  apiVersion: 'v1beta2',
  apiGroup: 'kueue.x-k8s.io',
  kind: 'WorkloadPriorityClass',
  plural: 'workloadpriorityclasses',
};

export const VisibilityLocalQueueModel: K8sModelCommon = {
  apiVersion: 'v1beta2',
  apiGroup: 'visibility.kueue.x-k8s.io',
  kind: 'LocalQueue',
  plural: 'localqueues',
};

export const CohortModel: K8sModelCommon = {
  apiVersion: 'v1beta2',
  apiGroup: 'kueue.x-k8s.io',
  kind: 'Cohort',
  plural: 'cohorts',
};

export const ResourceFlavorModel: K8sModelCommon = {
  apiVersion: 'v1beta2',
  apiGroup: 'kueue.x-k8s.io',
  kind: 'ResourceFlavor',
  plural: 'resourceflavors',
};
