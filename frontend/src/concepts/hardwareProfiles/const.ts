import { K8sResourceCommon, Patch } from '@openshift/dynamic-plugin-sdk-utils';
import { HardwareProfileFeatureVisibility } from '#~/k8sTypes.ts';
import { HardwareProfileBindingConfig, CrPathConfig } from './types';

/**
 * Legacy annotation key used in RHOAI 2.5 when hardware profiles were behind a feature flag.
 * In 3.0, this was replaced with 'opendatahub.io/hardware-profile-name'.
 * We check both annotations to support workbenches upgraded from 2.5 to 3.0.
 */
export const LEGACY_HARDWARE_PROFILE_ANNOTATION = 'opendatahub.io/legacy-hardware-profile-name';

/**
 * Returns the hardware profile name from a resource's annotations,
 * checking the current annotation first, then falling back to the legacy annotation.
 */
export const getHardwareProfileName = <T extends K8sResourceCommon>(
  resource?: T | null,
): string | undefined =>
  resource?.metadata?.annotations?.['opendatahub.io/hardware-profile-name'] ??
  resource?.metadata?.annotations?.[LEGACY_HARDWARE_PROFILE_ANNOTATION];

export const HARDWARE_PROFILES_MISSING_CPU_MEMORY_MESSAGE =
  'Omitting CPU or Memory resources is not recommended.';

export enum HardwareProfileBindingState {
  DISABLED = 'Disabled',
  DELETED = 'Deleted',
  UPDATED = 'Updated',
}

export const HARDWARE_PROFILE_BINDING_CONFIG: Record<
  HardwareProfileBindingState,
  HardwareProfileBindingConfig
> = {
  [HardwareProfileBindingState.DELETED]: {
    labelText: HardwareProfileBindingState.DELETED,
    labelColor: 'red',
    alertVariant: 'danger',
    testId: 'hardware-profile-status-deleted',
    title: 'Hardware profile deleted',
    getBodyText: ({ resourceType, isRunning }) => {
      const continuity = isRunning
        ? `Your ${resourceType} will continue to run with its current settings. `
        : '';
      return `The hardware profile previously assigned to this ${resourceType} has been deleted. ${continuity}If you redeploy, you can select a new hardware profile or reuse the ${resourceType}'s current resource settings.`;
    },
  },
  [HardwareProfileBindingState.UPDATED]: {
    labelText: HardwareProfileBindingState.UPDATED,
    labelColor: 'green',
    alertVariant: 'info',
    testId: 'hardware-profile-status-updated',
    title: 'Hardware profile updated',
    getBodyText: ({ name, resourceType, isRunning }) => {
      const continuity = isRunning
        ? `Your ${resourceType} will continue to run with its current settings. `
        : '';
      return `The hardware profile ${
        name || ''
      } has been updated. ${continuity}If you restart or redeploy, your new ${resourceType} will use the updated ${
        name || ''
      } settings.`;
    },
  },
  [HardwareProfileBindingState.DISABLED]: {
    labelText: HardwareProfileBindingState.DISABLED,
    labelColor: 'yellow',
    alertVariant: 'warning',
    testId: 'hardware-profile-status-disabled',
    title: 'Hardware profile disabled',
    getBodyText: ({ name, resourceType, isRunning }) => {
      const continuity = isRunning
        ? `Your ${resourceType} will continue to run with its current settings. `
        : '';
      const plural = resourceType === 'workbench' ? 'workbenches' : 'deployments';
      return `The hardware profile ${
        name || ''
      } has been disabled by an administrator. ${continuity}New ${plural} cannot use this hardware profile until it is re-enabled.`;
    },
  },
};

export const HARDWARE_PROFILE_SELECTION_HELP =
  'Selecting a hardware profile allows you to match the hardware requirements of your workload to available node resources.';

export const REMOVE_HARDWARE_PROFILE_ANNOTATIONS_PATCH: Patch[] = [
  {
    op: 'remove',
    path: '/metadata/annotations/opendatahub.io~1hardware-profile-name',
  },
  {
    op: 'remove',
    path: '/metadata/annotations/opendatahub.io~1hardware-profile-namespace',
  },
  {
    op: 'remove',
    path: '/metadata/annotations/opendatahub.io~1legacy-hardware-profile-name',
  },
];

export const WORKBENCH_VISIBILITY = [HardwareProfileFeatureVisibility.WORKBENCH];
export const MODEL_SERVING_VISIBILITY = [HardwareProfileFeatureVisibility.MODEL_SERVING];

export const INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS: CrPathConfig = {
  containerResourcesPath: 'spec.predictor.model.resources',
  tolerationsPath: 'spec.predictor.tolerations',
  nodeSelectorPath: 'spec.predictor.nodeSelector',
};
