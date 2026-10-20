import * as React from 'react';
import { useFetchState, FetchStateCallbackPromise, APIOptions } from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { getCatalogSecurityArtifacts } from './getCatalogSecurityArtifacts';
import {
  CatalogSecurityArtifactList,
  SecurityInsight,
  mapArtifactToInsight,
} from './securityInsightsTypes';

const MODEL_CATALOG_HOST_PATH = `${URL_PREFIX}/api/${BFF_API_VERSION}/model_catalog`;

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
      getCatalogSecurityArtifacts(MODEL_CATALOG_HOST_PATH)(
        opts,
        sourceId,
        modelName,
        namespace,
        pageSize,
      ),
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
