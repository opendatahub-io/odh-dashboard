import { FeatureStoreObject } from './const';

export const featureStoreRootRoute = (): string => `/develop-train/feature-store`;

export const featureStoreRoute = (
  featureStoreObject: FeatureStoreObject,
  featureStoreProject?: string,
): string =>
  `${featureStoreRootRoute()}/${featureStoreObject}${
    featureStoreProject ? `/${featureStoreProject}` : ''
  }`;

export const featureViewRoute = (featureViewName: string, featureStoreProject: string): string =>
  `${featureStoreRootRoute()}/feature-views/${featureStoreProject}/${featureViewName}`;

export const featureEntityRoute = (entityName: string, featureStoreProject: string): string =>
  `${featureStoreRootRoute()}/entities/${featureStoreProject}/${entityName}`;

export const featureServiceRoute = (
  featureServiceName: string,
  featureStoreProject: string,
): string =>
  `${featureStoreRootRoute()}/feature-services/${featureStoreProject}/${featureServiceName}`;

export const featureRoute = (featureName: string, featureStoreProject: string): string =>
  `${featureStoreRootRoute()}/features/${featureStoreProject}/${featureName}`;

export const featureDataSourceRoute = (
  dataSourceName: string,
  featureStoreProject: string,
): string => `${featureStoreRootRoute()}/data-sources/${featureStoreProject}/${dataSourceName}`;

export const featureDataSetRoute = (dataSetName: string, featureStoreProject: string): string =>
  `${featureStoreRootRoute()}/datasets/${featureStoreProject}/${dataSetName}`;
