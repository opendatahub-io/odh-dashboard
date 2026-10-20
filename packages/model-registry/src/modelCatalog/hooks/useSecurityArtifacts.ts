import * as React from 'react';
import useFetchState, {
  type FetchStateCallbackPromise,
} from '@odh-dashboard/ui-core/hooks/useFetchState';
import { getCatalogSecurityArtifacts } from '../api';
import {
  CatalogSecurityArtifactList,
  SecurityInsight,
  mapArtifactToInsight,
} from '../securityInsightsTypes';

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
    (opts) => getCatalogSecurityArtifacts(sourceId, modelName, namespace, pageSize, opts),
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
