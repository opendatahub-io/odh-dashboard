import React from 'react';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  useSettings,
} from 'mod-arch-core';
import { ThemeProvider, Theme } from 'mod-arch-kubeflow';
import { Bullseye } from '@patternfly/react-core';
import { AppContext } from '~/app/context/AppContext';
import McpCatalogRoutes from '~/app/pages/mcpCatalog/McpCatalogRoutes';
import NotificationListener from '~/odh/components/NotificationListener';
import OdhDevFeatureFlagOverridesProvider from '~/odh/components/OdhDevFeatureFlagOverridesProvider';
import UserInteractionProviderWrapper from '~/odh/components/UserInteractionProviderWrapper';
import OdhWrapper from '~/odh/OdhWrapper';

const McpCatalogWrapperContent: React.FC = () => {
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
                  <McpCatalogRoutes />
                </UserInteractionProviderWrapper>
              </NotificationListener>
            </NotificationContextProvider>
          </OdhDevFeatureFlagOverridesProvider>
        </BrowserStorageContextProvider>
      </ThemeProvider>
    </AppContext.Provider>
  ) : null;
};

const McpCatalogWrapper: React.FC = () => (
  <OdhWrapper>
    <McpCatalogWrapperContent />
  </OdhWrapper>
);
export default McpCatalogWrapper;
