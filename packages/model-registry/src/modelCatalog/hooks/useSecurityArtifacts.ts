import * as React from 'react';
import useFetchState, {
  NotReadyError,
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
    (opts) => {
      if (!namespace) {
        // The catalog instances namespace has not resolved yet — keep loading rather
        // than surfacing an error or issuing a request scoped to no namespace.
        return Promise.reject(new NotReadyError('Catalog instances namespace is not resolved'));
      }
      return getCatalogSecurityArtifacts(sourceId, modelName, namespace, pageSize, opts);
    },
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
