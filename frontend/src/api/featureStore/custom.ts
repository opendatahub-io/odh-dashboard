import { proxyGET } from '#~/api/proxyUtils';
import { K8sAPIOptions } from '#~/k8sTypes';
import { FEATURE_STORE_API_VERSION } from '#~/pages/featureStore/const';
import { Entity, EntityList } from '#~/pages/featureStore/types/entities';
import { Features, FeaturesList } from '#~/pages/featureStore/types/features.ts';
import { ProjectList } from '#~/pages/featureStore/types/featureStoreProjects';
import { FeatureViewsList } from '#~/pages/featureStore/types/featureView';
import { FeatureService, FeatureServicesList } from '#~/pages/featureStore/types/featureServices';
import { handleFeatureStoreFailures } from './errorUtils';

export const listFeatureStoreProject =
  (hostPath: string) =>
  (opts: K8sAPIOptions): Promise<ProjectList> =>
    handleFeatureStoreFailures<ProjectList>(
      proxyGET(hostPath, `/api/${FEATURE_STORE_API_VERSION}/projects`, opts),
    );

export const getEntities =
  (hostPath: string) =>
  (opts: K8sAPIOptions, project?: string): Promise<EntityList> => {
    let endpoint = `/api/${FEATURE_STORE_API_VERSION}/entities/all?include_relationships=true`;
    if (project) {
      endpoint = `/api/${FEATURE_STORE_API_VERSION}/entities?project=${encodeURIComponent(
        project,
      )}&include_relationships=true`;
    }

    return handleFeatureStoreFailures<EntityList>(proxyGET(hostPath, endpoint, opts));
  };

export const getFeatureViews =
  (hostPath: string) =>
  (
    opts: K8sAPIOptions,
    project?: string,
    entity?: string,
    featureService?: string,
  ): Promise<FeatureViewsList> => {
    let endpoint = `/api/${FEATURE_STORE_API_VERSION}/feature_views`;
    const queryParams: string[] = [];

    if (project) {
      queryParams.push(`project=${encodeURIComponent(project)}`);
    } else {
      endpoint += '/all';
    }

    if (featureService) {
      queryParams.push(`feature_service=${encodeURIComponent(featureService)}`);
    }

    if (entity) {
      queryParams.push(`entity=${encodeURIComponent(entity)}`);
    }

    if (queryParams.length > 0) {
      endpoint += `?${queryParams.join('&')}`;
    }

    return handleFeatureStoreFailures<FeatureViewsList>(proxyGET(hostPath, endpoint, opts));
  };

export const getEntityByName =
  (hostPath: string) =>
  (opts: K8sAPIOptions, project: string, entityName: string): Promise<Entity> => {
    const endpoint = `/api/${FEATURE_STORE_API_VERSION}/entities/${encodeURIComponent(
      entityName,
    )}?include_relationships=true&project=${encodeURIComponent(project)}`;

    return handleFeatureStoreFailures<Entity>(proxyGET(hostPath, endpoint, opts));
  };

export const getFeatures =
  (hostPath: string) =>
  (opts: K8sAPIOptions, project?: string): Promise<FeaturesList> => {
    let endpoint = `/api/${FEATURE_STORE_API_VERSION}/features/all`;
    if (project) {
      endpoint = `/api/${FEATURE_STORE_API_VERSION}/features?project=${encodeURIComponent(
        project,
      )}`;
    }
    return handleFeatureStoreFailures<FeaturesList>(proxyGET(hostPath, endpoint, opts));
  };

export const getFeatureByName =
  (hostPath: string) =>
  (
    opts: K8sAPIOptions,
    project: string,
    featureViewName: string,
    featureName: string,
  ): Promise<Features> => {
    const endpoint = `/api/${FEATURE_STORE_API_VERSION}/features/${featureViewName}/${featureName}?project=${encodeURIComponent(
      project,
    )}&include_relationships=true`;

    return handleFeatureStoreFailures<Features>(proxyGET(hostPath, endpoint, opts));
  };

export const getFeatureServices =
  (hostPath: string) =>
  (opts: K8sAPIOptions, project?: string): Promise<FeatureServicesList> => {
    let endpoint = `/api/${FEATURE_STORE_API_VERSION}/feature_services/all?include_relationships=true`;
    if (project) {
      endpoint = `/api/${FEATURE_STORE_API_VERSION}/feature_services?project=${encodeURIComponent(
        project,
      )}&include_relationships=true`;
    }

    return handleFeatureStoreFailures<FeatureServicesList>(proxyGET(hostPath, endpoint, opts));
  };

export const getFeatureServiceByName =
  (hostPath: string) =>
  (opts: K8sAPIOptions, project: string, featureServiceName: string): Promise<FeatureService> =>
    handleFeatureStoreFailures<FeatureService>(
      proxyGET(
        hostPath,
        `/api/${FEATURE_STORE_API_VERSION}/feature_services/${encodeURIComponent(
          featureServiceName,
        )}?project=${encodeURIComponent(project)}&include_relationships=true`,
        opts,
      ),
    );
