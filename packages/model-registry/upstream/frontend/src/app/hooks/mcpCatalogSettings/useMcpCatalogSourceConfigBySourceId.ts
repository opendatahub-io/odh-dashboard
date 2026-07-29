import { FetchState, FetchStateCallbackPromise, NotReadyError, useFetchState } from 'mod-arch-core';
import * as React from 'react';
import { McpCatalogSourceConfig } from '~/app/mcpServerCatalogTypes';
import { McpCatalogSettingsContext } from '~/app/context/mcpCatalogSettings/McpCatalogSettingsContext';

type State = McpCatalogSourceConfig | null;

export const useMcpCatalogSourceConfigBySourceId = (sourceId: string): FetchState<State> => {
  const { apiState } = React.useContext(McpCatalogSettingsContext);
  const call = React.useCallback<FetchStateCallbackPromise<State>>(
    (opts) => {
      if (!apiState.apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }
      if (!sourceId) {
        return Promise.reject(new NotReadyError('No source id'));
      }

      return apiState.api.getMcpCatalogSourceConfig(opts, sourceId);
    },
    [apiState, sourceId],
  );
  return useFetchState(call, null, { initialPromisePurity: true });
};
