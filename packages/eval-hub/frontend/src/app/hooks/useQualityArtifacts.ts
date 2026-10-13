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

const useQualityArtifacts = (
  sourceId: string,
  modelName: string,
  namespace: string,
  pageSize?: number,
): UseQualityArtifactsResult => {
  const callback = React.useCallback<FetchStateCallbackPromise<CatalogQualityArtifactList>>(
    (opts: APIOptions) =>
      getCatalogQualityArtifacts('', sourceId, modelName, namespace, pageSize)(opts),
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
