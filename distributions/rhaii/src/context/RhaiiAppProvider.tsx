import * as React from 'react';
import { useFeatureFlag, usePluginStore } from '@openshift/dynamic-plugin-sdk';
import { Alert, AlertActionLink } from '@patternfly/react-core';
import {
  IntegrationsContext,
  type IntegrationsStatusContextType,
} from '@odh-dashboard/plugin-core/integrations';
import {
  AreaContext,
  SupportedArea,
  type IsAreaAvailableStatus,
} from '@odh-dashboard/plugin-core/areas';
import { DashboardNamespaceProvider } from './DashboardNamespaceContext';
import HardwareProfilesContextProvider from './HardwareProfilesContextProvider';
import HostApiProvider from './HostApiProvider';
import ProjectsContextProvider from './ProjectsContextProvider';
import { useLLMdDiscovery } from './useLLMdDiscovery';
import TiltFixturesProvider from '../development/tilt/TiltFixturesProvider';

type RhaiiAppProviderProps = {
  children: React.ReactNode;
};

const integrationsContextValue: IntegrationsStatusContextType = {
  integrationStatus: {},
  loaded: true,
  error: undefined,
  refresh: () => Promise.resolve(undefined),
};

const availableAreaStatus: IsAreaAvailableStatus = {
  status: true,
  devFlags: null,
  featureFlags: null,
  reliantAreas: null,
  requiredCapabilities: null,
  requiredComponents: null,
};

const RhaiiAppProvider: React.FC<RhaiiAppProviderProps> = ({ children }) => {
  const store = usePluginStore();
  const [hubEnabled] = useFeatureFlag(SupportedArea.MODEL_SERVING);
  const [llmdConfigured] = useFeatureFlag('enable-llmd-serving');
  const { discovery, refresh } = useLLMdDiscovery(hubEnabled === true && llmdConfigured === true);
  const llmdAvailable = discovery.status === 'available';
  React.useEffect(() => {
    store.setFeatureFlags({ [SupportedArea.LLMD_SERVING]: llmdAvailable });
  }, [store, llmdAvailable]);
  const [unifiedProjectSelectorEnabled] = useFeatureFlag('unified-project-selector');
  const areaContextValue = React.useMemo(
    () => ({
      dscStatus: null,
      dsciStatus: null,
      areasStatus: {
        [SupportedArea.MODEL_SERVING]: { ...availableAreaStatus, status: hubEnabled === true },
        [SupportedArea.LLMD_SERVING]: { ...availableAreaStatus, status: llmdAvailable },
        [SupportedArea.UNIFIED_PROJECT_SELECTOR]: {
          ...availableAreaStatus,
          status: unifiedProjectSelectorEnabled === true,
        },
      },
    }),
    [hubEnabled, llmdAvailable, unifiedProjectSelectorEnabled],
  );
  const appContent =
    process.env.RHAII_TILT_FIXTURES === 'true' ? (
      <TiltFixturesProvider>{children}</TiltFixturesProvider>
    ) : (
      children
    );

  return (
    <IntegrationsContext.Provider value={integrationsContextValue}>
      <AreaContext.Provider value={areaContextValue}>
        <DashboardNamespaceProvider>
          <HardwareProfilesContextProvider>
            <ProjectsContextProvider>
              <HostApiProvider
                servingResources={
                  discovery.status === 'available' ? discovery.resources : undefined
                }
              >
                {discovery.status === 'pending' && (
                  <Alert isInline variant="info" title="Checking LLM deployment API availability" />
                )}
                {'message' in discovery && (
                  <Alert
                    isInline
                    variant="warning"
                    title="LLM deployments unavailable"
                    actionLinks={
                      <AlertActionLink onClick={refresh}>Retry discovery</AlertActionLink>
                    }
                  >
                    {discovery.message}
                  </Alert>
                )}
                {appContent}
              </HostApiProvider>
            </ProjectsContextProvider>
          </HardwareProfilesContextProvider>
        </DashboardNamespaceProvider>
      </AreaContext.Provider>
    </IntegrationsContext.Provider>
  );
};

export default RhaiiAppProvider;
