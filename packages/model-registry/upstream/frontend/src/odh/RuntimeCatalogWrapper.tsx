import React from 'react';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  ModularArchContextProvider,
  ModularArchConfig,
  DeploymentMode,
  useSettings,
} from 'mod-arch-core';
import { ThemeProvider, Theme } from 'mod-arch-kubeflow';
import { Bullseye } from '@patternfly/react-core';
import useFetchDscStatus from '@odh-dashboard/internal/concepts/areas/useFetchDscStatus';
import { useExtensions } from '@odh-dashboard/plugin-core';
import {
  isTabRoutePageExtension,
  isTabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { AppContext } from '~/app/context/AppContext';
import NotificationListener from '~/odh/components/NotificationListener';
import OdhDevFeatureFlagOverridesProvider from '~/odh/components/OdhDevFeatureFlagOverridesProvider';
import UserInteractionProviderWrapper from '~/odh/components/UserInteractionProviderWrapper';
import RuntimeCatalogView from '~/odh/pages/runtimeCatalog/RuntimeCatalogView';
import RuntimeCatalogDetailsView from '~/odh/pages/runtimeCatalog/RuntimeCatalogDetailsView';
import { RUNTIME_CATALOG_TAB_ID } from '~/odh/pages/runtimeCatalog/const';

const RuntimeCatalogWrapperContent: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { configSettings, userSettings, loaded, loadError } = useSettings();
  const appContextValue = React.useMemo(
    () => (configSettings && userSettings ? { config: configSettings, user: userSettings } : null),
    [configSettings, userSettings],
  );
  if (loadError) {
    return <div>Error: {loadError.message}</div>;
  }
  if (!loaded) {
    return <Bullseye>Loading...</Bullseye>;
  }
  return appContextValue ? (
    <AppContext.Provider value={appContextValue}>
      <ThemeProvider theme={Theme.Patternfly}>
        <BrowserStorageContextProvider>
          <OdhDevFeatureFlagOverridesProvider crdOverrides={{}}>
            <NotificationContextProvider>
              <NotificationListener>
                <UserInteractionProviderWrapper>{children}</UserInteractionProviderWrapper>
              </NotificationListener>
            </NotificationContextProvider>
          </OdhDevFeatureFlagOverridesProvider>
        </BrowserStorageContextProvider>
      </ThemeProvider>
    </AppContext.Provider>
  ) : null;
};

export const RuntimeCatalogProviders: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [dscStatus] = useFetchDscStatus();
  const modularArchConfig: ModularArchConfig = {
    deploymentMode: DeploymentMode.Federated,
    URL_PREFIX,
    BFF_API_VERSION,
    mandatoryNamespace: dscStatus?.components?.modelregistry?.registriesNamespace,
  };
  return (
    <ModularArchContextProvider config={modularArchConfig}>
      <RuntimeCatalogWrapperContent>{children}</RuntimeCatalogWrapperContent>
    </ModularArchContextProvider>
  );
};

const RuntimeCatalogWrapper: React.FC = () => (
  <RuntimeCatalogProviders>
    <RuntimeCatalogView />
  </RuntimeCatalogProviders>
);

export const RuntimeCatalogDetailsWrapper: React.FC = () => <RuntimeCatalogDetailsContent />;

const RuntimeCatalogDetailsContent: React.FC = () => {
  const tabs = useExtensions(isTabRouteTabExtension);
  const pages = useExtensions(isTabRoutePageExtension);
  const tab = tabs.find((extension) => extension.properties.id === RUNTIME_CATALOG_TAB_ID);
  const page = pages.find((extension) => extension.properties.id === tab?.properties.pageId);
  if (!tab || !page) {
    return null;
  }

  const breadcrumbTab = tabs.find(
    (extension) =>
      extension.properties.pageId === page.properties.id &&
      extension.properties.id === page.properties.breadcrumbTabId,
  );

  return (
    <RuntimeCatalogProviders>
      <RuntimeCatalogDetailsView
        settingsHref={
          breadcrumbTab
            ? `${page.properties.href}/${breadcrumbTab.properties.id}`
            : page.properties.href
        }
        settingsTitle={page.properties.title}
        catalogHref={`${page.properties.href}/${tab.properties.id}`}
      />
    </RuntimeCatalogProviders>
  );
};

export default RuntimeCatalogWrapper;
