import React from 'react';
import { APIState, useAPIState, useQueryParamNamespaces } from 'mod-arch-core';
import {
  getServingRuntime,
  getServingRuntimeFilterOptionList,
  getServingRuntimeList,
  getServingRuntimeVersions,
} from '~/odh/api/servingRuntimeCatalog/service';
import { ServingRuntimeCatalogAPIs } from '~/odh/types/servingRuntimeCatalogTypes';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

export type ServingRuntimeCatalogAPIState = APIState<ServingRuntimeCatalogAPIs>;

const SERVING_RUNTIME_CATALOG_PATH = `${URL_PREFIX}/api/${BFF_API_VERSION}/serving_runtime_catalog`;

export const useServingRuntimeCatalogAPI = (): ServingRuntimeCatalogAPIState => {
  const queryParams = useQueryParamNamespaces();
  const createAPI = React.useCallback(
    (path: string): ServingRuntimeCatalogAPIs => ({
      getServingRuntimeList: getServingRuntimeList(path, queryParams),
      getServingRuntime: getServingRuntime(path, queryParams),
      getServingRuntimeVersions: getServingRuntimeVersions(path, queryParams),
      getServingRuntimeFilterOptionList: getServingRuntimeFilterOptionList(path, queryParams),
    }),
    [queryParams],
  );
  const [apiState] = useAPIState(
    queryParams.namespace ? SERVING_RUNTIME_CATALOG_PATH : null,
    createAPI,
  );
  return apiState;
};
