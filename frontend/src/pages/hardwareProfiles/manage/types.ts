import { HardwareProfileKind } from '#~/k8sTypes';

export enum ManageHardwareProfileSectionID {
  DETAILS = 'details',
  VISIBILITY = 'visibility',
  IDENTIFIERS = 'identifiers',
  NODE_SELECTORS = 'node-selectors',
  TOLERATIONS = 'tolerations',
}

export type ManageHardwareProfileSectionTitlesType = {
  [key in ManageHardwareProfileSectionID]: string;
};

export type HardwareProfileFormData = {
  name: string;
  visibility: string[];
} & HardwareProfileKind['spec'];
