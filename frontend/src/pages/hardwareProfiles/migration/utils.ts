import * as _ from 'lodash-es';
import { DeepPartial } from 'redux';
import {
  AcceleratorProfileKind,
  HardwareProfileKind,
  HardwareProfileFeatureVisibility,
} from '#~/k8sTypes';
import {
  IdentifierResourceType,
  Toleration,
  Identifier,
  NotebookSize,
  SchedulingType,
  DisplayNameAnnotation,
} from '#~/types';
import { isCpuLarger, isMemoryLarger } from '#~/utilities/valueUnits';
import { HardwareProfileModel } from '#~/api';
import { kindApiVersion, translateDisplayNameForK8s } from '#~/concepts/k8s/utils';
import { ContainerSizeLimits } from './types';

export const getMinMaxResourceSize = (containerSizes: NotebookSize[]): ContainerSizeLimits => {
  const maxMemory = containerSizes.reduce<string | undefined>((max, size) => {
    let maxRequestLimit;
    if (
      size.resources.requests?.memory !== undefined &&
      size.resources.limits?.memory !== undefined
    ) {
      maxRequestLimit = isMemoryLarger(size.resources.requests.memory, size.resources.limits.memory)
        ? size.resources.requests.memory
        : size.resources.limits.memory;
    } else {
      maxRequestLimit = size.resources.requests?.memory || size.resources.limits?.memory;
    }

    if (!maxRequestLimit || !max) {
      return maxRequestLimit || max;
    }

    return isMemoryLarger(maxRequestLimit, max) ? maxRequestLimit : max;
  }, undefined);

  const minMemory = containerSizes.reduce<string | undefined>((min, size) => {
    let minRequestLimit;
    if (
      size.resources.requests?.memory !== undefined &&
      size.resources.limits?.memory !== undefined
    ) {
      minRequestLimit = isMemoryLarger(size.resources.requests.memory, size.resources.limits.memory)
        ? size.resources.limits.memory
        : size.resources.requests.memory;
    } else {
      minRequestLimit = size.resources.requests?.memory || size.resources.limits?.memory;
    }

    if (!minRequestLimit || !min) {
      return minRequestLimit || min;
    }

    return isMemoryLarger(minRequestLimit, min) ? min : minRequestLimit;
  }, undefined);

  const maxCpu = containerSizes.reduce<string | number | undefined>((max, size) => {
    let maxRequestLimit;
    if (size.resources.requests?.cpu !== undefined && size.resources.limits?.cpu !== undefined) {
      maxRequestLimit = isCpuLarger(size.resources.requests.cpu, size.resources.limits.cpu)
        ? size.resources.requests.cpu
        : size.resources.limits.cpu;
    } else {
      maxRequestLimit = size.resources.requests?.cpu || size.resources.limits?.cpu;
    }

    if (!maxRequestLimit || !max) {
      return maxRequestLimit || max;
    }

    return isCpuLarger(maxRequestLimit, max) ? maxRequestLimit : max;
  }, undefined);

  const minCpu = containerSizes.reduce<string | number | undefined>((min, size) => {
    let minRequestLimit;
    if (size.resources.requests?.cpu !== undefined && size.resources.limits?.cpu !== undefined) {
      minRequestLimit = isCpuLarger(size.resources.requests.cpu, size.resources.limits.cpu)
        ? size.resources.limits.cpu
        : size.resources.requests.cpu;
    } else {
      minRequestLimit = size.resources.requests?.cpu || size.resources.limits?.cpu;
    }

    if (!minRequestLimit || !min) {
      return minRequestLimit || min;
    }

    return isCpuLarger(minRequestLimit, min) ? min : minRequestLimit;
  }, undefined);

  return { maxMemory, minMemory: minMemory || '1Mi', maxCpu, minCpu: minCpu || '1' };
};

const createHardwareProfileIdentifier = (
  type: IdentifierResourceType,
  defaultCount: number | string,
  minCount: number | string,
  maxCount?: number | string,
): Identifier => ({
  displayName: type,
  resourceType: type,
  identifier: type === IdentifierResourceType.CPU ? 'cpu' : 'memory',
  minCount,
  maxCount,
  defaultCount,
});

const createCpuMemoryIdentifiers = (sizes: ContainerSizeLimits) => [
  createHardwareProfileIdentifier(
    IdentifierResourceType.CPU,
    sizes.minCpu,
    sizes.minCpu,
    sizes.maxCpu,
  ),
  createHardwareProfileIdentifier(
    IdentifierResourceType.MEMORY,
    sizes.minMemory,
    sizes.minMemory,
    sizes.maxMemory,
  ),
];

const transformAcceleratorProfileToHardwareProfile = (
  acceleratorProfile: AcceleratorProfileKind,
  hardwareProfile?: DeepPartial<HardwareProfileKind>,
  visibleIn: HardwareProfileFeatureVisibility[] = [],
): HardwareProfileKind => {
  const baseProfile = {
    apiVersion: kindApiVersion(HardwareProfileModel),
    kind: HardwareProfileModel.kind,
    metadata: {
      name: acceleratorProfile.metadata.name,
      namespace: acceleratorProfile.metadata.namespace,
      annotations: {
        ...acceleratorProfile.metadata.annotations,
        'opendatahub.io/dashboard-feature-visibility': JSON.stringify(visibleIn),
        'opendatahub.io/modified-date': new Date().toISOString(),
        'opendatahub.io/is-legacy-profile': 'true',
        [DisplayNameAnnotation.ODH_DISP_NAME]: acceleratorProfile.spec.displayName,
        [DisplayNameAnnotation.ODH_DESC]: acceleratorProfile.spec.description ?? '',
        'opendatahub.io/disabled': (!acceleratorProfile.spec.enabled).toString(),
      },
    },
    spec: {
      identifiers: [
        {
          identifier: acceleratorProfile.spec.identifier,
          displayName: acceleratorProfile.spec.identifier,
          minCount: 1,
          defaultCount: 1,
        },
      ],
      ...(acceleratorProfile.spec.tolerations?.length && {
        scheduling: {
          type: SchedulingType.NODE,
          node: {
            tolerations: acceleratorProfile.spec.tolerations,
          },
        },
      }),
    },
  };

  if (!hardwareProfile) {
    return baseProfile;
  }

  return _.mergeWith({}, baseProfile, hardwareProfile, (obj, src) =>
    Array.isArray(obj) && Array.isArray(src) ? [...src, ...obj] : undefined,
  );
};

export const createAcceleratorHardwareProfiles = (
  acceleratorProfile: AcceleratorProfileKind,
  name: string,
  notebookMaxSizes: ContainerSizeLimits,
  servingMaxSizes: ContainerSizeLimits,
  notebooksOnlyToleration?: Toleration,
): [HardwareProfileKind, HardwareProfileKind] => [
  transformAcceleratorProfileToHardwareProfile(
    acceleratorProfile,
    {
      metadata: { name: translateDisplayNameForK8s(`${name}-notebooks`) },
      spec: {
        identifiers: createCpuMemoryIdentifiers(notebookMaxSizes),
        ...(notebooksOnlyToleration && {
          scheduling: {
            type: SchedulingType.NODE,
            node: {
              tolerations: [notebooksOnlyToleration],
            },
          },
        }),
      },
    },
    [HardwareProfileFeatureVisibility.WORKBENCH],
  ),
  transformAcceleratorProfileToHardwareProfile(
    acceleratorProfile,
    {
      metadata: { name: translateDisplayNameForK8s(`${name}-serving`) },
      spec: {
        identifiers: createCpuMemoryIdentifiers(servingMaxSizes),
      },
    },
    [HardwareProfileFeatureVisibility.MODEL_SERVING, HardwareProfileFeatureVisibility.PIPELINES],
  ),
];

export const transformContainerSizeToHardwareProfile = (
  containerSize: NotebookSize,
  name: string,
  namespace: string,
  hardwareProfile?: DeepPartial<HardwareProfileKind>,
  visibleIn: HardwareProfileFeatureVisibility[] = [],
): HardwareProfileKind => {
  const sizes = getMinMaxResourceSize([containerSize]);
  const baseProfile = {
    apiVersion: kindApiVersion(HardwareProfileModel),
    kind: HardwareProfileModel.kind,
    metadata: {
      name: translateDisplayNameForK8s(name),
      namespace,
      annotations: {
        [DisplayNameAnnotation.ODH_DISP_NAME]: containerSize.name,
        'opendatahub.io/disabled': 'false',
        'opendatahub.io/dashboard-feature-visibility': JSON.stringify(visibleIn),
        'opendatahub.io/modified-date': new Date().toISOString(),
        'opendatahub.io/is-legacy-profile': 'true',
      },
    },
    spec: {
      identifiers: createCpuMemoryIdentifiers(sizes),
    },
  };

  if (!hardwareProfile) {
    return baseProfile;
  }

  return _.mergeWith({}, baseProfile, hardwareProfile, (obj, src) =>
    Array.isArray(obj) && Array.isArray(src) ? [...src, ...obj] : undefined,
  );
};
