import * as React from 'react';
import useFetchState, {
  NotReadyError,
  type FetchStateCallbackPromise,
} from '@odh-dashboard/ui-core/hooks/useFetchState';
import { getCatalogQualityArtifacts } from '../api';
import {
  CatalogQualityArtifactList,
  QualityInsight,
  mapArtifactToQualityInsight,
} from '../qualityInsightsTypes';

type UseQualityArtifactsResult = {
  insights: QualityInsight[];
  loaded: boolean;
  loadError: Error | undefined;
};

const EMPTY_RESPONSE: CatalogQualityArtifactList = { items: [] };

/**
 * Upper bound on fetched pages. A well-behaved catalog response ends pagination
 * quickly; one that keeps minting fresh page tokens would otherwise loop (and
 * accumulate items) without limit.
 */
const MAX_PAGES = 100;

const fetchAllQualityArtifacts = async (
  fetchPage: (nextPageToken?: string) => Promise<CatalogQualityArtifactList>,
): Promise<CatalogQualityArtifactList> => {
  const items: CatalogQualityArtifactList['items'] = [];
  const seenTokens = new Set<string>();
  let nextPageToken: string | undefined;
  let pageCount = 0;

  do {
    if (++pageCount > MAX_PAGES) {
      throw new Error(
        `Catalog quality artifacts pagination exceeded ${MAX_PAGES} pages without completing.`,
      );
    }
    const response = await fetchPage(nextPageToken);
    items.push(...response.items);
    nextPageToken = response.nextPageToken?.trim() || undefined;

    if (nextPageToken && seenTokens.has(nextPageToken)) {
      throw new Error('Catalog quality artifacts pagination returned a repeated page token.');
    }
    if (nextPageToken) {
      seenTokens.add(nextPageToken);
    }
  } while (nextPageToken);

  return { items };
};

const useQualityArtifacts = (
  sourceId: string,
  modelName: string,
  namespace: string,
  pageSize?: number,
): UseQualityArtifactsResult => {
  const callback = React.useCallback<FetchStateCallbackPromise<CatalogQualityArtifactList>>(
    (opts) => {
      if (!namespace) {
        // The catalog instances namespace has not resolved yet — keep loading rather
        // than surfacing an error or issuing a request scoped to no namespace.
        return Promise.reject(new NotReadyError('Catalog instances namespace is not resolved'));
      }
      return fetchAllQualityArtifacts((nextPageToken) =>
        getCatalogQualityArtifacts(sourceId, modelName, namespace, pageSize, nextPageToken, opts),
      );
    },
    [sourceId, modelName, namespace, pageSize],
  );

  const [data, loaded, loadError] = useFetchState<CatalogQualityArtifactList>(
    callback,
    EMPTY_RESPONSE,
  );

  const insights = React.useMemo(() => data.items.map(mapArtifactToQualityInsight), [data.items]);

  return { insights, loaded, loadError };
};

export default useQualityArtifacts;
