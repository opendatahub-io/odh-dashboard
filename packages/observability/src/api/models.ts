import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const ClusterVersionModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'config.openshift.io',
  kind: 'ClusterVersion',
  plural: 'clusterversions',
};

export const InfrastructureModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'config.openshift.io',
  kind: 'Infrastructure',
  plural: 'infrastructures',
};
