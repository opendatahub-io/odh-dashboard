import { proxyGET } from '#~/api/proxyUtils';
import { K8sAPIOptions } from '#~/k8sTypes';
import { FEATURE_STORE_API_VERSION } from '#~/pages/featureStore/const';
import { EntityList } from '#~/pages/featureStore/types/entities';
import { ProjectList } from '#~/pages/featureStore/types/featureStoreProjects';
import { FeatureViewsList } from '#~/pages/featureStore/types/featureView.ts';
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
    let endpoint = `/api/${FEATURE_STORE_API_VERSION}/entities/all`;
    if (project) {
      endpoint = `/api/${FEATURE_STORE_API_VERSION}/entities?project=${encodeURIComponent(
        project,
      )}`;
    }

    return handleFeatureStoreFailures<EntityList>(proxyGET(hostPath, endpoint, opts));
  };

export const getFeatureViews =
  (hostPath: string) =>
  (opts: K8sAPIOptions, project?: string): Promise<FeatureViewsList> => {
    let endpoint = `/api/${FEATURE_STORE_API_VERSION}/feature_views/all`;
    if (project) {
      endpoint = `/api/${FEATURE_STORE_API_VERSION}/feature_views?project=${encodeURIComponent(
        project,
      )}`;
    }

    return handleFeatureStoreFailures<FeatureViewsList>(proxyGET(hostPath, endpoint, opts));
  };
