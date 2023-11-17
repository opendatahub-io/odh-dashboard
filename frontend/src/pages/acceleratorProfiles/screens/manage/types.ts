export enum ManageAcceleratorProfileSectionID {
  DETAILS = 'details',
  TOLERATIONS = 'tolerations',
}

export type ManageAcceleratorProfileSectionTitlesType = {
  [key in ManageAcceleratorProfileSectionID]: string;
};
