import {
  ModelRegistryCustomProperty,
  ModelRegistryMetadataType,
} from '#~/concepts/modelRegistry/types';

export const MODEL_CATALOG_SOURCES_CONFIGMAP = 'model-catalog-sources';
export const MODEL_CATALOG_UNMANAGED_SOURCES_CONFIGMAP = 'model-catalog-unmanaged-sources';
export const MAX_SHOWN_MODELS = 4;
export const MIN_CARD_WIDTH = 225;
export const FEATURED_LABEL = 'featured';

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
