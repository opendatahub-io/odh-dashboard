import type { K8sAPIOptions } from '@odh-dashboard/k8s-core';
import type { CatalogSecurityArtifactList } from './securityInsightsTypes';
import type { CatalogQualityArtifactList } from './qualityInsightsTypes';

const URL_PREFIX = '/model-registry';
const BFF_API_VERSION = 'v1';

/** Base path of the model-registry BFF model catalog routes. */
export const MODEL_CATALOG_API_PATH = `${URL_PREFIX}/api/${BFF_API_VERSION}/model_catalog/sources`;

/**
 * Fixed query parameters identifying evaluation-metrics quality artifacts. The
 * model-registry BFF `artifacts` catch-all forwards these filters to the model
 * catalog service, mirroring the filter enforcement the eval-hub proxy route
 * used to apply server-side.
 */
export const QUALITY_ARTIFACT_TYPE = 'metrics-artifact';
export const QUALITY_FILTER_QUERY = 'metricsType.string_value="evaluation-metrics"';

type CatalogArtifactsEnvelope<T> = { data?: T };

const fetchCatalogArtifacts = async <T>(
  path: string,
  queryParams: Record<string, string>,
  opts: K8sAPIOptions,
): Promise<T> => {
  const params = new URLSearchParams(queryParams);
  const resp = await fetch(`${MODEL_CATALOG_API_PATH}/${path}?${params.toString()}`, {
    signal: opts.signal,
    headers: { Accept: 'application/json' },
  });
  if (!resp.ok) {
    throw new Error(`Catalog artifacts request failed with status ${resp.status}.`);
  }
  const json: CatalogArtifactsEnvelope<T> = await resp.json();
  if (!json.data) {
    throw new Error('Invalid response format');
  }
  return json.data;
};

export const getCatalogSecurityArtifacts = (
  sourceId: string,
  modelName: string,
  namespace: string,
  pageSize?: number,
  opts: K8sAPIOptions = {},
): Promise<CatalogSecurityArtifactList> => {
  const queryParams: Record<string, string> = { namespace };
  if (pageSize != null) {
    queryParams.pageSize = String(pageSize);
  }
  return fetchCatalogArtifacts<CatalogSecurityArtifactList>(
    `${encodeURIComponent(sourceId)}/security_artifacts/${encodeURIComponent(modelName)}`,
    queryParams,
    opts,
  );
};

export const getCatalogQualityArtifacts = (
  sourceId: string,
  modelName: string,
  namespace: string,
  pageSize?: number,
  nextPageToken?: string,
  opts: K8sAPIOptions = {},
): Promise<CatalogQualityArtifactList> => {
  const queryParams: Record<string, string> = {
    namespace,
    artifactType: QUALITY_ARTIFACT_TYPE,
    filterQuery: QUALITY_FILTER_QUERY,
  };
  if (pageSize != null) {
    queryParams.pageSize = String(pageSize);
  }
  if (nextPageToken) {
    queryParams.nextPageToken = nextPageToken;
  }
  return fetchCatalogArtifacts<CatalogQualityArtifactList>(
    `${encodeURIComponent(sourceId)}/artifacts/${encodeURIComponent(modelName)}`,
    queryParams,
    opts,
  );
};
