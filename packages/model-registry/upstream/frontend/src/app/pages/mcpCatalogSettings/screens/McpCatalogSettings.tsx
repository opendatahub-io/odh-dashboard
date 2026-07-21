import * as React from 'react';
import { Button, EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { ApplicationsPage, ProjectObjectType, TitleWithIcon } from 'mod-arch-shared';
import {
  MCP_CATALOG_SETTINGS_PAGE_TITLE,
  MCP_CATALOG_SETTINGS_DESCRIPTION,
  mcpAddSourceUrl,
  MCP_ADD_SOURCE_TITLE,
} from '~/app/routes/mcpCatalogSettings/mcpCatalogSettings';
import { McpCatalogSettingsContext } from '~/app/context/mcpCatalogSettings/McpCatalogSettingsContext';
import { useUserInteraction } from '~/concepts/userInteraction';
import {
  MCP_CATALOG_SOURCES_EVENTS,
  countCustomMcpSources,
  countEnabledMcpSources,
  hasMcpSourceValidationErrors,
} from '~/app/pages/mcpCatalogSettings/tracking/mcpCatalogSourcesTracking';
import McpCatalogSourceConfigsTable from './McpCatalogSourceConfigsTable';

const McpCatalogSettings: React.FC = () => {
  const navigate = useNavigate();
  const { trackSimpleEvent, trackLinkEvent } = useUserInteraction();
  const hasTrackedSettingsViewed = React.useRef(false);
  const {
    mcpCatalogSourceConfigs,
    mcpCatalogSourceConfigsLoaded,
    mcpCatalogSourceConfigsLoadError,
    mcpCatalogSources,
    mcpCatalogSourcesLoaded,
    mcpCatalogSourcesLoadError,
    apiState,
    refreshMcpCatalogSourceConfigs,
  } = React.useContext(McpCatalogSettingsContext);

  const configs = React.useMemo(
    () => mcpCatalogSourceConfigs?.catalogs || [],
    [mcpCatalogSourceConfigs?.catalogs],
  );
  const isEmpty = mcpCatalogSourceConfigsLoaded && configs.length === 0;

  React.useEffect(() => {
    if (
      !mcpCatalogSourceConfigsLoaded ||
      !!mcpCatalogSourceConfigsLoadError ||
      hasTrackedSettingsViewed.current ||
      (!mcpCatalogSourcesLoaded && !mcpCatalogSourcesLoadError)
    ) {
      return;
    }
    hasTrackedSettingsViewed.current = true;
    trackSimpleEvent(MCP_CATALOG_SOURCES_EVENTS.SETTINGS_VIEWED, {
      totalSourcesCount: configs.length,
      enabledSourcesCount: countEnabledMcpSources(configs),
      hasValidationErrors: hasMcpSourceValidationErrors(configs, mcpCatalogSources?.items),
    });
  }, [
    configs,
    mcpCatalogSourceConfigsLoaded,
    mcpCatalogSourceConfigsLoadError,
    mcpCatalogSources?.items,
    mcpCatalogSourcesLoaded,
    mcpCatalogSourcesLoadError,
    trackSimpleEvent,
  ]);

  const handleAddSource = React.useCallback(() => {
    const href = mcpAddSourceUrl();
    trackLinkEvent(MCP_CATALOG_SOURCES_EVENTS.ADD_SOURCE_SELECTED, {
      href,
      section: 'MCP Catalog Sources',
      type: 'source',
      customSourcesCount: countCustomMcpSources(configs),
    });
    navigate(href);
  }, [configs, navigate, trackLinkEvent]);

  const handleDeleteSource = React.useCallback(
    async (sourceId: string): Promise<void> => {
      if (!apiState.apiAvailable) {
        throw new Error('API not available');
      }
      await apiState.api.deleteMcpCatalogSourceConfig({}, sourceId);
      refreshMcpCatalogSourceConfigs();
    },
    [apiState.api, apiState.apiAvailable, refreshMcpCatalogSourceConfigs],
  );

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon
          title={MCP_CATALOG_SETTINGS_PAGE_TITLE}
          objectType={ProjectObjectType.mcpCatalog}
        />
      }
      description={MCP_CATALOG_SETTINGS_DESCRIPTION}
      empty={isEmpty}
      emptyStatePage={
        <EmptyState
          headingLevel="h5"
          icon={PlusCircleIcon}
          titleText="No MCP sources"
          variant={EmptyStateVariant.lg}
          data-testid="mcp-catalog-settings-empty-state"
        >
          <EmptyStateBody>
            No MCP sources have been configured. Add a source to get started.
          </EmptyStateBody>
          <Button
            variant="primary"
            onClick={handleAddSource}
            data-testid="mcp-add-source-button-empty"
          >
            {MCP_ADD_SOURCE_TITLE}
          </Button>
        </EmptyState>
      }
      loaded={mcpCatalogSourceConfigsLoaded}
      loadError={mcpCatalogSourceConfigsLoadError}
      errorMessage="Unable to load MCP catalog source configurations."
      provideChildrenPadding
    >
      <McpCatalogSourceConfigsTable
        mcpCatalogSourceConfigs={configs}
        onAddSource={handleAddSource}
        onDeleteSource={handleDeleteSource}
      />
    </ApplicationsPage>
  );
};

export default McpCatalogSettings;
