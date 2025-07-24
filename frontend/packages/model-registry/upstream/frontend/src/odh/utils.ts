// TODO: remove this file once we have connection types support upstream
// and update the reference to this file to the one in the model-serving upstream package
import { RegisteredModelLocation } from '~/app/utils';

export enum ModelServingCompatibleTypes {
  S3ObjectStorage = 'S3 compatible object storage',
  URI = 'URI',
  OCI = 'OCI compliant registry',
}

export const URIConnectionTypeKeys = ['URI'];
export const OCIConnectionTypeKeys = ['.dockerconfigjson', 'OCI_HOST'];
export const OCIAccessTypeKey = ['ACCESS_TYPE'];
export const S3ConnectionTypeKeys = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_ENDPOINT',
  'AWS_S3_BUCKET',
];

export const uriToModelLocation = (uri?: string): RegisteredModelLocation => {
  if (!uri) {
    return null;
  }
  try {
    const urlObj = new URL(uri);
    if (urlObj.toString().startsWith('s3:')) {
      // Some environments include the first token after the protocol (our bucket) in the pathname and some have it as the hostname
      const [bucket, ...pathSplit] = [urlObj.hostname, ...urlObj.pathname.split('/')].filter(
        Boolean,
      );
      const path = pathSplit.join('/');
      const searchParams = new URLSearchParams(urlObj.search);
      const endpoint = searchParams.get('endpoint');
      const region = searchParams.get('defaultRegion');
      if (endpoint && bucket && path) {
        return {
          s3Fields: { endpoint, bucket, region: region || undefined, path },
          uri: null,
          ociUri: null,
        };
      }
      return null;
    }
    if (uri.startsWith('oci:')) {
      return { s3Fields: null, uri: null, ociUri: uri };
    }
    return { s3Fields: null, uri, ociUri: null };
  } catch {
    return null;
  }
};

const modelServingCompatibleTypesMetadata: Record<
  ModelServingCompatibleTypes,
  {
    name: string;
    resource: string;
    envVars: string[];
    managedType?: string;
  }
> = {
  [ModelServingCompatibleTypes.S3ObjectStorage]: {
    name: ModelServingCompatibleTypes.S3ObjectStorage,
    resource: 's3',
    envVars: S3ConnectionTypeKeys,
    managedType: 's3',
  },
  [ModelServingCompatibleTypes.URI]: {
    name: ModelServingCompatibleTypes.URI,
    resource: 'uri-v1',
    envVars: URIConnectionTypeKeys,
  },
  [ModelServingCompatibleTypes.OCI]: {
    name: ModelServingCompatibleTypes.OCI,
    resource: 'oci-v1',
    envVars: OCIConnectionTypeKeys,
  },
};

export const getModelServingConnectionTypeName = (type: ModelServingCompatibleTypes): string =>
  modelServingCompatibleTypesMetadata[type].resource;

export const uriToConnectionTypeName = (uri?: string): string => {
  const storageFields = uriToModelLocation(uri);
  if (storageFields?.uri) {
    return getModelServingConnectionTypeName(ModelServingCompatibleTypes.URI);
  }
  if (storageFields?.s3Fields) {
    return getModelServingConnectionTypeName(ModelServingCompatibleTypes.S3ObjectStorage);
  }
  if (storageFields?.ociUri) {
    return getModelServingConnectionTypeName(ModelServingCompatibleTypes.OCI);
  }
  return getModelServingConnectionTypeName(ModelServingCompatibleTypes.URI);
};
