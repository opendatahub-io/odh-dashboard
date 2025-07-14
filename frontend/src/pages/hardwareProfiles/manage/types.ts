import { HardwareProfileKind } from '#~/k8sTypes';

export enum ManageHardwareProfileSectionID {
  DETAILS = 'details',
  VISIBILITY = 'visibility',
  IDENTIFIERS = 'identifiers',
  SCHEDULING = 'scheduling',
  ALLOCATION_STRATEGY = 'allocation-strategy',
  LOCAL_QUEUE = 'local-queue',
  WORKLOAD_PRIORITY = 'workload-priority',
  NODE_SELECTORS = 'node-selectors',
  TOLERATIONS = 'tolerations',
}

export type ManageHardwareProfileSectionTitlesType = {
  [key in ManageHardwareProfileSectionID]: string;
};

export type HardwareProfileFormData = {
  name: string;
  displayName: string;
  description?: string;
  visibility: string[];
  enabled: boolean;
} & HardwareProfileKind['spec'];
