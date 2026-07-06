import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { ApplicationsPage } from 'mod-arch-shared';
import {
  MCP_CATALOG_SETTINGS_PAGE_TITLE,
  MCP_ADD_SOURCE_TITLE,
  MCP_ADD_SOURCE_DESCRIPTION,
  MCP_MANAGE_SOURCE_TITLE,
  MCP_MANAGE_SOURCE_DESCRIPTION,
  mcpCatalogSettingsUrl,
} from '~/app/routes/mcpCatalogSettings/mcpCatalogSettings';

const McpManageSourcePage: React.FC = () => {
  const { catalogSourceId } = useParams<{ catalogSourceId?: string }>();
  const isAddMode = !catalogSourceId;
  const pageTitle = isAddMode ? MCP_ADD_SOURCE_TITLE : MCP_MANAGE_SOURCE_TITLE;
  const description = isAddMode ? MCP_ADD_SOURCE_DESCRIPTION : MCP_MANAGE_SOURCE_DESCRIPTION;

  return (
    <ApplicationsPage
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to={mcpCatalogSettingsUrl()}>{MCP_CATALOG_SETTINGS_PAGE_TITLE}</Link>
          </BreadcrumbItem>
          <BreadcrumbItem data-testid="mcp-breadcrumb-source-action" isActive>
            {pageTitle}
          </BreadcrumbItem>
        </Breadcrumb>
      }
      title={pageTitle}
      description={description}
      empty={false}
      loaded
      provideChildrenPadding
    >
      {/* Placeholder — form will be added when data consumption is implemented */}
    </ApplicationsPage>
  );
};

export default McpManageSourcePage;
