import { AcceleratorProfileKind } from '#~/k8sTypes';

export enum ManageAcceleratorProfileSectionID {
  DETAILS = 'details',
  TOLERATIONS = 'tolerations',
}

export type ManageAcceleratorProfileSectionTitlesType = {
  [key in ManageAcceleratorProfileSectionID]: string;
};

export type AcceleratorProfileFormData = { name: string } & AcceleratorProfileKind['spec'];
