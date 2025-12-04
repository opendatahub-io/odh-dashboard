import React from 'react';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  ModularArchContextProvider,
  ModularArchConfig,
  DeploymentMode,
} from 'mod-arch-core';
import { ThemeProvider, Theme } from 'mod-arch-kubeflow';
import AppRoutes from '~/app/AppRoutes';
import { NamespaceContextProvider } from '~/app/context/NamespaceContextProvider';
import { NotebookContextProvider } from '~/app/context/NotebookContext';
import { BFF_API_VERSION, MANDATORY_NAMESPACE, URL_PREFIX } from '~/shared/utilities/const';
import { AppContextProvider } from '~/app/context/AppContext';
import ToastNotifications from '~/app/standalone/ToastNotifications';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION,
  mandatoryNamespace: MANDATORY_NAMESPACE,
};

const NotebooksWrapper: React.FC = () => {
  return (
    <ModularArchContextProvider config={modularArchConfig}>
      <ThemeProvider theme={Theme.Patternfly}>
        <BrowserStorageContextProvider>
          <NotificationContextProvider>
            <AppContextProvider>
              <NotebookContextProvider>
                <NamespaceContextProvider>
                  <AppRoutes />
                  <ToastNotifications />
                </NamespaceContextProvider>
              </NotebookContextProvider>
            </AppContextProvider>
          </NotificationContextProvider>
        </BrowserStorageContextProvider>
      </ThemeProvider>
    </ModularArchContextProvider>
  );
};
export default NotebooksWrapper;
