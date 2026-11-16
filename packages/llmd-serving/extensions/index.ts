import {
  lifecycleExtensions,
  modelServerFieldOverride,
  commonFieldOverrides,
  llmdDeploymentMethodFieldOverride,
  gatewayExtensions,
  llmdTrackingPropertiesExtension,
  deploymentMethodExtractorExtensionLllmdOnly,
} from './deployments';
import {
  modelAvailabilityFieldOverride,
  vllmDeploymentMethodFieldOverride,
  llmConfigOptionsFieldExtension,
  topologyConfigsExtensions,
  deploymentMethodExtractorExtensionvLLMOnMaaS,
  startStopAction,
} from './advanced';
import settingsExtensions from './settings';
import type { LLMDServingExtension } from './types';

const extensions: LLMDServingExtension[] = [
  ...lifecycleExtensions,
  modelServerFieldOverride,
  modelAvailabilityFieldOverride,
  ...commonFieldOverrides,
  vllmDeploymentMethodFieldOverride,
  llmdDeploymentMethodFieldOverride,
  llmConfigOptionsFieldExtension,
  ...topologyConfigsExtensions,
  ...gatewayExtensions,
  llmdTrackingPropertiesExtension,
  deploymentMethodExtractorExtensionLllmdOnly,
  deploymentMethodExtractorExtensionvLLMOnMaaS,
  startStopAction,
  ...settingsExtensions,
];
export default extensions;
