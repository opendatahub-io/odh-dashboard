import { proxyGET } from '@odh-dashboard/internal/api/proxyUtils';
import { K8sAPIOptions } from '@odh-dashboard/k8s-core';
import { handleFeatureStoreFailures } from './errorUtils';
import { FEATURE_STORE_PAGE_SIZE } from '../const';
import { FeatureStorePagination } from '../types/global';

const MAX_PAGES = 100;

type PaginatedResponse = { pagination: Partial<FeatureStorePagination> & Record<string, unknown> };

/** Merges `relationships` maps from all page responses, concatenating arrays per key. */
export const mergeRelationships = <R>(
  allResponses: { relationships?: Record<string, R[]> }[],
): Record<string, R[]> => {
  const merged: Record<string, R[]> = {};
  for (const { relationships } of allResponses) {
    if (relationships) {
      for (const [key, value] of Object.entries(relationships)) {
        merged[key] = key in merged ? [...merged[key], ...value] : [...value];
      }
    }
  }
  return merged;
};

/** Fetches all pages from a paginated /all endpoint. */
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

    const pag: Record<string, unknown> = response.pagination;
    if (typeof pag.hasNext === 'boolean') {
      hasNext = pag.hasNext;
    } else {
      hasNext = items.length >= FEATURE_STORE_PAGE_SIZE;
    }
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
