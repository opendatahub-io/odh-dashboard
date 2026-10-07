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
import { DashboardNamespaceProvider } from './DashboardNamespaceContext';
import HostApiProvider from './HostApiProvider';
import ProjectsContextProvider from './ProjectsContextProvider';
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
  customCondition: () => true,
};

const areasStatus = {
  [SupportedArea.MODEL_SERVING]: availableAreaStatus,
  [SupportedArea.K_SERVE]: availableAreaStatus,
};

const areaContextValue = { dscStatus: null, dsciStatus: null, areasStatus };

const RhaiiAppProvider: React.FC<RhaiiAppProviderProps> = ({ children }) => {
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
          <ProjectsContextProvider>
            <HostApiProvider>{appContent}</HostApiProvider>
          </ProjectsContextProvider>
        </DashboardNamespaceProvider>
      </AreaContext.Provider>
    </IntegrationsContext.Provider>
  );
};

export default RhaiiAppProvider;
