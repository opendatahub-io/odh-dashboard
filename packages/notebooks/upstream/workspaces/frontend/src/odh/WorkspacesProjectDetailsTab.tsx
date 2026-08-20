/* eslint-disable @cspell/spellchecker */
import React, { useMemo } from 'react';
import {
  ModularArchContextProvider,
  BrowserStorageContextProvider,
  NotificationContextProvider,
  DeploymentMode,
  useSettings,
} from 'mod-arch-core';
import { ThemeProvider, Theme } from 'mod-arch-kubeflow';
import { Bullseye } from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import { Spinner } from '@patternfly/react-core/dist/esm/components/Spinner';
import { AppContext } from '~/app/context/AppContext';
import { NotebookContextProvider } from '~/app/context/NotebookContext';
import { WorkspacesWrapper } from '~/app/pages/Workspaces/WorkspacesWrapper';
import { BFF_API_VERSION, URL_PREFIX } from '~/shared/utilities/const';
import ToastNotifications from '~/app/standalone/ToastNotifications';

type WorkspacesProjectDetailsTabProps = {
  namespace?: string;
};

const WorkspacesProjectDetailsTabContent: React.FC = () => {
  const { configSettings, userSettings, loaded, loadError } = useSettings();

  const contextValue = useMemo(
    () => ({
      config: configSettings,
      user: userSettings,
    }),
    [configSettings, userSettings],
  );

  if (loadError) {
    return (
      <Bullseye>
        <div>Error loading settings: {loadError.message}</div>
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
              <WorkspacesWrapper />
              <ToastNotifications />
            </NotebookContextProvider>
          </NotificationContextProvider>
        </BrowserStorageContextProvider>
      </ThemeProvider>
    </AppContext.Provider>
  ) : null;
};

const WorkspacesProjectDetailsTab: React.FC<WorkspacesProjectDetailsTabProps> = ({ namespace }) => {
  const config = useMemo(
    () => ({
      deploymentMode: DeploymentMode.Federated,
      URL_PREFIX,
      BFF_API_VERSION,
      mandatoryNamespace: namespace,
    }),
    [namespace],
  );

  return (
    <ModularArchContextProvider config={config}>
      <WorkspacesProjectDetailsTabContent />
    </ModularArchContextProvider>
  );
};

export default WorkspacesProjectDetailsTab;
