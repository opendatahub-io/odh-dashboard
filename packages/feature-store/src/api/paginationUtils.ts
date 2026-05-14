import { proxyGET } from '@odh-dashboard/internal/api/proxyUtils';
import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { handleFeatureStoreFailures } from './errorUtils';
import { FEATURE_STORE_PAGE_SIZE } from '../const';

const MAX_PAGES = 100;

// eslint-disable-next-line camelcase
type PaginatedResponse = { pagination: { has_next?: boolean; [key: string]: unknown } };

/** Merges `relationships` maps from all page responses into a single object. */
export const mergeRelationships = <R>(
  allResponses: { relationships?: Record<string, R[]> }[],
): Record<string, R[]> => Object.assign({}, ...allResponses.map((r) => r.relationships));

/** Fetches all pages from a paginated /all endpoint using `pagination.has_next`. */
export const fetchAllPages = async <T extends PaginatedResponse, TItem>(
  hostPath: string,
  endpoint: string,
  opts: K8sAPIOptions,
  getItems: (response: T) => TItem[],
  buildResult: (allItems: TItem[], allResponses: T[]) => T,
): Promise<T> => {
  const separator = endpoint.includes('?') ? '&' : '?';
  const allItems: TItem[] = [];
  const allResponses: T[] = [];
  let page = 1;
  let hasNext: boolean;

  do {
    const pageEndpoint = `${endpoint}${separator}limit=${FEATURE_STORE_PAGE_SIZE}&page=${page}`;
    // eslint-disable-next-line no-await-in-loop
    const response = await handleFeatureStoreFailures<T>(
      proxyGET(hostPath, pageEndpoint, {}, opts),
    );
    const items = getItems(response);
    allItems.push(...items);
    allResponses.push(response);
    hasNext = response.pagination.has_next ?? items.length >= FEATURE_STORE_PAGE_SIZE;
    page++;
  } while (hasNext && page <= MAX_PAGES);

  if (hasNext && page > MAX_PAGES) {
    // eslint-disable-next-line no-console
    console.warn(
      `[fetchAllPages] Reached maximum page limit (${MAX_PAGES}). Results may be incomplete for endpoint: ${endpoint}`,
    );
  }

  return buildResult(allItems, allResponses);
};
