import { HardwareProfileKind } from '~/k8sTypes';

export enum ManageHardwareProfileSectionID {
  DETAILS = 'details',
  USE_CASES = 'use-cases',
  IDENTIFIERS = 'identifiers',
  NODE_SELECTORS = 'node-selectors',
  TOLERATIONS = 'tolerations',
}

export type ManageHardwareProfileSectionTitlesType = {
  [key in ManageHardwareProfileSectionID]: string;
};

export type HardwareProfileFormData = {
  name: string;
  useCases: string[];
} & HardwareProfileKind['spec'];
