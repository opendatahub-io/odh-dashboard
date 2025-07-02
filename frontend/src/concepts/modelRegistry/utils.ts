import { LabeledConnection } from '#~/pages/modelServing/screens/types';
import {
  ConnectionTypeConfigMapObj,
  ConnectionTypeValueType,
} from '#~/concepts/connectionTypes/types';
import {
  getModelServingConnectionTypeName,
  ModelServingCompatibleTypes,
} from '#~/concepts/connectionTypes/utils';
import { CatalogModelDetailsParams } from '#~/pages/modelCatalog/types';
import { ServiceKind } from '#~/k8sTypes.ts';
import {
  ModelVersion,
  ModelState,
  RegisteredModel,
  ModelSourceKind,
  ModelSourceProperties,
  PipelineRunReference,
} from './types';

export type ObjectStorageFields = {
  endpoint: string;
  bucket: string;
  region?: string;
  path: string;
};

export type ModelLocation = {
  s3Fields: ObjectStorageFields | null;
  uri: string | null;
  ociUri: string | null;
} | null;

export type PrefilledConnection = {
  initialNewConnectionType: ConnectionTypeConfigMapObj | undefined;
  initialNewConnectionValues: { [key: string]: ConnectionTypeValueType };
  connections: LabeledConnection[];
  connectionsLoaded: boolean;
  connectionsLoadError: Error | undefined;
};

export const objectStorageFieldsToUri = (fields: ObjectStorageFields): string | null => {
  const { endpoint, bucket, region, path } = fields;
  if (!endpoint || !bucket || !path) {
    return null;
  }
  const searchParams = new URLSearchParams();
  searchParams.set('endpoint', endpoint);
  if (region) {
    searchParams.set('defaultRegion', region);
  }
  return `s3://${bucket}/${path}?${searchParams.toString()}`;
};

export const uriToModelLocation = (uri?: string): ModelLocation => {
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

export const getLastCreatedItem = <T extends { createTimeSinceEpoch?: string }>(
  items?: T[],
): T | undefined =>
  items?.toSorted(
    ({ createTimeSinceEpoch: createTimeA }, { createTimeSinceEpoch: createTimeB }) => {
      if (!createTimeA || !createTimeB) {
        return 0;
      }
      return Number(createTimeB) - Number(createTimeA);
    },
  )[0];

export const filterArchiveVersions = (modelVersions: ModelVersion[]): ModelVersion[] =>
  modelVersions.filter((mv) => mv.state === ModelState.ARCHIVED);

export const filterLiveVersions = (modelVersions: ModelVersion[]): ModelVersion[] =>
  modelVersions.filter((mv) => mv.state === ModelState.LIVE);

export const filterArchiveModels = (registeredModels: RegisteredModel[]): RegisteredModel[] =>
  registeredModels.filter((rm) => rm.state === ModelState.ARCHIVED);

export const filterLiveModels = (registeredModels: RegisteredModel[]): RegisteredModel[] =>
  registeredModels.filter((rm) => rm.state === ModelState.LIVE);

/**
 * Converts model source properties to catalog parameters
 * @param properties - The model source properties
 * @returns CatalogModelDetailsParams object or null if not a catalog source or if required properties are missing
 */
export const modelSourcePropertiesToCatalogParams = (
  properties: ModelSourceProperties,
): CatalogModelDetailsParams | null => {
  if (
    properties.modelSourceKind !== ModelSourceKind.CATALOG ||
    !properties.modelSourceClass ||
    !properties.modelSourceGroup ||
    !properties.modelSourceName ||
    !properties.modelSourceId
  ) {
    return null;
  }

  return {
    sourceName: properties.modelSourceClass,
    repositoryName: properties.modelSourceGroup,
    modelName: properties.modelSourceName,
    tag: properties.modelSourceId,
  };
};

/**
 * Converts catalog parameters to model source properties
 * @param params - The catalog model details parameters
 * @returns ModelSourceProperties object
 */
export const catalogParamsToModelSourceProperties = (
  params: CatalogModelDetailsParams,
): ModelSourceProperties => ({
  modelSourceKind: ModelSourceKind.CATALOG,
  modelSourceClass: params.sourceName,
  modelSourceGroup: params.repositoryName,
  modelSourceName: params.modelName,
  modelSourceId: params.tag,
});

/**
 * Converts model source properties to pipeline run reference
 * @param properties - The model source properties
 * @returns PipelineRunReference object or null if not a KFP source or if required properties are missing
 */
export const modelSourcePropertiesToPipelineRunRef = (
  properties: ModelSourceProperties,
): PipelineRunReference | null => {
  if (
    properties.modelSourceKind !== ModelSourceKind.KFP ||
    !properties.modelSourceGroup ||
    !properties.modelSourceId ||
    !properties.modelSourceName
  ) {
    return null;
  }

  return {
    project: properties.modelSourceGroup,
    runId: properties.modelSourceId,
    runName: properties.modelSourceName,
  };
};

export const getServerAddress = (resource: ServiceKind): string =>
  resource.metadata.annotations?.['routing.opendatahub.io/external-address-rest'] || '';
