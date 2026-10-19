import React from 'react';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  useSettings,
} from 'mod-arch-core';
import { ThemeProvider, Theme } from 'mod-arch-kubeflow';
import { Bullseye } from '@patternfly/react-core';
import McpCatalogSettingsRoutes from '~/app/pages/mcpCatalogSettings/McpCatalogSettingsRoutes';
import { AppContext } from '~/app/context/AppContext';
import UserInteractionProviderWrapper from '~/odh/components/UserInteractionProviderWrapper';
import OdhWrapper from '~/odh/OdhWrapper';

const McpCatalogSettingsRoutesWrapperContent: React.FC = () => {
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
          <NotificationContextProvider>
            <UserInteractionProviderWrapper>
              <McpCatalogSettingsRoutes />
            </UserInteractionProviderWrapper>
          </NotificationContextProvider>
        </BrowserStorageContextProvider>
      </ThemeProvider>
    </AppContext.Provider>
  ) : null;
};

const McpCatalogSettingsRoutesWrapper: React.FC = () => (
  <OdhWrapper>
    <McpCatalogSettingsRoutesWrapperContent />
  </OdhWrapper>
);

export default McpCatalogSettingsRoutesWrapper;
