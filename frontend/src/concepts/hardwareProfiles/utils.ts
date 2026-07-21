import { HardwareProfileBindingState } from '@odh-dashboard/hardware-profiles/shared/const';
import type { HardwareProfileBindingStateInfo } from '@odh-dashboard/hardware-profiles/shared/types';
import type { HardwareProfileKind } from '@odh-dashboard/k8s-core';
import { IdentifierResourceType } from '@odh-dashboard/k8s-core';
import {
  splitValueUnit,
  CPU_UNITS,
  MEMORY_UNITS_FOR_PARSING,
} from '@odh-dashboard/ui-core/utilities/valueUnits';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { ImageStreamKind } from '#~/k8sTypes';
import { getCompatibleIdentifiers } from '#~/pages/projects/screens/spawner/spawnerUtils';
import { REMOVE_HARDWARE_PROFILE_ANNOTATIONS_PATCH } from './const';

export {
  formatToleration,
  formatNodeSelector,
  formatResource,
  formatIdentifierDetails,
  formatResourceValue,
  sortIdentifiers,
  useProfileIdentifiers,
  getContainerResourcesFromHardwareProfile,
  resourceTypeOf,
  getExistingResources,
  getExistingHardwareProfileData,
  assemblePodSpecOptions,
  applyHardwareProfileConfig,
  getLocalQueueLabel,
} from '@odh-dashboard/hardware-profiles/shared/utils';

export const doesImageStreamSupportHardwareProfile = (
  hardwareProfile: HardwareProfileKind,
  imageStream: ImageStreamKind,
): boolean => {
  const compatibleIdentifiers = getCompatibleIdentifiers(imageStream);

  return compatibleIdentifiers.some((imageIdentifier) =>
    hardwareProfile.spec.identifiers?.some(
      (profileIdentifier) => profileIdentifier.identifier === imageIdentifier,
    ),
  );
};

export const getProfileScore = (profile: HardwareProfileKind): number => {
  const { identifiers } = profile.spec;
  if (!identifiers?.length) {
    return 0;
  }

  const hasUnlimitedResources = identifiers.some((identifier) => !identifier.maxCount);
  if (hasUnlimitedResources) {
    return Number.MAX_SAFE_INTEGER;
  }

  let score = 0;

  identifiers.forEach((identifier) => {
    const maxValue = identifier.maxCount;
    if (!maxValue) {
      return;
    }

    if (identifier.resourceType === IdentifierResourceType.CPU) {
      const [value, unit] = splitValueUnit(maxValue.toString(), CPU_UNITS);
      score += (value ?? 0) * unit.weight;
    } else if (identifier.resourceType === IdentifierResourceType.MEMORY) {
      const [value, unit] = splitValueUnit(maxValue.toString(), MEMORY_UNITS_FOR_PARSING);
      score += (value ?? 0) * unit.weight;
    } else {
      score += Number(maxValue);
    }
  });

  return score;
};

export const getDeletedHardwareProfilePatches = <T extends K8sResourceCommon>(
  bindingState: HardwareProfileBindingStateInfo | null,
  cr: T,
): import('@openshift/dynamic-plugin-sdk-utils').Patch[] => {
  const hwpAnnotations = cr.metadata?.annotations?.['opendatahub.io/hardware-profile-name'];
  return bindingState?.state === HardwareProfileBindingState.DELETED && hwpAnnotations
    ? REMOVE_HARDWARE_PROFILE_ANNOTATIONS_PATCH
    : [];
};
