export enum ManageAcceleratorSectionID {
  DETAILS = 'details',
  TOLERATIONS = 'tolerations',
}

export type ManageAcceleratorSectionTitlesType = {
  [key in ManageAcceleratorSectionID]: string;
};
