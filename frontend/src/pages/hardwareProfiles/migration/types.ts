import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { HardwareProfileKind, K8sAPIOptions } from '#~/k8sTypes';

export type ContainerSizeLimits = {
  minCpu: string | number;
  maxCpu?: string | number;
  minMemory: string;
  maxMemory?: string;
};

export enum MigrationSourceType {
  ACCELERATOR_PROFILE,
  SERVING_CONTAINER_SIZE,
  NOTEBOOK_CONTAINER_SIZE,
}

export type MigrationSource = {
  type: MigrationSourceType;
  label: string;
  resource: K8sResourceCommon;
};

export type MigrationAction = {
  source: MigrationSource;
  targetProfile: HardwareProfileKind;
  dependentProfiles: HardwareProfileKind[];
  deleteSourceResource: (opts?: K8sAPIOptions) => Promise<void>;
};
