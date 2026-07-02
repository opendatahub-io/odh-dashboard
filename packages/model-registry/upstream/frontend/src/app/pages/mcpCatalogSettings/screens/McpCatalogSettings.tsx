import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { ApplicationsPage, ProjectObjectType, TitleWithIcon } from 'mod-arch-shared';
import {
  MCP_CATALOG_SETTINGS_PAGE_TITLE,
  MCP_CATALOG_SETTINGS_DESCRIPTION,
  mcpAddSourceUrl,
  MCP_ADD_SOURCE_TITLE,
} from '~/app/routes/mcpCatalogSettings/mcpCatalogSettings';

const McpCatalogSettings: React.FC = () => {
  const navigate = useNavigate();

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon
          title={MCP_CATALOG_SETTINGS_PAGE_TITLE}
          objectType={ProjectObjectType.mcpCatalog}
        />
      }
      description={MCP_CATALOG_SETTINGS_DESCRIPTION}
      empty
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
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button
                variant="primary"
                onClick={() => navigate(mcpAddSourceUrl())}
                data-testid="mcp-add-source-button-empty"
              >
                {MCP_ADD_SOURCE_TITLE}
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      }
      loaded
      provideChildrenPadding
    />
  );
};

export default McpCatalogSettings;
