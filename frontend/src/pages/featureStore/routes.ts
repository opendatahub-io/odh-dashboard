import { FeatureStoreObject } from './const';

export const featureStoreRootRoute = (): string => `/featureStore`;

export const featureStoreRoute = (
  featureStoreObject: FeatureStoreObject,
  featureStoreProject?: string,
): string =>
  `${featureStoreRootRoute()}/${featureStoreObject}${
    featureStoreProject ? `/${featureStoreProject}` : ''
  }`;

export const featureViewRoute = (featureViewName: string, featureStoreProject: string): string =>
  `${featureStoreRootRoute()}/featureViews/${featureStoreProject}/${featureViewName}`;

export const featureEntityRoute = (entityName: string, featureStoreProject: string): string =>
  `${featureStoreRootRoute()}/entities/${featureStoreProject}/${entityName}`;

export const featureServiceRoute = (
  featureServiceName: string,
  featureStoreProject: string,
): string =>
  `${featureStoreRootRoute()}/featureServices/${featureStoreProject}/${featureServiceName}`;

export const featureRoute = (featureName: string, featureStoreProject: string): string =>
  `${featureStoreRootRoute()}/features/${featureStoreProject}/${featureName}`;
