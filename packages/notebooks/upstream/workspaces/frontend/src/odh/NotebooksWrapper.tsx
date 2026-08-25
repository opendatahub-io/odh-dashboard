import React, { useMemo } from 'react';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  ModularArchContextProvider,
  ModularArchConfig,
  DeploymentMode,
  useSettings,
} from 'mod-arch-core';
import { ThemeProvider, Theme } from 'mod-arch-kubeflow';
import { Bullseye } from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import { Spinner } from '@patternfly/react-core/dist/esm/components/Spinner';
import AppRoutes from '~/app/AppRoutes';
import { NotebookContextProvider } from '~/app/context/NotebookContext';
import { BFF_API_VERSION, MANDATORY_NAMESPACE, URL_PREFIX } from '~/shared/utilities/const';
import { AppContext } from '~/app/context/AppContext';
import ToastNotifications from '~/app/standalone/ToastNotifications';

const NotebooksWrapperContent: React.FC = () => {
  const { configSettings, userSettings, loaded, loadError } = useSettings();

  const contextValue = useMemo(
    () => ({ config: configSettings, user: userSettings }),
    [configSettings, userSettings],
  );

  if (loadError) {
    return (
      <Bullseye>
        <div>Unable to load application settings. Please try again later.</div>
      </Bullseye>
    );
  }

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner size="xl" />
      </Bullseye>
    );
  }

  return configSettings && userSettings ? (
    <AppContext.Provider value={contextValue}>
      <ThemeProvider theme={Theme.Patternfly}>
        <BrowserStorageContextProvider>
          <NotificationContextProvider>
            <NotebookContextProvider>
              <AppRoutes />
              <ToastNotifications />
            </NotebookContextProvider>
          </NotificationContextProvider>
        </BrowserStorageContextProvider>
      </ThemeProvider>
    </AppContext.Provider>
  ) : null;
};

const NotebooksWrapper: React.FC = () => {
  const modularArchConfig: ModularArchConfig = {
    deploymentMode: DeploymentMode.Federated,
    URL_PREFIX,
    BFF_API_VERSION,
    mandatoryNamespace: MANDATORY_NAMESPACE,
  };

  return (
    <ModularArchContextProvider config={modularArchConfig}>
      <NotebooksWrapperContent />
    </ModularArchContextProvider>
  );
};

export default NotebooksWrapper;
