import type {
  DeployedModelServingDetails,
  ModelServingPlatformWatchDeploymentsExtension,
  ModelServingDeleteModal,
  ModelServingStartStopAction,
} from '@odh-dashboard/model-serving/extension-points';
import type { RuntimeImageInstallTargetExtension } from '@odh-dashboard/model-serving/extension-points/runtime-image-install-target';
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
  WizardTrackingPropertiesExtension,
} from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
import type {
  AreaExtension,
  ConnectionsConnectedResourcesExtension,
  HrefNavItemExtension,
  RouteExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import type { FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import type { LLMdConnectionsResourcesData } from '../src/connections/connectedResources';
import type {
  LLMdDeployment,
  LLMInferenceServiceConfigKind,
  TopologyTypeFieldData,
} from '../src/types';
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
  GatewaySelectFieldData,
  GatewaySelectFieldType,
} from '../src/wizardFields/gateway/GatewaySelectField';
import type {
  AcceleratorConfigFieldData,
  AcceleratorConfigFieldType,
} from '../src/wizardFields/AcceleratorConfigField';

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
  | WizardFieldExtractorExtension<AdvancedRoutingFieldData, LLMdDeployment>
  // Inference service config
  | WizardFieldExtension<AcceleratorConfigFieldType, LLMdDeployment>
  | WizardFieldApplyExtension<AcceleratorConfigFieldData, LLMdDeployment>
  | WizardFieldExtractorExtension<AcceleratorConfigFieldData, LLMdDeployment>
  | WizardFieldDeploymentFunctionsExtension<AcceleratorConfigFieldData, LLMdDeployment>;

export type LLMDServingExtension =
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
  | WizardTrackingPropertiesExtension<LLMdDeployment>
  | TopologyConfigsExtensionsType
  | HrefNavItemExtension
  | RouteExtension
  | TabRouteTabExtension
  | ConnectionsConnectedResourcesExtension<LLMdConnectionsResourcesData>
  | RuntimeImageInstallTargetExtension;
