import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
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
  {
    type: 'app.connections/connected-resources',
    properties: {
      useConnectedResources: () =>
        import('../src/connections/connectedResources').then((m) => m.useConnectedResources),
      getConnectedResources: () =>
        import('../src/connections/connectedResources').then((m) => m.getConnectedResourceLabels),
    },
    flags: {
      required: [SupportedArea.LLMD_SERVING],
    },
  },
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
