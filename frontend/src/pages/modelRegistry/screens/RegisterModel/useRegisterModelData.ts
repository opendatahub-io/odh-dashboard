import useGenericObjectState, { GenericObjectState } from '~/utilities/useGenericObjectState';

export enum ModelLocationType {
  ObjectStorage = 'Object storage',
  URI = 'URI',
}

export type RegisterModelFormData = RegisterVersionFormData & {
  modelName: string;
  modelDescription: string;
};

export type RegisterVersionFormData = {
  versionName: string;
  versionDescription: string;
  sourceModelFormat: string;
  sourceModelFormatVersion: string;
  modelLocationType: ModelLocationType;
  modelLocationEndpoint: string;
  modelLocationBucket: string;
  modelLocationRegion: string;
  modelLocationPath: string;
  modelLocationURI: string;
};

const registerVersionFormDataDefaults: RegisterVersionFormData = {
  versionName: '',
  versionDescription: '',
  sourceModelFormat: '',
  sourceModelFormatVersion: '',
  modelLocationType: ModelLocationType.ObjectStorage,
  modelLocationEndpoint: '',
  modelLocationBucket: '',
  modelLocationRegion: '',
  modelLocationPath: '',
  modelLocationURI: '',
};
const registerModelFormDataDefaults: RegisterModelFormData = {
  ...registerVersionFormDataDefaults,
  modelName: '',
  modelDescription: '',
};

export const useRegisterModelData = (): GenericObjectState<RegisterModelFormData> =>
  useGenericObjectState<RegisterModelFormData>(registerModelFormDataDefaults);

export const useRegisterVersionData = (): GenericObjectState<RegisterVersionFormData> =>
  useGenericObjectState<RegisterVersionFormData>(registerVersionFormDataDefaults);
