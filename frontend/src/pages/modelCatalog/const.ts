import {
  ModelRegistryCustomProperty,
  ModelRegistryMetadataType,
} from '#~/concepts/modelRegistry/types';

export enum ReservedILabLabel {
  LabBase = 'lab-base',
  LabTeacher = 'lab-teacher',
  LabJudge = 'lab-judge',
}
export const RESERVED_ILAB_LABELS: ReservedILabLabel[] = Object.values(ReservedILabLabel);

export const EMPTY_CUSTOM_PROPERTY_STRING: ModelRegistryCustomProperty = {
  // eslint-disable-next-line camelcase
  string_value: '',
  metadataType: ModelRegistryMetadataType.STRING,
};
