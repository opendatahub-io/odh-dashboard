import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const ConfigMapModel: K8sModelCommon = {
  apiVersion: 'v1',
  kind: 'ConfigMap',
  plural: 'configmaps',
};

export const PVCModel: K8sModelCommon = {
  apiVersion: 'v1',
  kind: 'PersistentVolumeClaim',
  plural: 'persistentvolumeclaims',
};

export const SecretModel: K8sModelCommon = {
  apiVersion: 'v1',
  kind: 'Secret',
  plural: 'secrets',
};
