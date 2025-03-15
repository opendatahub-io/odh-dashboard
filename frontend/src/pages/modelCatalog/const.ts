import {
  ModelRegistryCustomProperty,
  ModelRegistryMetadataType,
} from '~/concepts/modelRegistry/types';

export const RESERVED_ILAB_LABELS = ['lab-base', 'lab-teacher', 'lab-judge'];

export const EMPTY_CUSTOM_PROPERTY_STRING: ModelRegistryCustomProperty = {
  // eslint-disable-next-line camelcase
  string_value: '',
  metadataType: ModelRegistryMetadataType.STRING,
};
