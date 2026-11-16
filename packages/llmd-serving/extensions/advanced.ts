import type {
  WizardFieldExtension,
  WizardFieldApplyExtension,
  WizardFieldExtractorExtension,
  WizardFieldDeploymentFunctionsExtension,
} from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { LLMDServingExtension, TopologyConfigsExtensionsType } from './types';
import type { LLMdDeployment, TopologyTypeFieldData } from '../src/types';
import type { LLMConfigOptionsFieldType } from '../src/wizardFields/LlmConfigOptionsField';
import type { TopologyTypeFieldType } from '../src/wizardFields/TopologyTypeField';
import type {
  CustomTopologyConfigFieldData,
  CustomTopologyConfigFieldType,
} from '../src/wizardFields/CustomTopologyConfigField';
import type {
  AdvancedRoutingFieldData,
  AdvancedRoutingFieldType,
} from '../src/wizardFields/AdvancedRoutingField';
import type {
  AcceleratorConfigFieldData,
  AcceleratorConfigFieldType,
} from '../src/wizardFields/AcceleratorConfigField';
// Simple vLLM only — llm-d uses AcceleratorConfigField (avoids duplicate fields when
// llmdTemplates is off).
export const llmConfigOptionsFieldExtension: WizardFieldExtension<
  LLMConfigOptionsFieldType,
  LLMdDeployment
> = {
  type: 'model-serving.deployment/wizard-field',
  properties: {
    platform: SupportedArea.LLMD_SERVING,
    field: () =>
      import('../src/wizardFields/LlmConfigOptionsField').then(
        (m) => m.LLMConfigOptionsFieldWizardField,
      ),
  },
  flags: {
    required: [SupportedArea.LLMD_SERVING, SupportedArea.VLLM_ON_MAAS],
  },
};

export const topologyConfigsExtensions: TopologyConfigsExtensionsType[] = [
  // ─── Topology type ──────────────────────────────────────────────────
  {
    type: 'model-serving.deployment/wizard-field',
    properties: {
      platform: SupportedArea.LLMD_SERVING,
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
      platform: SupportedArea.LLMD_SERVING,
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
      platform: SupportedArea.LLMD_SERVING,
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
      platform: SupportedArea.LLMD_SERVING,
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
      platform: SupportedArea.LLMD_SERVING,
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
      platform: SupportedArea.LLMD_SERVING,
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
      platform: SupportedArea.LLMD_SERVING,
      preDeploy: () => import('../src/deployments/topology').then((m) => m.preDeployTopologyConfig),
      postDeploy: null,
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING, SupportedArea.LLMD_TOPOLOGY_CONFIGS],
    },
  } satisfies WizardFieldDeploymentFunctionsExtension<
    CustomTopologyConfigFieldData,
    LLMdDeployment
  >,
  // ─── Router config ──────────────────────────────────────────────────
  {
    type: 'model-serving.deployment/wizard-field',
    properties: {
      platform: SupportedArea.LLMD_SERVING,
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
      platform: SupportedArea.LLMD_SERVING,
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
      platform: SupportedArea.LLMD_SERVING,
      extract: () => import('../src/deployments/topology').then((m) => m.extractRoutingConfig),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING, SupportedArea.LLMD_TOPOLOGY_CONFIGS],
    },
  } satisfies WizardFieldExtractorExtension<AdvancedRoutingFieldData, LLMdDeployment>,
  // ─── Inference service config ─────────────────────────────
  {
    type: 'model-serving.deployment/wizard-field',
    properties: {
      platform: SupportedArea.LLMD_SERVING,
      field: () =>
        import('../src/wizardFields/AcceleratorConfigField').then(
          (m) => m.AcceleratorConfigFieldWizardField,
        ),
    },
    flags: { required: [SupportedArea.LLMD_SERVING, SupportedArea.VLLM_ON_MAAS] },
  } satisfies WizardFieldExtension<AcceleratorConfigFieldType, LLMdDeployment>,
  {
    type: 'model-serving.deployment/wizard-field-apply',
    properties: {
      fieldId: 'llmd-serving/accelerator-config',
      platform: SupportedArea.LLMD_SERVING,
      apply: () => import('../src/deployments/accelerator').then((m) => m.applyAcceleratorConfig),
    },
    flags: { required: [SupportedArea.LLMD_SERVING, SupportedArea.VLLM_ON_MAAS] },
  } satisfies WizardFieldApplyExtension<AcceleratorConfigFieldData, LLMdDeployment>,
  {
    type: 'model-serving.deployment/wizard-field-extractor',
    properties: {
      fieldId: 'llmd-serving/accelerator-config',
      platform: SupportedArea.LLMD_SERVING,
      extract: () =>
        import('../src/deployments/accelerator').then((m) => m.extractAcceleratorConfig),
    },
    flags: { required: [SupportedArea.LLMD_SERVING, SupportedArea.VLLM_ON_MAAS] },
  } satisfies WizardFieldExtractorExtension<AcceleratorConfigFieldData, LLMdDeployment>,
  {
    type: 'model-serving.deployment/wizard-field-deployment-functions',
    properties: {
      fieldId: 'llmd-serving/accelerator-config',
      platform: SupportedArea.LLMD_SERVING,
      preDeploy: () =>
        import('../src/deployments/accelerator').then((m) => m.preDeployAcceleratorConfig),
      postDeploy: null,
    },
    flags: { required: [SupportedArea.LLMD_SERVING, SupportedArea.VLLM_ON_MAAS] },
  } satisfies WizardFieldDeploymentFunctionsExtension<AcceleratorConfigFieldData, LLMdDeployment>,
];

export const deploymentMethodExtractorExtensionvLLMOnMaaS: WizardFieldExtractorExtension<
  { method: string },
  LLMdDeployment
> = {
  type: 'model-serving.deployment/wizard-field-extractor',
  properties: {
    fieldId: 'deploymentMethod',
    platform: SupportedArea.LLMD_SERVING,
    extract: () =>
      import('../src/deployments/model').then((m) => m.extractDeploymentMethodvLLMOnMaaS),
  },
  flags: {
    required: [SupportedArea.LLMD_SERVING, SupportedArea.VLLM_ON_MAAS],
  },
};

export const modelAvailabilityFieldOverride: LLMDServingExtension = {
  type: 'model-serving.deployment/wizard-field-override',
  properties: {
    platform: SupportedArea.LLMD_SERVING,
    field: () =>
      import('../src/wizardFields/modelAvailability').then((m) => m.modelAvailabilityField),
  },
  flags: {
    required: ['model-as-service', SupportedArea.LLMD_SERVING],
  },
};

export const vllmDeploymentMethodFieldOverride: LLMDServingExtension = {
  type: 'model-serving.deployment/wizard-field-override',
  properties: {
    platform: SupportedArea.LLMD_SERVING,
    field: () =>
      import('../src/wizardFields/deploymentMethodField').then(
        (m) => m.vllmDeploymentMethodOverride,
      ),
  },
  flags: {
    required: [SupportedArea.LLMD_SERVING, SupportedArea.VLLM_ON_MAAS],
  },
};

export const startStopAction: LLMDServingExtension = {
  type: 'model-serving.deployments-table/start-stop-action',
  properties: {
    platform: SupportedArea.LLMD_SERVING,
    patchDeploymentStoppedStatus: () =>
      import('../src/deployments/status').then((m) => m.patchDeploymentStoppedStatus),
  },
};
