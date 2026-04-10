import type {
  DeployedModelServingDetails,
  DeploymentWizardFieldExtension,
  ModelServingDeploy,
  ModelServingDeploymentFormDataExtension,
  ModelServingPlatformWatchDeploymentsExtension,
  ModelServingDeleteModal,
  ModelServingDeploymentTransformExtension,
  ModelServingStartStopAction,
  AssembleModelResourceExtension,
  WizardField2Extension,
  WizardFieldApplyExtension,
  WizardFieldExtractorExtension,
} from '@odh-dashboard/model-serving/extension-points';
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import type { AreaExtension } from '@odh-dashboard/plugin-core/extension-points';
import type { FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import type { LLMdDeployment, LLMInferenceServiceConfigKind } from '../src/types';
import type { LLMConfigOptionsFieldType } from '../src/wizardFields/LlmConfigOptionsField';
import type {
  GatewaySelectFieldData,
  GatewaySelectFieldType,
} from '../src/wizardFields/gateway/GatewaySelectField';

export const LLMD_SERVING_ID = 'llmd-serving';

const llmConfigOptionsFieldExtension: WizardField2Extension<
  LLMConfigOptionsFieldType,
  LLMdDeployment
> = {
  type: 'model-serving.deployment/wizard-field2',
  properties: {
    platform: LLMD_SERVING_ID,
    field: () =>
      import('../src/wizardFields/LlmConfigOptionsField').then(
        (m) => m.LLMConfigOptionsFieldWizardField,
      ),
  },
  flags: {
    required: [LLMD_SERVING_ID, SupportedArea.VLLM_ON_MAAS],
  },
};

const gatewaySelectFieldExtension: WizardField2Extension<GatewaySelectFieldType, LLMdDeployment> = {
  type: 'model-serving.deployment/wizard-field2',
  properties: {
    platform: LLMD_SERVING_ID,
    field: () =>
      import('../src/wizardFields/gateway/GatewaySelectField').then((m) => m.GatewaySelectField),
  },
  flags: {
    required: [LLMD_SERVING_ID, SupportedArea.LLMD_GATEWAY_FIELD],
  },
};

const gatewaySelectApplyExtension: WizardFieldApplyExtension<
  GatewaySelectFieldData,
  LLMdDeployment
> = {
  type: 'model-serving.deployment/wizard-field-apply',
  properties: {
    fieldId: 'llmd-serving/gateway',
    platform: LLMD_SERVING_ID,
    apply: () =>
      import('../src/wizardFields/gateway/gatewaySelectApplyExtract').then(
        (m) => m.applyGatewaySelectData,
      ),
  },
  flags: {
    required: [LLMD_SERVING_ID, SupportedArea.LLMD_GATEWAY_FIELD],
  },
};

const gatewaySelectExtractorExtension: WizardFieldExtractorExtension<
  GatewaySelectFieldData,
  LLMdDeployment
> = {
  type: 'model-serving.deployment/wizard-field-extractor',
  properties: {
    fieldId: 'llmd-serving/gateway',
    platform: LLMD_SERVING_ID,
    extract: () =>
      import('../src/wizardFields/gateway/gatewaySelectApplyExtract').then(
        (m) => m.extractGatewaySelectData,
      ),
  },
  flags: {
    required: [LLMD_SERVING_ID, SupportedArea.LLMD_GATEWAY_FIELD],
  },
};

const extensions: (
  | AreaExtension
  | ModelServingPlatformWatchDeploymentsExtension<LLMdDeployment>
  | DeployedModelServingDetails<LLMdDeployment, FetchStateObject<LLMInferenceServiceConfigKind[]>>
  | ModelServingDeploymentFormDataExtension<LLMdDeployment>
  | ModelServingDeleteModal<LLMdDeployment>
  | ModelServingDeploy<LLMdDeployment>
  | AssembleModelResourceExtension<LLMdDeployment>
  | DeploymentWizardFieldExtension<LLMdDeployment>
  | ModelServingDeploymentTransformExtension<LLMdDeployment>
  | ModelServingStartStopAction<LLMdDeployment>
  | WizardField2Extension<LLMConfigOptionsFieldType, LLMdDeployment>
  | WizardField2Extension<GatewaySelectFieldType, LLMdDeployment>
  | WizardFieldApplyExtension<GatewaySelectFieldData, LLMdDeployment>
  | WizardFieldExtractorExtension<GatewaySelectFieldData, LLMdDeployment>
)[] = [
  {
    type: 'app.area',
    properties: {
      id: LLMD_SERVING_ID,
      reliantAreas: [SupportedArea.K_SERVE],
      featureFlags: ['disableLLMd'],
    },
  },
  {
    type: 'model-serving.platform/watch-deployments',
    properties: {
      platform: LLMD_SERVING_ID,
      watch: () =>
        import('../src/deployments/useWatchDeployments').then((m) => m.useWatchDeployments),
    },
    flags: {
      required: [LLMD_SERVING_ID],
    },
  },
  {
    type: 'model-serving.deployed-model/serving-runtime',
    properties: {
      platform: LLMD_SERVING_ID,
      dataHook: () =>
        import('../src/components/ServingDetails').then((m) => m.useServingDetailsData),
      ServingDetailsComponent: () =>
        import('../src/components/ServingDetails').then((m) => ({
          default: m.default,
        })),
    },
    flags: {
      required: [LLMD_SERVING_ID],
    },
  },
  {
    type: 'model-serving.deployment/form-data',
    properties: {
      platform: LLMD_SERVING_ID,
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
      required: [LLMD_SERVING_ID],
    },
  },
  {
    type: 'model-serving.platform/delete-deployment',
    properties: {
      platform: LLMD_SERVING_ID,
      onDelete: () => import('../src/api/LLMdDeployment').then((m) => m.deleteDeployment),
      title: 'Delete model deployment?',
      submitButtonLabel: 'Delete model deployment',
    },
    flags: {
      required: [LLMD_SERVING_ID],
    },
  },
  {
    type: 'model-serving.deployment/deploy',
    properties: {
      platform: LLMD_SERVING_ID,
      priority: 100,
      supportsOverwrite: true,
      isActive: () => import('../src/formUtils').then((m) => m.isLLMInferenceServiceActive),
      deploy: () => import('../src/deployments/deploy').then((m) => m.deployLLMdDeployment),
    },
    flags: {
      required: [LLMD_SERVING_ID],
    },
  },
  {
    type: 'model-serving.deployment/assemble-model-resource',
    properties: {
      platform: LLMD_SERVING_ID,
      priority: 100,
      isActive: () => import('../src/formUtils').then((m) => m.isLLMInferenceServiceActive),
      assemble: () => import('../src/deployments/deploy').then((m) => m.assembleLLMdDeployment),
    },
    flags: {
      required: [LLMD_SERVING_ID],
    },
  },
  {
    type: 'model-serving.deployment/wizard-field',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () => import('../src/wizardFields/modelServerField').then((m) => m.modelServerField),
    },
    flags: {
      required: [LLMD_SERVING_ID],
    },
  },
  {
    type: 'model-serving.deployment/wizard-field',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () =>
        import('../src/wizardFields/modelAvailability').then((m) => m.modelAvailabilityField),
    },
    flags: {
      required: ['model-as-service', LLMD_SERVING_ID],
    },
  },
  {
    type: 'model-serving.deployment/wizard-field',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () =>
        import('../src/wizardFields/advancedOptionsFields').then((m) => m.externalRouteField),
    },
    flags: {
      required: [LLMD_SERVING_ID],
    },
  },
  {
    type: 'model-serving.deployment/wizard-field',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () =>
        import('../src/wizardFields/advancedOptionsFields').then((m) => m.tokenAuthField),
    },
    flags: {
      required: [LLMD_SERVING_ID],
    },
  },
  {
    type: 'model-serving.deployment/wizard-field',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () =>
        import('../src/wizardFields/advancedOptionsFields').then((m) => m.deploymentStrategyField),
    },
    flags: {
      required: [LLMD_SERVING_ID],
    },
  },
  llmConfigOptionsFieldExtension,
  gatewaySelectFieldExtension,
  gatewaySelectApplyExtension,
  gatewaySelectExtractorExtension,
  {
    type: 'model-serving.deployments-table/start-stop-action',
    properties: {
      platform: LLMD_SERVING_ID,
      patchDeploymentStoppedStatus: () =>
        import('../src/deployments/status').then((m) => m.patchDeploymentStoppedStatus),
    },
  },
];

export default extensions;
