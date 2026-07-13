import { FetchState, FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import React from 'react';
import { McpCatalogSourceConfigList } from '~/app/mcpServerCatalogTypes';
import { McpCatalogSettingsAPIState } from './useMcpCatalogSettingsAPIState';

export const useMcpCatalogSourceConfigs = (
  apiState: McpCatalogSettingsAPIState,
): FetchState<McpCatalogSourceConfigList> => {
  const call = React.useCallback<FetchStateCallbackPromise<McpCatalogSourceConfigList>>(
    (opts) => {
      if (!apiState.apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      return apiState.api.getMcpCatalogSourceConfigs(opts);
    },
    [apiState],
  );
  return useFetchState(call, { catalogs: [] }, { initialPromisePurity: true });
};
