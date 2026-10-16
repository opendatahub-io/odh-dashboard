import React from 'react';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  useSettings,
} from 'mod-arch-core';
import { ThemeProvider, Theme } from 'mod-arch-kubeflow';
import { Bullseye } from '@patternfly/react-core';
import { AppContext } from '~/app/context/AppContext';
import { ModelCatalogContextProvider } from '~/app/context/modelCatalog/ModelCatalogContext';
import RuntimeCatalogTabRoutes from '~/odh/pages/runtimeCatalog/RuntimeCatalogTabRoutes';
import RuntimeCatalogDetailsRoutes from '~/odh/pages/runtimeCatalog/RuntimeCatalogDetailsRoutes';
import NotificationListener from '~/odh/components/NotificationListener';
import OdhDevFeatureFlagOverridesProvider from '~/odh/components/OdhDevFeatureFlagOverridesProvider';
import UserInteractionProviderWrapper from '~/odh/components/UserInteractionProviderWrapper';
import OdhWrapper from '~/odh/OdhWrapper';

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
                <UserInteractionProviderWrapper>
                  <ModelCatalogContextProvider>{children}</ModelCatalogContextProvider>
                </UserInteractionProviderWrapper>
              </NotificationListener>
            </NotificationContextProvider>
          </OdhDevFeatureFlagOverridesProvider>
        </BrowserStorageContextProvider>
      </ThemeProvider>
    </AppContext.Provider>
  ) : null;
};

export const RuntimeCatalogProviders: React.FC<React.PropsWithChildren> = ({ children }) => (
  <OdhWrapper>
    <RuntimeCatalogWrapperContent>{children}</RuntimeCatalogWrapperContent>
  </OdhWrapper>
);

const RuntimeCatalogWrapper: React.FC = () => (
  <RuntimeCatalogProviders>
    <RuntimeCatalogTabRoutes />
  </RuntimeCatalogProviders>
);

export const RuntimeCatalogDetailsWrapper: React.FC = () => (
  <RuntimeCatalogProviders>
    <RuntimeCatalogDetailsRoutes />
  </RuntimeCatalogProviders>
);

export default RuntimeCatalogWrapper;
