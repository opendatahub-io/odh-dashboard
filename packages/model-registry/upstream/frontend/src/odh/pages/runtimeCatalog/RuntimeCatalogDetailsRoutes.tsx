import * as React from 'react';
import { useExtensions } from '@odh-dashboard/plugin-core';
import {
  isTabRoutePageExtension,
  isTabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { RUNTIME_CATALOG_TAB_ID } from '~/odh/routes/runtimeCatalog/runtimeCatalog';
import RuntimeCatalogDetailsView from './RuntimeCatalogDetailsView';

const RuntimeCatalogDetailsRoutes: React.FC = () => {
  const tabs = useExtensions(isTabRouteTabExtension);
  const pages = useExtensions(isTabRoutePageExtension);
  const tab = tabs.find((extension) => extension.properties.id === RUNTIME_CATALOG_TAB_ID);
  const page = pages.find((extension) => extension.properties.id === tab?.properties.pageId);
  const breadcrumbTab = tabs.find(
    (extension) =>
      extension.properties.pageId === page?.properties.id &&
      extension.properties.id === page.properties.breadcrumbTabId,
  );

  return tab && page ? (
    <RuntimeCatalogDetailsView
      breadcrumbs={[
        {
          title: page.properties.title,
          href: breadcrumbTab
            ? `${page.properties.href}/${breadcrumbTab.properties.id}`
            : page.properties.href,
        },
        {
          title: tab.properties.title,
          href: `${page.properties.href}/${tab.properties.id}`,
        },
      ]}
    />
  ) : null;
};

export default RuntimeCatalogDetailsRoutes;
