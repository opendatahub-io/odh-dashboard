import React from 'react';
import type { ModelResourceType } from '@odh-dashboard/model-serving/extension-points';
import { K8sResourceCommon, Patch } from '@openshift/dynamic-plugin-sdk-utils';
import { get, set } from 'lodash-es';
import { ImageStreamKind, HardwareProfileKind, NotebookKind } from '#~/k8sTypes';
import { getCompatibleIdentifiers } from '#~/pages/projects/screens/spawner/spawnerUtils';
import {
  Toleration,
  NodeSelector,
  Identifier,
  ContainerResources,
  IdentifierResourceType,
} from '#~/types';
import { splitValueUnit, CPU_UNITS, MEMORY_UNITS_FOR_PARSING } from '#~/utilities/valueUnits';
import {
  HardwareProfileConfig,
  UseHardwareProfileConfigResult,
} from '#~/concepts/hardwareProfiles/useHardwareProfileConfig.ts';
import {
  HardwareProfileBindingState,
  REMOVE_HARDWARE_PROFILE_ANNOTATIONS_PATCH,
} from '#~/concepts/hardwareProfiles/const';
import {
  HardwarePodSpecOptions,
  CrPathConfig,
  ResourceType,
  HardwareProfileBindingStateInfo,
} from './types';

export const formatToleration = (toleration: Toleration): string => {
  const parts = [`Key = ${toleration.key}`];

  if (toleration.value !== undefined) {
    parts.push(`Value = ${toleration.value}`);
  }

  if (toleration.effect !== undefined) {
    parts.push(`Effect = ${toleration.effect}`);
  }

  if (toleration.operator !== undefined) {
    parts.push(`Operator = ${toleration.operator}`);
  }

  if (toleration.tolerationSeconds !== undefined) {
    parts.push(`Toleration seconds = ${toleration.tolerationSeconds}`);
  }

  return parts.join('; ');
};

export const formatNodeSelector = (selector: NodeSelector): string[] =>
  Object.entries(selector).map(([key, value]) => `Key = ${key}; Value = ${value}`);

export const formatResource = (identifier: string, request: string, limit: string): string =>
  `${identifier}: Request = ${request}; Limit = ${limit}`;

/**
 * changed order of arguments so that the deprecated accelerator profile is last;
 * to make it optional.
 *
 * when modelmesh is removed; then remove the second argument and remove all unreachable/deprecated code.
 * modelmesh: RHOAIENG-34917, RHOAIENG-19185
 */
export const useProfileIdentifiers = (hardwareProfile?: HardwareProfileKind): string[] => {
  const [identifiers, setIdentifiers] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (hardwareProfile) {
      const profileIdentifiers =
        hardwareProfile.spec.identifiers?.map((identifier) => identifier.identifier) ?? [];
      setIdentifiers(profileIdentifiers);
    } else {
      setIdentifiers([]);
    }
  }, [hardwareProfile]);

  return identifiers;
};

export const doesImageStreamSupportHardwareProfile = (
  hardwareProfile: HardwareProfileKind,
  imageStream: ImageStreamKind,
): boolean => {
  const compatibleIdentifiers = getCompatibleIdentifiers(imageStream);

  // if any of the identifiers in the image are included in the profile, return true
  return compatibleIdentifiers.some((imageIdentifier) =>
    hardwareProfile.spec.identifiers?.some(
      (profileIdentifier) => profileIdentifier.identifier === imageIdentifier,
    ),
  );
};

export const sortIdentifiers = (identifiers: Identifier[]): Identifier[] => {
  const cpuIdentifier = identifiers.find((i) => i.identifier === 'cpu');
  const memoryIdentifier = identifiers.find((i) => i.identifier === 'memory');
  const otherIdentifiers = identifiers.filter(
    (i) => i.identifier !== 'cpu' && i.identifier !== 'memory',
  );

  return [
    ...(cpuIdentifier ? [cpuIdentifier] : []),
    ...(memoryIdentifier ? [memoryIdentifier] : []),
    ...otherIdentifiers,
  ];
};

export const getContainerResourcesFromHardwareProfile = (
  hardwareProfile: HardwareProfileKind,
): ContainerResources => {
  const emptyRecord: Record<string, string | number> = {};

  const newRequests =
    hardwareProfile.spec.identifiers?.reduce(
      (acc: Record<string, string | number>, identifier) => {
        acc[identifier.identifier] = identifier.defaultCount;
        return acc;
      },
      { ...emptyRecord },
    ) ?? emptyRecord;

  const newLimits =
    hardwareProfile.spec.identifiers?.reduce(
      (acc: Record<string, string | number>, identifier) => {
        acc[identifier.identifier] = identifier.defaultCount;
        return acc;
      },
      { ...emptyRecord },
    ) ?? emptyRecord;

  return {
    requests: newRequests,
    limits: newLimits,
  };
};

export const formatResourceValue = (
  v: string | number,
  resourceType?: IdentifierResourceType,
): string | number => {
  const valueStr = typeof v === 'number' ? v.toString() : v;
  switch (resourceType) {
    case IdentifierResourceType.CPU: {
      const [cpuValue, cpuUnit] = splitValueUnit(valueStr, CPU_UNITS);
      return `${cpuValue ?? ''} ${cpuUnit.name}`;
    }
    case IdentifierResourceType.MEMORY: {
      const [memoryValue, memoryUnit] = splitValueUnit(valueStr, MEMORY_UNITS_FOR_PARSING);
      return `${memoryValue ?? ''} ${memoryUnit.name}`;
    }
    default:
      return v;
  }
};

export const getProfileScore = (profile: HardwareProfileKind): number => {
  const { identifiers } = profile.spec;
  if (!identifiers?.length) {
    return 0;
  }

  // Check if profile has any unlimited resources (no maxValue)
  const hasUnlimitedResources = identifiers.some((identifier) => !identifier.maxCount);
  // Profiles with unlimited resources should sort towards bottom
  if (hasUnlimitedResources) {
    return Number.MAX_SAFE_INTEGER;
  }

  let score = 0;

  // Add up normalized scores for each identifier
  identifiers.forEach((identifier) => {
    const maxValue = identifier.maxCount;
    if (!maxValue) {
      return;
    }

    if (identifier.resourceType === IdentifierResourceType.CPU) {
      // Convert CPU to smallest unit for comparison
      const [value, unit] = splitValueUnit(maxValue.toString(), CPU_UNITS);
      score += (value ?? 0) * unit.weight;
    } else if (identifier.resourceType === IdentifierResourceType.MEMORY) {
      // Convert memory to smallest unit for comparison
      const [value, unit] = splitValueUnit(maxValue.toString(), MEMORY_UNITS_FOR_PARSING);
      score += (value ?? 0) * unit.weight;
    } else {
      score += Number(maxValue);
    }
  });

  return score;
};

export const resourceTypeOf = (r: NotebookKind | ModelResourceType): ResourceType => {
  return r.kind === 'Notebook' ? 'workbench' : 'deployment';
};

export const getDeletedHardwareProfilePatches = <T extends K8sResourceCommon>(
  bindingState: HardwareProfileBindingStateInfo | null,
  cr: T,
): Patch[] => {
  const hwpAnnotations = cr.metadata?.annotations?.['opendatahub.io/hardware-profile-name'];
  return bindingState?.state === HardwareProfileBindingState.DELETED && hwpAnnotations
    ? REMOVE_HARDWARE_PROFILE_ANNOTATIONS_PATCH
    : [];
};

export const getExistingResources = <T extends K8sResourceCommon>(
  cr: T | null | undefined,
  paths?: CrPathConfig,
): {
  existingContainerResources?: ContainerResources;
  existingTolerations?: Toleration[];
  existingNodeSelector?: NodeSelector;
} => {
  if (!cr || !paths) {
    return {
      existingContainerResources: undefined,
      existingTolerations: undefined,
      existingNodeSelector: undefined,
    };
  }

  const existingContainerResources: ContainerResources | undefined = paths.containerResourcesPath
    ? get(cr, paths.containerResourcesPath)
    : undefined;
  const existingTolerations: Toleration[] | undefined = paths.tolerationsPath
    ? get(cr, paths.tolerationsPath)
    : undefined;
  const existingNodeSelector: NodeSelector | undefined = paths.nodeSelectorPath
    ? get(cr, paths.nodeSelectorPath)
    : undefined;

  return {
    existingContainerResources,
    existingTolerations,
    existingNodeSelector,
  };
};

export const getExistingHardwareProfileData = <T extends K8sResourceCommon>(
  resource: T | null | undefined,
): {
  name?: string;
  namespace?: string;
} => {
  const name = resource?.metadata?.annotations?.['opendatahub.io/hardware-profile-name'];
  const namespace = resource?.metadata?.annotations?.['opendatahub.io/hardware-profile-namespace'];
  return {
    name,
    namespace,
  };
};

export const assemblePodSpecOptions = (
  hardwareProfileConfig: UseHardwareProfileConfigResult,
  existingResources?: {
    existingContainerResources?: ContainerResources;
    existingTolerations?: Toleration[];
    existingNodeSelector?: NodeSelector;
  },
): HardwarePodSpecOptions => {
  const {
    formData: { selectedProfile, resources, useExistingSettings },
  } = hardwareProfileConfig;

  let podSpecOptions: HardwarePodSpecOptions = {
    selectedHardwareProfile: selectedProfile,
  };

  if (useExistingSettings && existingResources) {
    const { existingContainerResources, existingTolerations, existingNodeSelector } =
      existingResources;
    podSpecOptions = {
      resources: existingContainerResources,
      tolerations: existingTolerations,
      nodeSelector: existingNodeSelector,
      ...podSpecOptions,
    };
  } else {
    podSpecOptions = {
      resources,
      tolerations: selectedProfile?.spec.scheduling?.node?.tolerations,
      nodeSelector: selectedProfile?.spec.scheduling?.node?.nodeSelector,
      ...podSpecOptions,
    };
  }
  return podSpecOptions;
};

export const applyHardwareProfileConfig = <T extends K8sResourceCommon>(
  cr: T,
  config: HardwareProfileConfig,
  paths?: CrPathConfig,
): T => {
  const result = structuredClone(cr);
  const { selectedProfile, resources, useExistingSettings } = config;

  if (!result.metadata) {
    result.metadata = {};
  }
  if (selectedProfile) {
    const annotations = result.metadata.annotations || {};
    annotations['opendatahub.io/hardware-profile-name'] = selectedProfile.metadata.name;
    annotations['opendatahub.io/hardware-profile-namespace'] = selectedProfile.metadata.namespace;
    annotations['opendatahub.io/hardware-profile-resource-version'] =
      selectedProfile.metadata.resourceVersion ?? '';
    result.metadata.annotations = annotations;
  } else if (result.metadata.annotations) {
    delete result.metadata.annotations['opendatahub.io/hardware-profile-name'];
    delete result.metadata.annotations['opendatahub.io/hardware-profile-namespace'];
    delete result.metadata.annotations['opendatahub.io/hardware-profile-resource-version'];
  }

  if (!useExistingSettings && selectedProfile && paths) {
    if (resources && paths.containerResourcesPath) {
      set(result, paths.containerResourcesPath, resources);
    }
  }
  return result;
};
