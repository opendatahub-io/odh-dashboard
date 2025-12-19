import * as React from 'react';
import { Link } from 'react-router-dom';
import { Bullseye } from '@patternfly/react-core';
import { WhosMyAdministrator } from 'mod-arch-shared';
import { useResolvedExtensions, useExtensions } from '@odh-dashboard/plugin-core';
import ModelCatalogCoreLoader from '~/app/pages/modelCatalog/ModelCatalogCoreLoader';
import { isAdminCheckExtension, isCatalogSettingsUrlExtension } from '~/odh/extension-points';
import {
  CATALOG_SETTINGS_PAGE_TITLE,
  catalogSettingsUrl,
} from '~/app/routes/modelCatalogSettings/modelCatalogSettings';

/**
 * ODH-specific override of ModelCatalogCoreLoader that includes admin user detection
 * for showing the appropriate action link in empty states:
 * - Admin users see "Go to AI catalog settings" link
 * - Non-admin users see "Who's my administrator" link
 */
const OdhModelCatalogCoreLoader: React.FC = () => {
  const [adminCheckExtensions, adminCheckExtensionsLoaded] =
    useResolvedExtensions(isAdminCheckExtension);
  const catalogSettingsUrlExtensions = useExtensions(isCatalogSettingsUrlExtension);

  // Get the catalog settings URL from the extension, with a fallback
  const getCatalogSettingsUrl = (): string => {
    if (catalogSettingsUrlExtensions.length > 0) {
      return catalogSettingsUrlExtensions[0].properties.getUrl();
    }
    // Fallback to the default URL
    return catalogSettingsUrl();
  };

  // Get the catalog settings title from the extension, with a fallback
  const getCatalogSettingsTitle = (): string => {
    if (catalogSettingsUrlExtensions.length > 0) {
      return catalogSettingsUrlExtensions[0].properties.title;
    }
    return CATALOG_SETTINGS_PAGE_TITLE;
  };

  // Create the custom action based on admin status
  const getCustomAction = (isAdmin: boolean): React.ReactNode => {
    if (isAdmin) {
      return (
        <Link to={getCatalogSettingsUrl()}>
          Go to <b>{getCatalogSettingsTitle()}</b>
        </Link>
      );
    }
    return <WhosMyAdministrator />;
  };

  // Wait for admin check extension to load
  if (!adminCheckExtensionsLoaded) {
    return <Bullseye>Loading...</Bullseye>;
  }

  // If an admin check extension is provided and loaded, use it
  if (adminCheckExtensions.length > 0) {
    const AdminCheckComponent = adminCheckExtensions[0].properties.component.default;
    return (
      <AdminCheckComponent>
        {(isAdmin: boolean, loaded: boolean) => {
          if (!loaded) {
            return <Bullseye>Loading...</Bullseye>;
          }
          return <ModelCatalogCoreLoader customAction={getCustomAction(isAdmin)} />;
        }}
      </AdminCheckComponent>
    );
  }

  // Fallback: no admin check extension, default to non-admin view
  return <ModelCatalogCoreLoader customAction={getCustomAction(false)} />;
};

export default OdhModelCatalogCoreLoader;
