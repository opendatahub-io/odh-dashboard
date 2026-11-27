import type {
  WizardFieldExtension,
  WizardFieldApplyExtension,
  WizardFieldExtractorExtension,
  WizardTrackingPropertiesExtension,
} from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
import { DataScienceStackComponent, SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { LLMDServingExtension } from './types';
import type { LLMdDeployment } from '../src/types';
import type {
  GatewaySelectFieldData,
  GatewaySelectFieldType,
} from '../src/wizardFields/gateway/GatewaySelectField';

export const gatewaySelectFieldExtension: WizardFieldExtension<
  GatewaySelectFieldType,
  LLMdDeployment
> = {
  type: 'model-serving.deployment/wizard-field',
  properties: {
    platform: SupportedArea.LLMD_SERVING,
    field: () =>
      import('../src/wizardFields/gateway/GatewaySelectField').then((m) => m.GatewaySelectField),
  },
  flags: {
    required: [SupportedArea.LLMD_SERVING, SupportedArea.LLMD_GATEWAY_FIELD],
  },
};

export const gatewaySelectApplyExtension: WizardFieldApplyExtension<
  GatewaySelectFieldData,
  LLMdDeployment
> = {
  type: 'model-serving.deployment/wizard-field-apply',
  properties: {
    fieldId: 'llmd-serving/gateway',
    platform: SupportedArea.LLMD_SERVING,
    apply: () =>
      import('../src/wizardFields/gateway/gatewaySelectApplyExtract').then(
        (m) => m.applyGatewaySelectData,
      ),
  },
  flags: {
    required: [SupportedArea.LLMD_SERVING, SupportedArea.LLMD_GATEWAY_FIELD],
  },
};

export const gatewaySelectExtractorExtension: WizardFieldExtractorExtension<
  GatewaySelectFieldData,
  LLMdDeployment
> = {
  type: 'model-serving.deployment/wizard-field-extractor',
  properties: {
    fieldId: 'llmd-serving/gateway',
    platform: SupportedArea.LLMD_SERVING,
    extract: () =>
      import('../src/wizardFields/gateway/gatewaySelectApplyExtract').then(
        (m) => m.extractGatewaySelectData,
      ),
  },
  flags: {
    required: [SupportedArea.LLMD_SERVING, SupportedArea.LLMD_GATEWAY_FIELD],
  },
};

export const llmdTrackingPropertiesExtension: WizardTrackingPropertiesExtension<LLMdDeployment> = {
  type: 'model-serving.deployment/tracking-properties',
  properties: {
    platform: SupportedArea.LLMD_SERVING,
    getProperties: () =>
      import('../src/tracking/llmdWizardTracking').then(
        (m) => m.extractLlmdDeploymentTrackingProperties,
      ),
  },
  flags: {
    required: [SupportedArea.LLMD_SERVING],
  },
};

export const llmdOnlyDeploymentMethodExtractorExtension: WizardFieldExtractorExtension<
  { method: string },
  LLMdDeployment
> = {
  type: 'model-serving.deployment/wizard-field-extractor',
  properties: {
    fieldId: 'deploymentMethod',
    platform: SupportedArea.LLMD_SERVING,
    extract: () =>
      import('../src/deployments/model').then((m) => m.extractDeploymentMethodAlwaysLlmd),
  },
  flags: {
    required: [SupportedArea.LLMD_SERVING],
    disallowed: [SupportedArea.VLLM_ON_MAAS],
  },
};

export const lifecycleExtensions: LLMDServingExtension[] = [
  {
    type: 'app.area',
    properties: {
      id: SupportedArea.LLMD_SERVING,
      requiredComponents: [DataScienceStackComponent.K_SERVE],
      reliantAreas: [SupportedArea.MODEL_SERVING],
      featureFlags: ['disableLLMd'],
    },
  },
  {
    type: 'model-serving.platform/watch-deployments',
    properties: {
      platform: SupportedArea.LLMD_SERVING,
      watch: () =>
        import('../src/deployments/useWatchDeployments').then((m) => m.useWatchDeployments),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING],
    },
  },
  {
    type: 'model-serving.deployed-model/serving-runtime',
    properties: {
      platform: SupportedArea.LLMD_SERVING,
      dataHook: () =>
        import('../src/components/ServingDetails').then((m) => m.useServingDetailsData),
      ServingDetailsComponent: () =>
        import('../src/components/ServingDetails').then((m) => ({
          default: m.default,
        })),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING],
    },
  },
  {
    type: 'model-serving.deployment/form-data',
    properties: {
      platform: SupportedArea.LLMD_SERVING,
      isActive: true,
      priority: 0,
      extractHardwareProfileConfig: () =>
        import('../src/deployments/hardware').then((m) => m.extractHardwareProfileConfig),
      extractModelType: () => import('../src/deployments/model').then((m) => m.extractModelType),
      extractModelFormat: () =>
        import('../src/deployments/model').then((m) => m.extractModelFormat),
      extractReplicas: () => import('../src/deployments/hardware').then((m) => m.extractReplicas),
      extractRuntimeArgs: () =>
        import('../src/deployments/model').then((m) => m.extractRuntimeArgs),
      extractEnvironmentVariables: () =>
        import('../src/deployments/model').then((m) => m.extractEnvironmentVariables),
      extractHuggingFaceApiKey: () =>
        import('../src/hfTokenSecret').then(
          (m) => (deployment) => m.extractHuggingFaceApiKey(deployment.model),
        ),
      extractModelAvailabilityData: () =>
        import('../src/wizardFields/modelAvailability').then((m) => m.extractModelAvailabilityData),
      extractModelLocationData: () =>
        import('../src/deployments/model').then((m) => m.extractModelLocationData),
      extractModelServerTemplate: () =>
        import('../src/deployments/server').then((m) => m.extractModelServerTemplate),
      hardwareProfilePaths: () =>
        import('../src/deployments/hardware').then(
          (m) => m.LLMD_INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
        ),
      validateExtraction: () =>
        import('../src/deployments/validateExtraction').then((m) => m.validateExtraction),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING],
    },
  },
  {
    type: 'model-serving.platform/delete-deployment',
    properties: {
      platform: SupportedArea.LLMD_SERVING,
      onDelete: () => import('../src/api/LLMdDeployment').then((m) => m.deleteDeployment),
      title: 'Delete model deployment?',
      submitButtonLabel: 'Delete model deployment',
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING],
    },
  },
  {
    type: 'model-serving.deployment/deploy',
    properties: {
      platform: SupportedArea.LLMD_SERVING,
      priority: 100,
      supportsOverwrite: true,
      supportsDRAHardwareProfiles: true,
      isActive: () => import('../src/formUtils').then((m) => m.isLLMInferenceServiceActive),
      deploy: () => import('../src/deployments/deploy').then((m) => m.deployLLMdDeployment),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING],
    },
  },
  {
    type: 'model-serving.deployment/assemble-model-resource',
    properties: {
      platform: SupportedArea.LLMD_SERVING,
      priority: 100,
      isActive: () => import('../src/formUtils').then((m) => m.isLLMInferenceServiceActive),
      assemble: () => import('../src/deployments/deploy').then((m) => m.assembleLLMdDeployment),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING],
    },
  },
];

export const modelServerFieldOverride: LLMDServingExtension = {
  type: 'model-serving.deployment/wizard-field-override',
  properties: {
    platform: SupportedArea.LLMD_SERVING,
    field: () => import('../src/wizardFields/modelServerField').then((m) => m.modelServerField),
  },
  flags: {
    required: [SupportedArea.LLMD_SERVING],
    disallowed: [SupportedArea.VLLM_ON_MAAS],
  },
};

export const commonFieldOverrides: LLMDServingExtension[] = [
  {
    type: 'model-serving.deployment/wizard-field-override',
    properties: {
      platform: SupportedArea.LLMD_SERVING,
      field: () =>
        import('../src/wizardFields/advancedOptionsFields').then((m) => m.externalRouteField),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING],
    },
  },
  {
    type: 'model-serving.deployment/wizard-field-override',
    properties: {
      platform: SupportedArea.LLMD_SERVING,
      field: () =>
        import('../src/wizardFields/advancedOptionsFields').then((m) => m.tokenAuthField),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING],
    },
  },
  {
    type: 'model-serving.deployment/wizard-field-override',
    properties: {
      platform: SupportedArea.LLMD_SERVING,
      field: () =>
        import('../src/wizardFields/advancedOptionsFields').then((m) => m.deploymentStrategyField),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING],
    },
  },
];

export const llmdDeploymentMethodFieldOverride: LLMDServingExtension = {
  type: 'model-serving.deployment/wizard-field-override',
  properties: {
    platform: SupportedArea.LLMD_SERVING,
    field: () =>
      import('../src/wizardFields/deploymentMethodField').then(
        (m) => m.llmdDeploymentMethodOverride,
      ),
  },
  flags: {
    required: [SupportedArea.LLMD_SERVING],
  },
};

export const gatewayExtensions: LLMDServingExtension[] = [
  gatewaySelectFieldExtension,
  gatewaySelectApplyExtension,
  gatewaySelectExtractorExtension,
];

export const startStopAction: LLMDServingExtension = {
  type: 'model-serving.deployments-table/start-stop-action',
  flags: { required: [SupportedArea.LLMD_SERVING] },
  properties: {
    platform: SupportedArea.LLMD_SERVING,
    patchDeploymentStoppedStatus: () =>
      import('../src/deployments/status').then((m) => m.patchDeploymentStoppedStatus),
  },
};

const extensions: LLMDServingExtension[] = [
  ...lifecycleExtensions,
  modelServerFieldOverride,
  ...commonFieldOverrides,
  llmdDeploymentMethodFieldOverride,
  ...gatewayExtensions,
  llmdTrackingPropertiesExtension,
  llmdOnlyDeploymentMethodExtractorExtension,
  startStopAction,
];

export default extensions;
