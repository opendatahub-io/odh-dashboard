import * as React from 'react';
import { useFetchState, FetchStateCallbackPromise, APIOptions } from 'mod-arch-core';
import { getCatalogQualityArtifacts } from '~/app/api/k8s';
import {
  CatalogQualityArtifactList,
  QualityInsight,
  mapArtifactToQualityInsight,
} from '~/app/pages/modelCatalog/qualityInsightsTypes';

type UseQualityArtifactsResult = {
  insights: QualityInsight[];
  loaded: boolean;
  loadError: Error | undefined;
};

const EMPTY_RESPONSE: CatalogQualityArtifactList = { items: [] };

const fetchAllQualityArtifacts = async (
  fetchPage: (nextPageToken?: string) => Promise<CatalogQualityArtifactList>,
): Promise<CatalogQualityArtifactList> => {
  const items: CatalogQualityArtifactList['items'] = [];
  const seenTokens = new Set<string>();
  let nextPageToken: string | undefined;

  do {
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
    (opts: APIOptions) =>
      fetchAllQualityArtifacts((nextPageToken) =>
        getCatalogQualityArtifacts(
          '',
          sourceId,
          modelName,
          namespace,
          pageSize,
          nextPageToken,
        )(opts),
      ),
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
