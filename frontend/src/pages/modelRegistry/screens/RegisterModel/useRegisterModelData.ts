import { ModelRegistryCustomProperties } from '~/concepts/modelRegistry/types';
import useGenericObjectState, { GenericObjectState } from '~/utilities/useGenericObjectState';

export enum ModelLocationType {
  ObjectStorage = 'Object storage',
  URI = 'URI',
}

export type RegistrationCommonFormData = {
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
  versionCustomProperties?: ModelRegistryCustomProperties;
  modelCustomProperties?: ModelRegistryCustomProperties;
  modelSourceGroup?: string;
  modelSourceId?: string;
  modelSourceName?: string;
};

export type RegisterModelFormData = RegistrationCommonFormData & {
  modelName: string;
  modelDescription: string;
};

export type RegisterVersionFormData = RegistrationCommonFormData & {
  registeredModelId: string;
};

export type RegisterCatalogModelFormData = RegisterModelFormData & {
  modelRegistry: string;
};

const registrationCommonFormDataDefaults: RegistrationCommonFormData = {
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
  modelCustomProperties: {},
  versionCustomProperties: {},
  modelSourceGroup: '',
  modelSourceId: '',
  modelSourceName: '',
};

const registerModelFormDataDefaults: RegisterModelFormData = {
  ...registrationCommonFormDataDefaults,
  modelName: '',
  modelDescription: '',
};

const registerVersionFormDataDefaults: RegisterVersionFormData = {
  ...registrationCommonFormDataDefaults,
  registeredModelId: '',
};

const registerModelFormDataDefaultsForModelCatalog: RegisterCatalogModelFormData = {
  ...registerModelFormDataDefaults,
  modelRegistry: '',
};

export const useRegisterModelData = (): GenericObjectState<RegisterModelFormData> =>
  useGenericObjectState<RegisterModelFormData>(registerModelFormDataDefaults);

export const useRegisterVersionData = (
  registeredModelId?: string,
): GenericObjectState<RegisterVersionFormData> =>
  useGenericObjectState<RegisterVersionFormData>({
    ...registerVersionFormDataDefaults,
    registeredModelId: registeredModelId || '',
  });

export const useRegisterCatalogModelData = (): GenericObjectState<RegisterCatalogModelFormData> =>
  useGenericObjectState<RegisterCatalogModelFormData>(registerModelFormDataDefaultsForModelCatalog);
