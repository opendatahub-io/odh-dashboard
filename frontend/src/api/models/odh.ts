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

export const HardwareProfileModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'infrastructure.opendatahub.io',
  kind: 'HardwareProfile',
  plural: 'hardwareprofiles',
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

export const DataSciencePipelineApplicationModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'datasciencepipelinesapplications.opendatahub.io',
  kind: 'DataSciencePipelinesApplication',
  plural: 'datasciencepipelinesapplications',
};

export const ModelRegistryModel: K8sModelCommon = {
  apiVersion: 'v1beta1',
  apiGroup: 'modelregistry.opendatahub.io',
  kind: 'ModelRegistry',
  plural: 'modelregistries',
};

export const TrustyAIApplicationsModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'trustyai.opendatahub.io',
  kind: 'TrustyAIService',
  plural: 'trustyaiservices',
};

export const LMEvalModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'trustyai.opendatahub.io',
  kind: 'LMEvalJob',
  plural: 'lmevaljobs',
};
