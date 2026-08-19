// TODO: remove this file once we have connection types support upstream
// and update the reference to this file to the one in the model-serving upstream package
import { uriToModelLocation } from '@odh-dashboard/k8s-core';
import { DEPLOY_BUTTON_TOOLTIP } from '~/odh/const';

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

export const getDeployButtonState = (
  availablePlatformIds: string[],
  requireKserve = false,
): { enabled?: boolean; tooltip?: string } => {
  if (availablePlatformIds.length === 0) {
    return {
      enabled: false,
      tooltip: DEPLOY_BUTTON_TOOLTIP.ENABLE_MODEL_SERVING_PLATFORM,
    };
  }

  // TODO: add OCI check when OCI model serving is supported
  if (requireKserve && !availablePlatformIds.includes('kserve')) {
    return {
      enabled: false,
      tooltip: DEPLOY_BUTTON_TOOLTIP.ENABLE_SINGLE_MODEL_SERVING,
    };
  }

  return {
    enabled: true,
  };
};
