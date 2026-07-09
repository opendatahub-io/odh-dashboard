import type {
  DeployedModelServingDetails,
  ModelServingPlatformWatchDeploymentsExtension,
  ModelServingDeleteModal,
  ModelServingStartStopAction,
} from '@odh-dashboard/model-serving/extension-points';
import type {
  WizardFieldExtension,
  WizardFieldApplyExtension,
  WizardFieldExtractorExtension,
  ModelServingDeploymentFormDataExtension,
  ModelServingDeploy,
  AssembleModelResourceExtension,
  DeploymentWizardFieldOverrideExtension,
  ModelServingDeploymentTransformExtension,
} from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type {
  AreaExtension,
  HrefNavItemExtension,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import type { FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import type { LLMdDeployment, LLMInferenceServiceConfigKind } from '../src/types';
import type { LLMConfigOptionsFieldType } from '../src/wizardFields/LlmConfigOptionsField';
import type { TopologyTypeFieldType } from '../src/wizardFields/TopologyTypeField';
import type { CustomTopologyConfigFieldType } from '../src/wizardFields/CustomTopologyConfigField';
import type { AdvancedRoutingFieldType } from '../src/wizardFields/AdvancedRoutingField';
import type {
  GatewaySelectFieldData,
  GatewaySelectFieldType,
} from '../src/wizardFields/gateway/GatewaySelectField';

export const LLMD_SERVING_ID = 'llmd-serving';
const ADMIN_USER = 'ADMIN_USER';

const llmConfigOptionsFieldExtension: WizardFieldExtension<
  LLMConfigOptionsFieldType,
  LLMdDeployment
> = {
  type: 'model-serving.deployment/wizard-field',
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

const topologyTypeFieldExtension: WizardFieldExtension<TopologyTypeFieldType, LLMdDeployment> = {
  type: 'model-serving.deployment/wizard-field',
  properties: {
    platform: LLMD_SERVING_ID,
    field: () =>
      import('../src/wizardFields/TopologyTypeField').then((m) => m.TopologyTypeFieldWizardField),
  },
  flags: {
    required: [LLMD_SERVING_ID, SupportedArea.LLMD_TOPOLOGY_CONFIGS],
  },
};

const customTopologyConfigFieldExtension: WizardFieldExtension<
  CustomTopologyConfigFieldType,
  LLMdDeployment
> = {
  type: 'model-serving.deployment/wizard-field',
  properties: {
    platform: LLMD_SERVING_ID,
    field: () =>
      import('../src/wizardFields/CustomTopologyConfigField').then(
        (m) => m.CustomTopologyConfigFieldWizardField,
      ),
  },
  flags: {
    required: [LLMD_SERVING_ID, SupportedArea.LLMD_TOPOLOGY_CONFIGS],
  },
};

const advancedRoutingFieldExtension: WizardFieldExtension<
  AdvancedRoutingFieldType,
  LLMdDeployment
> = {
  type: 'model-serving.deployment/wizard-field',
  properties: {
    platform: LLMD_SERVING_ID,
    field: () =>
      import('../src/wizardFields/AdvancedRoutingField').then(
        (m) => m.AdvancedRoutingFieldWizardField,
      ),
  },
  flags: {
    required: [LLMD_SERVING_ID, SupportedArea.LLMD_TOPOLOGY_CONFIGS],
  },
};

const gatewaySelectFieldExtension: WizardFieldExtension<GatewaySelectFieldType, LLMdDeployment> = {
  type: 'model-serving.deployment/wizard-field',
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

const deploymentMethodExtractorExtensionLllmdOnly: WizardFieldExtractorExtension<
  { method: string },
  LLMdDeployment
> = {
  type: 'model-serving.deployment/wizard-field-extractor',
  properties: {
    fieldId: 'deploymentMethod',
    platform: LLMD_SERVING_ID,
    extract: () =>
      import('../src/deployments/model').then((m) => m.extractDeploymentMethodAlwaysLlmd),
  },
  flags: {
    required: [LLMD_SERVING_ID],
    disallowed: [SupportedArea.VLLM_ON_MAAS],
  },
};
const deploymentMethodExtractorExtensionvLLMOnMaaS: WizardFieldExtractorExtension<
  { method: string },
  LLMdDeployment
> = {
  type: 'model-serving.deployment/wizard-field-extractor',
  properties: {
    fieldId: 'deploymentMethod',
    platform: LLMD_SERVING_ID,
    extract: () =>
      import('../src/deployments/model').then((m) => m.extractDeploymentMethodvLLMOnMaaS),
  },
  flags: {
    required: [LLMD_SERVING_ID, SupportedArea.VLLM_ON_MAAS],
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
  | DeploymentWizardFieldOverrideExtension<LLMdDeployment>
  | ModelServingDeploymentTransformExtension<LLMdDeployment>
  | ModelServingStartStopAction<LLMdDeployment>
  | WizardFieldExtension<LLMConfigOptionsFieldType, LLMdDeployment>
  | WizardFieldExtension<TopologyTypeFieldType, LLMdDeployment>
  | WizardFieldExtension<CustomTopologyConfigFieldType, LLMdDeployment>
  | WizardFieldExtension<AdvancedRoutingFieldType, LLMdDeployment>
  | WizardFieldExtension<GatewaySelectFieldType, LLMdDeployment>
  | WizardFieldApplyExtension<GatewaySelectFieldData, LLMdDeployment>
  | WizardFieldExtractorExtension<GatewaySelectFieldData, LLMdDeployment>
  | WizardFieldExtractorExtension<{ method: string }, LLMdDeployment>
  | HrefNavItemExtension
  | RouteExtension
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
    type: 'model-serving.deployment/wizard-field-override',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () => import('../src/wizardFields/modelServerField').then((m) => m.modelServerField),
    },
    flags: {
      required: [LLMD_SERVING_ID],
      disallowed: [SupportedArea.VLLM_ON_MAAS],
    },
  },
  {
    type: 'model-serving.deployment/wizard-field-override',
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
    type: 'model-serving.deployment/wizard-field-override',
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
    type: 'model-serving.deployment/wizard-field-override',
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
    type: 'model-serving.deployment/wizard-field-override',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () =>
        import('../src/wizardFields/advancedOptionsFields').then((m) => m.deploymentStrategyField),
    },
    flags: {
      required: [LLMD_SERVING_ID],
    },
  },
  {
    type: 'model-serving.deployment/wizard-field-override',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () =>
        import('../src/wizardFields/deploymentMethodField').then(
          (m) => m.vllmDeploymentMethodOverride,
        ),
    },
    flags: {
      required: [LLMD_SERVING_ID, SupportedArea.VLLM_ON_MAAS],
    },
  },
  {
    type: 'model-serving.deployment/wizard-field-override',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () =>
        import('../src/wizardFields/deploymentMethodField').then(
          (m) => m.llmdDeploymentMethodOverride,
        ),
    },
    flags: {
      required: [LLMD_SERVING_ID],
    },
  },
  llmConfigOptionsFieldExtension,
  topologyTypeFieldExtension,
  customTopologyConfigFieldExtension,
  advancedRoutingFieldExtension,
  gatewaySelectFieldExtension,
  gatewaySelectApplyExtension,
  gatewaySelectExtractorExtension,
  deploymentMethodExtractorExtensionLllmdOnly,
  deploymentMethodExtractorExtensionvLLMOnMaaS,
  {
    type: 'model-serving.deployments-table/start-stop-action',
    properties: {
      platform: LLMD_SERVING_ID,
      patchDeploymentStoppedStatus: () =>
        import('../src/deployments/status').then((m) => m.patchDeploymentStoppedStatus),
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [LLMD_SERVING_ID, ADMIN_USER],
    },
    properties: {
      id: 'settings-llm-accelerator-configs',
      title: 'LLM accelerator configurations',
      href: '/settings/model-resources-operations/llm-accelerator-configs',
      section: 'settings-model-resources-and-operations',
      path: '/settings/model-resources-operations/llm-accelerator-configs/*',
      group: '1_model-resources',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [LLMD_SERVING_ID, ADMIN_USER],
    },
    properties: {
      path: '/settings/model-resources-operations/llm-accelerator-configs/*',
      component: () => import('../src/admin/LlmAcceleratorConfigRoutes'),
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.LLMD_TOPOLOGY_CONFIGS, ADMIN_USER],
    },
    properties: {
      id: 'settings-llmd-topology-configurations',
      title: 'llm-d topology configurations',
      href: '/settings/model-resources-operations/llmd-topology-configurations',
      section: 'settings-model-resources-and-operations',
      path: '/settings/model-resources-operations/llmd-topology-configurations/*',
      group: '2_model-resources',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.LLMD_TOPOLOGY_CONFIGS, ADMIN_USER],
    },
    properties: {
      path: '/settings/model-resources-operations/llmd-topology-configurations/*',
      component: () => import('../src/settings/TopologyConfigurationsRoutes'),
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.LLMD_TOPOLOGY_CONFIGS, ADMIN_USER],
    },
    properties: {
      id: 'settings-llmd-routing-configurations',
      title: 'llm-d routing configurations',
      href: '/settings/model-resources-operations/llmd-routing-configurations',
      section: 'settings-model-resources-and-operations',
      path: '/settings/model-resources-operations/llmd-routing-configurations/*',
      group: '2_model-resources',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.LLMD_TOPOLOGY_CONFIGS, ADMIN_USER],
    },
    properties: {
      path: '/settings/model-resources-operations/llmd-routing-configurations/*',
      component: () => import('../src/settings/RoutingConfigurationsRoutes'),
    },
  },
];

export default extensions;
