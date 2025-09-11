import * as _ from 'lodash-es';
import { DeepPartial } from 'redux';
import {
  AcceleratorProfileKind,
  HardwareProfileKind,
  HardwareProfileFeatureVisibility,
} from '#~/k8sTypes';
import {
  IdentifierResourceType,
  Identifier,
  SchedulingType,
  DisplayNameAnnotation,
} from '#~/types';
import { HardwareProfileModel } from '#~/api';
import { kindApiVersion } from '#~/concepts/k8s/utils';
import { ContainerSizeLimits } from './types';

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
