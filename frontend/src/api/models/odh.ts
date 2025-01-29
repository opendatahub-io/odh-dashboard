import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const ODHDashboardConfigModel: K8sModelCommon = {
  apiVersion: 'v1alpha',
  apiGroup: 'opendatahub.io',
  kind: 'ODHDashboardConfig',
  plural: 'odhdashboardconfigs',
};

export const AcceleratorProfileModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'dashboard.opendatahub.io',
  kind: 'AcceleratorProfile',
  plural: 'acceleratorprofiles',
};

export const HardwareProfileModel = {
  apiVersion: 'v1alpha1',
  apiGroup: 'dashboard.opendatahub.io',
  kind: 'HardwareProfile',
  plural: 'hardwareprofiles',
} satisfies K8sModelCommon;

export const NotebookModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'kubeflow.org',
  kind: 'Notebook',
  plural: 'notebooks',
};

export const ServingRuntimeModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'serving.kserve.io',
  kind: 'ServingRuntime',
  plural: 'servingruntimes',
};

export const InferenceServiceModel: K8sModelCommon = {
  apiVersion: 'v1beta1',
  apiGroup: 'serving.kserve.io',
  kind: 'InferenceService',
  plural: 'inferenceservices',
};

export const NIMAccountModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'nim.opendatahub.io',
  kind: 'Account',
  plural: 'accounts',
};

export const AuthModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'services.platform.opendatahub.io',
  kind: 'Auth',
  plural: 'auths',
};
