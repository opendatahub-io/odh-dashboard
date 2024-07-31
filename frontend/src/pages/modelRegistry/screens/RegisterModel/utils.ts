import {
  ModelArtifact,
  ModelArtifactState,
  ModelState,
  ModelVersion,
  RegisteredModel,
} from '~/concepts/modelRegistry/types';
import { ModelRegistryAPIState } from '~/concepts/modelRegistry/context/useModelRegistryAPIState';
import {
  ModelLocationType,
  RegisterModelFormData,
  RegisterVersionFormData,
} from './useRegisterModelData';

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
    modelFormatName: formData.sourceModelFormat,
    modelFormatVersion: formData.sourceModelFormatVersion,
    // storageKey: 'TODO', // TODO fill in the name of the data connection we used to prefill if we used one - reference ticket
    uri:
      formData.modelLocationType === ModelLocationType.ObjectStorage
        ? objectStorageFieldsToUri({
            endpoint: formData.modelLocationEndpoint,
            bucket: formData.modelLocationBucket,
            region: formData.modelLocationRegion,
            path: formData.modelLocationPath,
          })
        : formData.modelLocationURI,
    artifactType: 'model-artifact',
  });
  return { modelVersion, modelArtifact };
};

type ObjectStorageFields = {
  endpoint: string;
  bucket: string;
  region?: string;
  path: string;
};

// TODO unit tests for the below using:
/*
s3://rhods-public/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1
{
  endpoint: 'http://s3.amazonaws.com/',
  bucket: 'rhods-public',
  region: 'us-east-1',
  path: 'demo-models/flan-t5-small-caikit',
}
*/

export const objectStorageFieldsToUri = (fields: ObjectStorageFields): string => {
  const { endpoint, bucket, region, path } = fields;
  const searchParams = new URLSearchParams();
  searchParams.set('endpoint', endpoint);
  if (region) {
    searchParams.set('defaultRegion', region);
  }
  return `s3://${bucket}/${path}?${searchParams.toString()}`;
};

export const uriToObjectStorageFields = (uri: string): ObjectStorageFields | null => {
  try {
    const urlObj = new URL(uri);
    const [bucket, ...pathSplit] = urlObj.pathname.split('/').filter(Boolean);
    const path = pathSplit.join('/');
    const searchParams = new URLSearchParams(urlObj.search);
    const endpoint = searchParams.get('endpoint');
    const region = searchParams.get('defaultRegion');
    if (endpoint && bucket && path) {
      return { endpoint, bucket, region: region || undefined, path };
    }
    return null;
  } catch {
    return null;
  }
};
