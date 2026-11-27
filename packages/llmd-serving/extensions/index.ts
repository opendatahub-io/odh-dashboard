import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import {
  lifecycleExtensions,
  modelServerFieldOverride,
  commonFieldOverrides,
  llmdDeploymentMethodFieldOverride,
  gatewayExtensions,
  llmdTrackingPropertiesExtension,
  llmdOnlyDeploymentMethodExtractorExtension,
  startStopAction,
} from './deployments';
import {
  modelAvailabilityFieldOverride,
  vllmDeploymentMethodFieldOverride,
  llmConfigOptionsFieldExtension,
  topologyConfigsExtensions,
  deploymentMethodExtractorExtensionvLLMOnMaaS,
} from './advanced';
import settingsExtensions from './settings';
import type { LLMDServingExtension } from './types';

export const LLMD_SERVING_ID = 'llmd-serving';
// Preserve named exports from the existing full public entry point.
// eslint-disable-next-line no-barrel-files/no-barrel-files
export { topologyConfigsExtensions };
// eslint-disable-next-line no-barrel-files/no-barrel-files
export type { TopologyConfigsExtensionsType } from './types';

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
  llmdOnlyDeploymentMethodExtractorExtension,
  deploymentMethodExtractorExtensionvLLMOnMaaS,
  startStopAction,
  ...settingsExtensions,
];
export default extensions;
