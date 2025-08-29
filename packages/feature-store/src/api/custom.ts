import { proxyGET } from '@odh-dashboard/internal/api/proxyUtils';
import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { handleFeatureStoreFailures } from './errorUtils';
import { FEATURE_STORE_API_VERSION } from '../const';
import { Entity, EntityList } from '../types/entities';
import { Features, FeaturesList } from '../types/features';
import { ProjectList } from '../types/featureStoreProjects';
import { FeatureService, FeatureServicesList } from '../types/featureServices';
import { FeatureView, FeatureViewsList } from '../types/featureView';
import {
  MetricsCountResponse,
  PopularTagsResponse,
  RecentlyVisitedResponse,
} from '../types/metrics';

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
    feature?: string,
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

    if (feature) {
      queryParams.push(`feature=${encodeURIComponent(feature)}`);
    }

    if (queryParams.length > 0) {
      endpoint += `?${queryParams.join('&')}`;
    }

    endpoint +=
      queryParams.length > 0 ? '&include_relationships=true' : '?include_relationships=true';

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
  (opts: K8sAPIOptions, project?: string, featureView?: string): Promise<FeatureServicesList> => {
    let endpoint = `/api/${FEATURE_STORE_API_VERSION}/feature_services/all?include_relationships=true`;
    if (project) {
      endpoint = `/api/${FEATURE_STORE_API_VERSION}/feature_services?project=${encodeURIComponent(
        project,
      )}&include_relationships=true`;
    }
    if (featureView) {
      endpoint += `&feature_view=${encodeURIComponent(featureView)}`;
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
export const getFeatureViewByName =
  (hostPath: string) =>
  (opts: K8sAPIOptions, project?: string, featureViewName?: string): Promise<FeatureView> => {
    if (!project) {
      throw new Error('Project is required');
    }
    if (!featureViewName) {
      throw new Error('Feature view name is required');
    }

    const endpoint = `/api/${FEATURE_STORE_API_VERSION}/feature_views/${encodeURIComponent(
      featureViewName,
    )}?project=${encodeURIComponent(project)}&include_relationships=true`;

    return handleFeatureStoreFailures<FeatureView>(proxyGET(hostPath, endpoint, opts));
  };

export const getMetricsResourceCount =
  (hostPath: string) =>
  (opts: K8sAPIOptions, project?: string): Promise<MetricsCountResponse> => {
    let endpoint = `/api/${FEATURE_STORE_API_VERSION}/metrics/resource_counts`;

    if (project) {
      endpoint = `/api/${FEATURE_STORE_API_VERSION}/metrics/resource_counts?project=${encodeURIComponent(
        project,
      )}`;
    }

    return handleFeatureStoreFailures<MetricsCountResponse>(proxyGET(hostPath, endpoint, opts));
  };

export const getPopularTags =
  (hostPath: string) =>
  (opts: K8sAPIOptions, project?: string, limit?: number): Promise<PopularTagsResponse> => {
    let endpoint = `/api/${FEATURE_STORE_API_VERSION}/metrics/popular_tags`;

    const queryParams: string[] = [];
    if (project) {
      queryParams.push(`project=${encodeURIComponent(project)}`);
    }
    if (limit) {
      queryParams.push(`limit=${limit}`);
    }

    if (queryParams.length > 0) {
      endpoint += `?${queryParams.join('&')}`;
    }

    return handleFeatureStoreFailures<PopularTagsResponse>(proxyGET(hostPath, endpoint, opts));
  };

export const getRecentlyVisitedResources =
  (hostPath: string) =>
  (opts: K8sAPIOptions, project?: string, limit?: number): Promise<RecentlyVisitedResponse> => {
    let endpoint = `/api/${FEATURE_STORE_API_VERSION}/metrics/recently_visited`;

    const queryParams: string[] = [];
    if (project) {
      queryParams.push(`project=${encodeURIComponent(project)}`);
    }
    if (limit) {
      queryParams.push(`limit=${limit}`);
    }

    if (queryParams.length > 0) {
      endpoint += `?${queryParams.join('&')}`;
    }

    return handleFeatureStoreFailures<RecentlyVisitedResponse>(proxyGET(hostPath, endpoint, opts));
  };
