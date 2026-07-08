import * as React from 'react';
import { useFetchState, FetchStateCallbackPromise, APIOptions } from 'mod-arch-core';
import { getCatalogSecurityArtifacts } from '~/app/api/k8s';
import {
  CatalogSecurityArtifactList,
  SecurityInsight,
  mapArtifactToInsight,
} from '~/app/pages/modelCatalog/securityInsightsTypes';

type UseSecurityArtifactsResult = {
  insights: SecurityInsight[];
  loaded: boolean;
  loadError: Error | undefined;
};

const EMPTY_RESPONSE: CatalogSecurityArtifactList = { items: [] };

const useSecurityArtifacts = (
  sourceId: string,
  modelName: string,
  namespace: string,
  pageSize?: number,
): UseSecurityArtifactsResult => {
  const callback = React.useCallback<FetchStateCallbackPromise<CatalogSecurityArtifactList>>(
    (opts: APIOptions) =>
      getCatalogSecurityArtifacts('', sourceId, modelName, namespace, pageSize)(opts),
    [sourceId, modelName, namespace, pageSize],
  );

  const [data, loaded, loadError] = useFetchState<CatalogSecurityArtifactList>(
    callback,
    EMPTY_RESPONSE,
  );

  const insights = React.useMemo(() => data.items.map(mapArtifactToInsight), [data.items]);

  return { insights, loaded, loadError };
};

export default useSecurityArtifacts;
