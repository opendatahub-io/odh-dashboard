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
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import ModelRegistryRoutes from '~/app/pages/modelRegistry/ModelRegistryRoutes';
import { ModelRegistrySelectorContextProvider } from '~/app/context/ModelRegistrySelectorContext';
import { AppContext } from '~/app/context/AppContext';
import { Bullseye } from '@patternfly/react-core';
import useFetchDscStatus from '@odh-dashboard/internal/concepts/areas/useFetchDscStatus';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { isAreaExtension } from '@odh-dashboard/plugin-core/extension-points';
import NotificationListener from '~/odh/components/NotificationListener';
import OdhDevFeatureFlagOverridesProvider from '~/odh/components/OdhDevFeatureFlagOverridesProvider';
import { TempDevFeature } from '~/app/hooks/useTempDevFeatureAvailable';
import { REGISTRY_OCI_STORAGE } from '~/odh/extensions';

const ModelRegistryWrapperContent: React.FC = () => {
  const { configSettings, userSettings, loaded, loadError } = useSettings();
  const areaExtensions = useExtensions(isAreaExtension);
  const isRegistryOciStorageEnabled = areaExtensions.some(
    (ext) => ext.properties.id === REGISTRY_OCI_STORAGE,
  );

  const crdOverrides = React.useMemo(
    () => ({
      [TempDevFeature.RegistryStorage]: isRegistryOciStorageEnabled,
    }),
    [isRegistryOciStorageEnabled],
  );

  if (loadError) {
    return <div>Error: {loadError.message}</div>;
  }
  if (!loaded) {
    return <Bullseye>Loading...</Bullseye>;
  }
  return configSettings && userSettings ? (
    <AppContext.Provider
      value={{
        config: configSettings,
        user: userSettings,
      }}
    >
      <ThemeProvider theme={Theme.Patternfly}>
        <BrowserStorageContextProvider>
          <OdhDevFeatureFlagOverridesProvider crdOverrides={crdOverrides}>
            <NotificationContextProvider>
              {/* TODO: TECH DEBT - Remove NotificationListener once midstream uses mod-arch-core NotificationContext */}
              <NotificationListener>
                <ModelRegistrySelectorContextProvider>
                  <ModelRegistryRoutes />
                </ModelRegistrySelectorContextProvider>
              </NotificationListener>
            </NotificationContextProvider>
          </OdhDevFeatureFlagOverridesProvider>
        </BrowserStorageContextProvider>
      </ThemeProvider>
    </AppContext.Provider>
  ) : null;
};

const ModelRegistryWrapper: React.FC = () => {
  const [dscStatus] = useFetchDscStatus();
  const modularArchConfig: ModularArchConfig = {
    deploymentMode: DeploymentMode.Federated,
    URL_PREFIX,
    BFF_API_VERSION,
    mandatoryNamespace: dscStatus?.components?.modelregistry?.registriesNamespace,
  };
  return (
    <ModularArchContextProvider config={modularArchConfig}>
      <ModelRegistryWrapperContent />
    </ModularArchContextProvider>
  );
};
export default ModelRegistryWrapper;
