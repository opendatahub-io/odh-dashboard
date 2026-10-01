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
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { AppContext } from '~/app/context/AppContext';
import { ModelCatalogContextProvider } from '~/app/context/modelCatalog/ModelCatalogContext';
import RuntimeCatalogTabRoutes from '~/odh/pages/runtimeCatalog/RuntimeCatalogTabRoutes';
import RuntimeCatalogDetailsRoutes from '~/odh/pages/runtimeCatalog/RuntimeCatalogDetailsRoutes';
import NotificationListener from '~/odh/components/NotificationListener';
import OdhDevFeatureFlagOverridesProvider from '~/odh/components/OdhDevFeatureFlagOverridesProvider';
import UserInteractionProviderWrapper from '~/odh/components/UserInteractionProviderWrapper';

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
    <RuntimeCatalogTabRoutes />
  </RuntimeCatalogProviders>
);

export const RuntimeCatalogDetailsWrapper: React.FC = () => (
  <RuntimeCatalogProviders>
    <RuntimeCatalogDetailsRoutes />
  </RuntimeCatalogProviders>
);

export default RuntimeCatalogWrapper;
