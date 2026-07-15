import React from 'react';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { get, set } from 'lodash-es';
import {
  IdentifierResourceType,
  type HardwareProfileKind,
  type Identifier,
  type Toleration,
  type NodeSelector,
  type ContainerResources,
} from '@odh-dashboard/k8s-core';
import {
  splitValueUnit,
  CPU_UNITS,
  MEMORY_UNITS_FOR_PARSING,
} from '@odh-dashboard/ui-core/utilities/valueUnits';
import { QueueSource } from './const';
import type {
  HardwareProfileResource,
  HardwarePodSpecOptions,
  CrPathConfig,
  ResourceType,
} from './types';
import type {
  HardwareProfileConfig,
  UseHardwareProfileConfigResult,
} from './useHardwareProfileConfig';

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

export const resourceTypeOf = (r: { kind?: string } | HardwareProfileResource): ResourceType => {
  return r.kind === 'Notebook' ? 'workbench' : 'deployment';
};

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

export const formatResource = (
  identifier: string,
  defaultCount: string,
  maxCount: string,
): string => `${identifier}: Default = ${defaultCount}, Max = ${maxCount}`;

export const formatIdentifierDetails = (identifier: Identifier): string => {
  const defaultVal = formatResourceValue(
    identifier.defaultCount,
    identifier.resourceType,
  ).toString();
  const minVal = formatResourceValue(identifier.minCount, identifier.resourceType).toString();
  const maxVal =
    identifier.maxCount === undefined
      ? 'unrestricted'
      : formatResourceValue(identifier.maxCount, identifier.resourceType).toString();
  return `Default = ${defaultVal}, Min = ${minVal}, Max = ${maxVal}`;
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

export const getLocalQueueLabel = (queueSource?: QueueSource): string => {
  const commonLabel = 'Local queue';
  if (queueSource === QueueSource.DIRECT) {
    return `${commonLabel} (applied directly)`;
  }
  if (queueSource === QueueSource.HARDWARE_PROFILE) {
    return `${commonLabel} (via hardware profile)`;
  }
  return commonLabel;
};
