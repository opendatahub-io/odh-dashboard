import { proxyGET } from '#~/api/proxyUtils';
import { K8sAPIOptions } from '#~/k8sTypes';
import { FEATURE_STORE_API_VERSION } from '#~/pages/featureStore/const';
import { EntityList, ProjectList } from '#~/pages/featureStore/types';
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
