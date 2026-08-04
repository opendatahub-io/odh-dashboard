import React from 'react';
import { McpCatalogSettingsContext } from '~/app/context/mcpCatalogSettings/McpCatalogSettingsContext';
import { McpCatalogSettingsAPIState } from './useMcpCatalogSettingsAPIState';

type UseMcpCatalogSettingsAPI = McpCatalogSettingsAPIState & {
  refreshAllAPI: () => void;
};

export const useMcpCatalogSettingsAPI = (): UseMcpCatalogSettingsAPI => {
  const { apiState, refreshAPIState: refreshAllAPI } = React.useContext(McpCatalogSettingsContext);

  return {
    refreshAllAPI,
    ...apiState,
  };
};
