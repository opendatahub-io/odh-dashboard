import * as React from 'react';
import {
  IntegrationsContext,
  type IntegrationsStatusContextType,
} from '@odh-dashboard/plugin-core/integrations';
import {
  AreaContext,
  SupportedArea,
  type IsAreaAvailableStatus,
} from '@odh-dashboard/plugin-core/areas';
import { HardwareProfilesContext } from '@odh-dashboard/internal/concepts/hardwareProfiles/HardwareProfilesContext';
import { ProjectHardwareProfilesContext } from '@odh-dashboard/ui-core/context/ProjectHardwareProfilesContext';
import { DashboardNamespaceProvider } from './DashboardNamespaceContext';
import HostApiProvider from './HostApiProvider';
import ProjectsContextProvider from './ProjectsContextProvider';

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
  customCondition: () => true,
};

const areasStatus = {
  [SupportedArea.MODEL_SERVING]: availableAreaStatus,
  [SupportedArea.K_SERVE]: availableAreaStatus,
};

const areaContextValue = { dscStatus: null, dsciStatus: null, areasStatus };

// Hardware profiles are not installed in the RHAII Tilt cluster. Mark the
// optional data source as loaded and empty so model-serving does not wait for
// a resource that cannot exist in this environment.
const hardwareProfilesContextValue: React.ContextType<typeof HardwareProfilesContext> = {
  globalHardwareProfiles: [[], true, undefined],
};
const projectHardwareProfilesContextValue: React.ContextType<
  typeof ProjectHardwareProfilesContext
> = {
  projectHardwareProfiles: [[], true, undefined],
};

const RhaiiAppProvider: React.FC<RhaiiAppProviderProps> = ({ children }) => (
  <IntegrationsContext.Provider value={integrationsContextValue}>
    <AreaContext.Provider value={areaContextValue}>
      <DashboardNamespaceProvider>
        <ProjectsContextProvider>
          <HardwareProfilesContext.Provider value={hardwareProfilesContextValue}>
            <ProjectHardwareProfilesContext.Provider value={projectHardwareProfilesContextValue}>
              <HostApiProvider>{children}</HostApiProvider>
            </ProjectHardwareProfilesContext.Provider>
          </HardwareProfilesContext.Provider>
        </ProjectsContextProvider>
      </DashboardNamespaceProvider>
    </AreaContext.Provider>
  </IntegrationsContext.Provider>
);

export default RhaiiAppProvider;
