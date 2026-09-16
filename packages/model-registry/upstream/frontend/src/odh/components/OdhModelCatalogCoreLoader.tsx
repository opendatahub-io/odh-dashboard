import * as React from 'react';
import { Link } from 'react-router-dom';
import { Bullseye } from '@patternfly/react-core';
import { useResolvedExtensions, useExtensions } from '@odh-dashboard/plugin-core';
import ModelCatalogCoreLoader from '~/app/pages/modelCatalog/ModelCatalogCoreLoader';
import {
  isAdminCheckExtension,
  isCatalogSettingsUrlExtension,
  isRegistrySettingsUrlExtension,
} from '~/odh/extension-points';
import { catalogSettingsUrl } from '~/app/routes/modelCatalogSettings/modelCatalogSettings';
import { REGISTRY_SETTINGS_PAGE_TITLE, REGISTRY_SETTINGS_URL } from '~/odh/const';
import { AdminStatusProvider } from '~/odh/context/AdminStatusContext';

const ADMIN_EMPTY_STATE_TITLE = 'Configure model sources';

/**
 * ODH-specific override of ModelCatalogCoreLoader that includes admin user detection
 * for showing the appropriate action link in empty states:
 * - Admin users see "Go to Model catalog settings" link
 * - Non-admin users see "Who's my administrator" link
 */
const OdhModelCatalogCoreLoader: React.FC = () => {
  const [adminCheckExtensions, adminCheckExtensionsLoaded] =
    useResolvedExtensions(isAdminCheckExtension);
  const catalogSettingsUrlExtensions = useExtensions(isCatalogSettingsUrlExtension);
  const registrySettingsUrlExtensions = useExtensions(isRegistrySettingsUrlExtension);

  const getCatalogSettingsUrl = (): string => {
    if (catalogSettingsUrlExtensions.length > 0) {
      return catalogSettingsUrlExtensions[0].properties.url;
    }
    return catalogSettingsUrl();
  };

  const catalogSettingsTitle =
    catalogSettingsUrlExtensions.length > 0 ? catalogSettingsUrlExtensions[0].properties.title : '';

  const registrySettingsUrl =
    registrySettingsUrlExtensions.length > 0
      ? registrySettingsUrlExtensions[0].properties.url
      : REGISTRY_SETTINGS_URL;
  const registrySettingsTitle =
    registrySettingsUrlExtensions.length > 0
      ? registrySettingsUrlExtensions[0].properties.title
      : REGISTRY_SETTINGS_PAGE_TITLE;

  const adminEmptyStateDescription = (
    <>
      There are no models to display. To add models to the catalog, add model sources to the{' '}
      <b>{catalogSettingsTitle}</b> page. If you&apos;ve already added sources, ensure that filters
      are not restricting all models from appearing in the catalog.
    </>
  );

  const adminAction = (
    <Link to={getCatalogSettingsUrl()}>
      Go to <b>{catalogSettingsTitle}</b>
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
          return (
            <AdminStatusProvider
              isAdmin={isAdmin}
              loaded={loaded}
              settingsUrl={registrySettingsUrl}
              settingsTitle={registrySettingsTitle}
            >
              <ModelCatalogCoreLoader
                {...(isAdmin && {
                  customAction: adminAction,
                  customEmptyStateTitle: ADMIN_EMPTY_STATE_TITLE,
                  customEmptyStateDescription: adminEmptyStateDescription,
                })}
              />
            </AdminStatusProvider>
          );
        }}
      </AdminCheckComponent>
    );
  }

  return <ModelCatalogCoreLoader />;
};

export default OdhModelCatalogCoreLoader;
