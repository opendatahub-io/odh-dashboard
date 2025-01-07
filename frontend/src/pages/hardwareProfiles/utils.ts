import { HardwareProfileKind } from '~/k8sTypes';
import { Identifier } from '~/types';

export const isHardwareProfileOOTB = (hardwareProfile: HardwareProfileKind): boolean =>
  hardwareProfile.metadata.labels?.['opendatahub.io/ootb'] === 'true';

export const isNodeResourcesSectionValid = (identifiers?: Identifier[]): boolean =>
  identifiers !== undefined &&
  identifiers.find((identifier) => identifier.identifier === 'cpu') !== undefined &&
  identifiers.find((identifier) => identifier.identifier === 'memory') !== undefined;
