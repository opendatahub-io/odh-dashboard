import * as React from 'react';
import { Link } from 'react-router-dom';
import { Bullseye } from '@patternfly/react-core';
import { useResolvedExtensions, useExtensions } from '@odh-dashboard/plugin-core';
import ModelCatalogCoreLoader from '~/app/pages/modelCatalog/ModelCatalogCoreLoader';
import { isAdminCheckExtension, isCatalogSettingsUrlExtension } from '~/odh/extension-points';
import { catalogSettingsUrl } from '~/app/routes/modelCatalogSettings/modelCatalogSettings';

const ADMIN_EMPTY_STATE_TITLE = 'Configure model sources';
const ADMIN_EMPTY_STATE_DESCRIPTION = (
  <>
    There are no models to display. To add models to the catalog, add model sources to the{' '}
    <b>Model catalog settings</b> page. If you've already added sources, ensure that filters are not
    restricting all models from appearing in the catalog.
  </>
);
const MODEL_CATALOG_SETTINGS_LINK_TEXT = 'Model catalog settings';

/**
 * ODH-specific override of ModelCatalogCoreLoader that includes admin user detection
 * for showing the appropriate action link in empty states:
 * - Admin users see "Go to AI catalog sources" link
 * - Non-admin users see "Who's my administrator" link
 */
const OdhModelCatalogCoreLoader: React.FC = () => {
  const [adminCheckExtensions, adminCheckExtensionsLoaded] =
    useResolvedExtensions(isAdminCheckExtension);
  const catalogSettingsUrlExtensions = useExtensions(isCatalogSettingsUrlExtension);

  const getCatalogSettingsUrl = (): string => {
    if (catalogSettingsUrlExtensions.length > 0) {
      return catalogSettingsUrlExtensions[0].properties.url;
    }
    return catalogSettingsUrl();
  };

  const adminAction = (
    <Link to={getCatalogSettingsUrl()}>
      Go to <b>{MODEL_CATALOG_SETTINGS_LINK_TEXT}</b>
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
            return <ModelCatalogCoreLoader />;
          }
          if (isAdmin) {
            return (
              <ModelCatalogCoreLoader
                customAction={adminAction}
                customEmptyStateTitle={ADMIN_EMPTY_STATE_TITLE}
                customEmptyStateDescription={ADMIN_EMPTY_STATE_DESCRIPTION}
              />
            );
          }
          return <ModelCatalogCoreLoader />;
        }}
      </AdminCheckComponent>
    );
  }

  return <ModelCatalogCoreLoader />;
};

export default OdhModelCatalogCoreLoader;
