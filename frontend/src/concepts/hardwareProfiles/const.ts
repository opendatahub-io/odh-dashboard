import { HardwareProfileBindingConfig } from './types';

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
