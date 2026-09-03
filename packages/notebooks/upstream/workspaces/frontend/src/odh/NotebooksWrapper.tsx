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
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

window.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (label === 'yaml') {
      return new Worker(new URL('monaco-yaml/yaml.worker', import.meta.url));
    }
    return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url));
  },
};

loader.config({ monaco });
import AppRoutes from '~/app/AppRoutes';
import { useTypedLocation } from '~/app/routerHelper';
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
  // Routes navigated to from a namespaced context (e.g. the Project Details tab) forward the
  // namespace via router state (see useTypedNavigate) — prefer that over the build-time
  // MANDATORY_NAMESPACE default so this standalone route tree stays scoped to the same namespace.
  const location = useTypedLocation<'workspaceCreate' | 'workspaceEdit'>();
  const stateNamespace = location.state?.namespace;

  const modularArchConfig: ModularArchConfig = useMemo(
    () => ({
      deploymentMode: DeploymentMode.Federated,
      URL_PREFIX,
      BFF_API_VERSION,
      mandatoryNamespace: stateNamespace || MANDATORY_NAMESPACE,
    }),
    [stateNamespace],
  );

  return (
    <ModularArchContextProvider config={modularArchConfig}>
      <NotebooksWrapperContent />
    </ModularArchContextProvider>
  );
};

export default NotebooksWrapper;
