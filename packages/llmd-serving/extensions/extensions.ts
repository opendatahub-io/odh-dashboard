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
  WizardFieldDeploymentFunctionsExtension,
} from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type {
  AreaExtension,
  HrefNavItemExtension,
  RouteExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import type { FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import type { LLMdDeployment, LLMInferenceServiceConfigKind } from '../src/types';
import type { LLMConfigOptionsFieldType } from '../src/wizardFields/LlmConfigOptionsField';
import type {
  TopologyTypeFieldData,
  TopologyTypeFieldType,
} from '../src/wizardFields/TopologyTypeField';
import type {
  CustomTopologyConfigFieldData,
  CustomTopologyConfigFieldType,
} from '../src/wizardFields/CustomTopologyConfigField';
import type {
  AdvancedRoutingFieldData,
  AdvancedRoutingFieldType,
} from '../src/wizardFields/AdvancedRoutingField';
import type {
  GatewaySelectFieldData,
  GatewaySelectFieldType,
} from '../src/wizardFields/gateway/GatewaySelectField';

export const LLMD_SERVING_ID = 'llmd-serving';
const ADMIN_USER = 'ADMIN_USER';

// Keep in sync with ../src/settings/llmAcceleratorConfigs/paths.ts (value imports are
// disallowed in extensions.ts). Pinned by __tests__/extensions.spec.ts.
const LLM_ACCELERATOR_CONFIGS_TAB_PATH =
  '/settings/model-resources-operations/model-deployment-settings/llm-accelerator-configurations';

// Keep in sync with ../src/settings/topologyConfigs/paths.ts (value imports are
// disallowed in extensions.ts). Pinned by __tests__/extensions.spec.ts.
const TOPOLOGY_CONFIGS_TAB_PATH =
  '/settings/model-resources-operations/model-deployment-settings/topology-configurations';

// Keep in sync with ../src/settings/routingConfigs/paths.ts (value imports are
// disallowed in extensions.ts). Pinned by __tests__/extensions.spec.ts.
const ROUTING_CONFIGS_TAB_PATH =
  '/settings/model-resources-operations/model-deployment-settings/routing-configurations';

// Base paths of the former standalone pages, kept only as redirect sources to the
// tabs above (the standalone pages themselves have been removed).
const LLM_ACCELERATOR_CONFIGS_STANDALONE_PATH =
  '/settings/model-resources-operations/llm-accelerator-configs';
const TOPOLOGY_CONFIGS_STANDALONE_PATH =
  '/settings/model-resources-operations/llmd-topology-configurations';
const ROUTING_CONFIGS_STANDALONE_PATH =
  '/settings/model-resources-operations/llmd-routing-configurations';

const createRedirectComponent = (args: { from: string; to: string }) => () =>
  import('@odh-dashboard/plugin-core/routing').then((module) => ({
    default: () => module.buildV2RedirectElement(args),
  }));

// When vLLMOnMaaS enabled + llmdTemplates disabled: show accelerator config for all llm-d (single-node fallback)
const llmConfigOptionsFieldExtensionNoTemplates: WizardFieldExtension<
  LLMConfigOptionsFieldType,
  LLMdDeployment
> = {
  type: 'model-serving.deployment/wizard-field',
  properties: {
    platform: LLMD_SERVING_ID,
    field: () =>
      import('../src/wizardFields/LlmConfigOptionsField').then(
        (m) => m.LLMConfigOptionsFieldNoTemplates,
      ),
  },
  flags: {
    required: [LLMD_SERVING_ID, SupportedArea.VLLM_ON_MAAS],
    disallowed: [SupportedArea.LLMD_TOPOLOGY_CONFIGS],
  },
};

// When vLLMOnMaaS enabled + llmdTemplates enabled: show accelerator config only for simple vLLM (non-llm-d)
const llmConfigOptionsFieldExtensionWithTemplates: WizardFieldExtension<
  LLMConfigOptionsFieldType,
  LLMdDeployment
> = {
  type: 'model-serving.deployment/wizard-field',
  properties: {
    platform: LLMD_SERVING_ID,
    field: () =>
      import('../src/wizardFields/LlmConfigOptionsField').then(
        (m) => m.LLMConfigOptionsFieldWithTemplates,
      ),
  },
  flags: {
    required: [LLMD_SERVING_ID, SupportedArea.VLLM_ON_MAAS, SupportedArea.LLMD_TOPOLOGY_CONFIGS],
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

// ───────────────────Topology Config Extensions ───────────────────

export type TopologyConfigsExtensionsType =
  // Topology type
  | WizardFieldExtension<TopologyTypeFieldType, LLMdDeployment>
  | WizardFieldApplyExtension<TopologyTypeFieldData, LLMdDeployment>
  | WizardFieldExtractorExtension<TopologyTypeFieldData, LLMdDeployment>
  // Topology config
  | WizardFieldExtension<CustomTopologyConfigFieldType, LLMdDeployment>
  | WizardFieldApplyExtension<CustomTopologyConfigFieldData, LLMdDeployment>
  | WizardFieldExtractorExtension<CustomTopologyConfigFieldData, LLMdDeployment>
  | WizardFieldDeploymentFunctionsExtension<CustomTopologyConfigFieldData, LLMdDeployment>
  // Router config
  | WizardFieldExtension<AdvancedRoutingFieldType, LLMdDeployment>
  | WizardFieldApplyExtension<AdvancedRoutingFieldData, LLMdDeployment>
  | WizardFieldExtractorExtension<AdvancedRoutingFieldData, LLMdDeployment>;

export const topologyConfigsExtensions: TopologyConfigsExtensionsType[] = [
  // ─── Topology type ──────────────────────────────────────────────────
  {
    type: 'model-serving.deployment/wizard-field',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () =>
        import('../src/wizardFields/TopologyTypeField').then((m) => m.TopologyTypeFieldWizardField),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING, SupportedArea.LLMD_TOPOLOGY_CONFIGS],
    },
  } satisfies WizardFieldExtension<TopologyTypeFieldType, LLMdDeployment>,
  {
    type: 'model-serving.deployment/wizard-field-apply',
    properties: {
      fieldId: 'llmd-serving/topology-type',
      platform: LLMD_SERVING_ID,
      apply: () => import('../src/deployments/topology').then((m) => m.applyTopologyType),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING, SupportedArea.LLMD_TOPOLOGY_CONFIGS],
    },
  } satisfies WizardFieldApplyExtension<TopologyTypeFieldData, LLMdDeployment>,
  {
    type: 'model-serving.deployment/wizard-field-extractor',
    properties: {
      fieldId: 'llmd-serving/topology-type',
      platform: LLMD_SERVING_ID,
      extract: () => import('../src/deployments/topology').then((m) => m.extractTopologyType),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING, SupportedArea.LLMD_TOPOLOGY_CONFIGS],
    },
  } satisfies WizardFieldExtractorExtension<TopologyTypeFieldData, LLMdDeployment>,
  // ─── Topology config ──────────────────────────────────────────────────
  {
    type: 'model-serving.deployment/wizard-field',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () =>
        import('../src/wizardFields/CustomTopologyConfigField').then(
          (m) => m.CustomTopologyConfigFieldWizardField,
        ),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING, SupportedArea.LLMD_TOPOLOGY_CONFIGS],
    },
  } satisfies WizardFieldExtension<CustomTopologyConfigFieldType, LLMdDeployment>,
  {
    type: 'model-serving.deployment/wizard-field-apply',
    properties: {
      fieldId: 'llmd-serving/custom-topology-config',
      platform: LLMD_SERVING_ID,
      apply: () => import('../src/deployments/topology').then((m) => m.applyTopologyConfig),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING, SupportedArea.LLMD_TOPOLOGY_CONFIGS],
    },
  } satisfies WizardFieldApplyExtension<CustomTopologyConfigFieldData, LLMdDeployment>,
  {
    type: 'model-serving.deployment/wizard-field-extractor',
    properties: {
      fieldId: 'llmd-serving/custom-topology-config',
      platform: LLMD_SERVING_ID,
      extract: () => import('../src/deployments/topology').then((m) => m.extractTopologyConfig),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING, SupportedArea.LLMD_TOPOLOGY_CONFIGS],
    },
  } satisfies WizardFieldExtractorExtension<CustomTopologyConfigFieldData, LLMdDeployment>,
  {
    type: 'model-serving.deployment/wizard-field-deployment-functions',
    properties: {
      fieldId: 'llmd-serving/custom-topology-config',
      platform: LLMD_SERVING_ID,
      preDeploy: () => import('../src/deployments/topology').then((m) => m.preDeployTopologyConfig),
      postDeploy: null,
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING, SupportedArea.LLMD_TOPOLOGY_CONFIGS],
    },
  },
  // ─── Router config ──────────────────────────────────────────────────
  {
    type: 'model-serving.deployment/wizard-field',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () =>
        import('../src/wizardFields/AdvancedRoutingField').then(
          (m) => m.AdvancedRoutingFieldWizardField,
        ),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING, SupportedArea.LLMD_TOPOLOGY_CONFIGS],
    },
  } satisfies WizardFieldExtension<AdvancedRoutingFieldType, LLMdDeployment>,
  {
    type: 'model-serving.deployment/wizard-field-apply',
    properties: {
      fieldId: 'llmd-serving/advanced-routing',
      platform: LLMD_SERVING_ID,
      apply: () => import('../src/deployments/topology').then((m) => m.applyRoutingConfig),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING, SupportedArea.LLMD_TOPOLOGY_CONFIGS],
    },
  } satisfies WizardFieldApplyExtension<AdvancedRoutingFieldData, LLMdDeployment>,
  {
    type: 'model-serving.deployment/wizard-field-extractor',
    properties: {
      fieldId: 'llmd-serving/advanced-routing',
      platform: LLMD_SERVING_ID,
      extract: () => import('../src/deployments/topology').then((m) => m.extractRoutingConfig),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING, SupportedArea.LLMD_TOPOLOGY_CONFIGS],
    },
  } satisfies WizardFieldExtractorExtension<AdvancedRoutingFieldData, LLMdDeployment>,
];

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
  | WizardFieldApplyExtension<TopologyTypeFieldData, LLMdDeployment>
  | WizardFieldExtractorExtension<TopologyTypeFieldData, LLMdDeployment>
  | WizardFieldApplyExtension<CustomTopologyConfigFieldData, LLMdDeployment>
  | WizardFieldExtractorExtension<CustomTopologyConfigFieldData, LLMdDeployment>
  | WizardFieldApplyExtension<AdvancedRoutingFieldData, LLMdDeployment>
  | WizardFieldExtractorExtension<AdvancedRoutingFieldData, LLMdDeployment>
  | WizardFieldApplyExtension<GatewaySelectFieldData, LLMdDeployment>
  | WizardFieldExtractorExtension<GatewaySelectFieldData, LLMdDeployment>
  | WizardFieldExtractorExtension<{ method: string }, LLMdDeployment>
  | TopologyConfigsExtensionsType
  | HrefNavItemExtension
  | RouteExtension
  | TabRouteTabExtension
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
  llmConfigOptionsFieldExtensionNoTemplates,
  llmConfigOptionsFieldExtensionWithTemplates,
  ...topologyConfigsExtensions,
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
  // Redirects from old standalone URLs to tabs on the model deployment settings page.
  // The accelerator, topology, and routing standalone pages are gone; each redirect
  // is reachable whenever the tab's own feature areas are enabled.
  {
    type: 'app.route',
    flags: {
      required: [LLMD_SERVING_ID, ADMIN_USER, SupportedArea.VLLM_ON_MAAS],
    },
    properties: {
      path: `${LLM_ACCELERATOR_CONFIGS_STANDALONE_PATH}/*`,
      component: createRedirectComponent({
        from: `${LLM_ACCELERATOR_CONFIGS_STANDALONE_PATH}/*`,
        to: `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/*`,
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.LLMD_TOPOLOGY_CONFIGS, ADMIN_USER],
    },
    properties: {
      path: `${TOPOLOGY_CONFIGS_STANDALONE_PATH}/*`,
      component: createRedirectComponent({
        from: `${TOPOLOGY_CONFIGS_STANDALONE_PATH}/*`,
        to: `${TOPOLOGY_CONFIGS_TAB_PATH}/*`,
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.LLMD_TOPOLOGY_CONFIGS, ADMIN_USER],
    },
    properties: {
      path: `${ROUTING_CONFIGS_STANDALONE_PATH}/*`,
      component: createRedirectComponent({
        from: `${ROUTING_CONFIGS_STANDALONE_PATH}/*`,
        to: `${ROUTING_CONFIGS_TAB_PATH}/*`,
      }),
    },
  },
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [LLMD_SERVING_ID, ADMIN_USER, SupportedArea.VLLM_ON_MAAS],
    },
    properties: {
      pageId: 'model-deployment-settings',
      id: 'llm-accelerator-configurations',
      title: 'LLM accelerator configurations',
      component: () =>
        import('../src/settings/llmAcceleratorConfigs/LlmAcceleratorConfigTabRoutes'),
      group: '3_accelerator',
    },
  },
  // Full-page breakout routes for the accelerator configuration forms. Registered
  // separately from the tab so the forms render without the tabbed page chrome.
  // Each form path is listed explicitly so the tab list route is not captured.
  ...(
    [
      `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/add`,
      `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/edit/:configName`,
      `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/duplicate/:configName`,
    ] as const
  ).map(
    (path): RouteExtension => ({
      type: 'app.route',
      flags: {
        required: [LLMD_SERVING_ID, ADMIN_USER, SupportedArea.VLLM_ON_MAAS],
      },
      properties: {
        path,
        component: () =>
          import('../src/settings/llmAcceleratorConfigs/LlmAcceleratorConfigFormRoutes'),
      },
    }),
  ),
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [SupportedArea.LLMD_TOPOLOGY_CONFIGS, ADMIN_USER],
    },
    properties: {
      pageId: 'model-deployment-settings',
      id: 'topology-configurations',
      title: 'llm-d topology configurations',
      component: () => import('../src/settings/topologyConfigs/TopologyConfigTabRoutes'),
      group: '4_topology',
    },
  },
  // Full-page breakout routes for the topology configuration forms. Registered
  // separately from the tab so the forms render without the tabbed page chrome.
  // Each form path is listed explicitly so the tab list route is not captured.
  ...(
    [
      `${TOPOLOGY_CONFIGS_TAB_PATH}/add/:topologyType`,
      `${TOPOLOGY_CONFIGS_TAB_PATH}/edit/:configName`,
      `${TOPOLOGY_CONFIGS_TAB_PATH}/duplicate/:configName`,
    ] as const
  ).map(
    (path): RouteExtension => ({
      type: 'app.route',
      flags: {
        required: [SupportedArea.LLMD_TOPOLOGY_CONFIGS, ADMIN_USER],
      },
      properties: {
        path,
        component: () => import('../src/settings/topologyConfigs/TopologyConfigFormRoutes'),
      },
    }),
  ),
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [SupportedArea.LLMD_TOPOLOGY_CONFIGS, ADMIN_USER],
    },
    properties: {
      pageId: 'model-deployment-settings',
      id: 'routing-configurations',
      title: 'llm-d routing configurations',
      component: () => import('../src/settings/routingConfigs/RoutingConfigTabRoutes'),
      group: '5_routing',
    },
  },
  // Full-page breakout routes for the routing configuration forms. Registered
  // separately from the tab so the forms render without the tabbed page chrome.
  // Each form path is listed explicitly so the tab list route is not captured.
  ...(
    [
      `${ROUTING_CONFIGS_TAB_PATH}/add`,
      `${ROUTING_CONFIGS_TAB_PATH}/edit/:configName`,
      `${ROUTING_CONFIGS_TAB_PATH}/duplicate/:configName`,
    ] as const
  ).map(
    (path): RouteExtension => ({
      type: 'app.route',
      flags: {
        required: [SupportedArea.LLMD_TOPOLOGY_CONFIGS, ADMIN_USER],
      },
      properties: {
        path,
        component: () => import('../src/settings/routingConfigs/RoutingConfigFormRoutes'),
      },
    }),
  ),
];

export default extensions;
