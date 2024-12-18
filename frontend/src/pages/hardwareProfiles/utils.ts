import { HardwareProfileKind } from '~/k8sTypes';

export const isHardwareProfileOOTB = (hardwareProfile: HardwareProfileKind): boolean =>
  hardwareProfile.metadata.labels?.['opendatahub.io/ootb'] === 'true';
