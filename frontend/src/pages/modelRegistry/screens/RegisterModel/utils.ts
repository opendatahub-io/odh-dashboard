import {
  ModelArtifact,
  ModelArtifactState,
  ModelState,
  ModelVersion,
  RegisteredModel,
} from '~/concepts/modelRegistry/types';
import { ModelRegistryAPIState } from '~/concepts/modelRegistry/context/useModelRegistryAPIState';
import { RegisterModelFormData, RegisterVersionFormData } from './useRegisterModelData';

export type RegisterModelCreatedResources = RegisterVersionCreatedResources & {
  registeredModel: RegisteredModel;
};

export type RegisterVersionCreatedResources = {
  modelVersion: ModelVersion;
  modelArtifact: ModelArtifact;
};

export const registerModel = async (
  apiState: ModelRegistryAPIState,
  formData: RegisterModelFormData,
  author: string,
): Promise<RegisterModelCreatedResources> => {
  const registeredModel = await apiState.api.createRegisteredModel(
    {},
    {
      name: formData.modelName,
      description: formData.modelDescription,
      customProperties: {},
      state: ModelState.LIVE,
    },
  );
  const { modelVersion, modelArtifact } = await registerVersion(
    apiState,
    registeredModel,
    formData,
    author,
  );
  return { registeredModel, modelVersion, modelArtifact };
};

export const registerVersion = async (
  apiState: ModelRegistryAPIState,
  registeredModel: RegisteredModel,
  formData: RegisterVersionFormData,
  author: string,
): Promise<RegisterVersionCreatedResources> => {
  const modelVersion = await apiState.api.createModelVersionForRegisteredModel(
    {},
    registeredModel.id,
    {
      name: formData.versionName,
      description: formData.versionDescription,
      customProperties: {},
      state: ModelState.LIVE,
      author,
      registeredModelId: registeredModel.id,
    },
  );
  const modelArtifact = await apiState.api.createModelArtifactForModelVersion({}, modelVersion.id, {
    name: `${registeredModel.name}-${formData.versionName}-artifact`,
    description: formData.versionDescription,
    customProperties: {},
    state: ModelArtifactState.LIVE,
    author,
    modelFormatName: formData.sourceModelFormat, // TODO change to sourceModelFormatName
    modelFormatVersion: '1', // TODO add new formData.sourceModelFormatVersion
    // storageKey: 'TODO', // TODO fill in the name of the data connection we used to prefill if we used one - reference ticket
    // TODO construct this URI from formData according to agreed-upon structure
    uri: 's3://rhods-public/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
    artifactType: 'model-artifact',
  });
  return { modelVersion, modelArtifact };
};
