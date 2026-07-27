import * as React from 'react';
import { Link } from 'react-router-dom';
import { Bullseye } from '@patternfly/react-core';
import { useResolvedExtensions, useExtensions } from '@odh-dashboard/plugin-core';
import McpCatalogCoreLoader from '~/app/pages/mcpCatalog/McpCatalogCoreLoader';
import { isAdminCheckExtension, isMcpCatalogSettingsUrlExtension } from '~/odh/extension-points';
import { mcpCatalogSettingsUrl } from '~/app/routes/mcpCatalogSettings/mcpCatalogSettings';

const ADMIN_EMPTY_STATE_TITLE = 'Configure MCP sources';

/**
 * ODH-specific override of McpCatalogCoreLoader that includes admin user detection
 * for showing the appropriate action link in empty states:
 * - Admin users see "Go to MCP catalog sources" link
 * - Non-admin users see "Who's my administrator" link
 */
const OdhMcpCatalogCoreLoader: React.FC = () => {
  const [adminCheckExtensions, adminCheckExtensionsLoaded] =
    useResolvedExtensions(isAdminCheckExtension);
  const mcpCatalogSettingsUrlExtensions = useExtensions(isMcpCatalogSettingsUrlExtension);

  const getMcpCatalogSettingsUrl = (): string => {
    if (mcpCatalogSettingsUrlExtensions.length > 0) {
      return mcpCatalogSettingsUrlExtensions[0].properties.url;
    }
    return mcpCatalogSettingsUrl();
  };

  const mcpCatalogSettingsTitle =
    mcpCatalogSettingsUrlExtensions.length > 0
      ? mcpCatalogSettingsUrlExtensions[0].properties.title
      : '';

  const adminEmptyStateDescription = (
    <>
      There are no MCP sources to display. To add MCP servers to the catalog, add MCP sources to the{' '}
      <b>{mcpCatalogSettingsTitle}</b> page. If you&apos;ve already added sources, ensure that
      filters are not restricting all servers from appearing in the catalog.
    </>
  );

  const adminAction = (
    <Link to={getMcpCatalogSettingsUrl()}>
      Go to <b>{mcpCatalogSettingsTitle}</b>
    </Link>
  );

  if (!adminCheckExtensionsLoaded) {
    return <Bullseye>Loading...</Bullseye>;
  }

  if (adminCheckExtensions.length > 0) {
    const AdminCheckComponent = adminCheckExtensions[0].properties.component.default;
    return (
      <AdminCheckComponent>
        {(isAdmin: boolean, loaded: boolean) => {
          if (!loaded) {
            return <Bullseye>Loading...</Bullseye>;
          }
          if (isAdmin) {
            return (
              <McpCatalogCoreLoader
                customAction={adminAction}
                customEmptyStateTitle={ADMIN_EMPTY_STATE_TITLE}
                customEmptyStateDescription={adminEmptyStateDescription}
              />
            );
          }
          return <McpCatalogCoreLoader />;
        }}
      </AdminCheckComponent>
    );
  }

  return <McpCatalogCoreLoader />;
};

export default OdhMcpCatalogCoreLoader;
