import * as React from 'react';
import {
  HostApiContext,
  HostApiCoreContext,
  HostApiInfraContext,
  type HostApiCoreServices,
  type HostApiInfraServices,
  type HostApiServices,
} from '@odh-dashboard/plugin-core';

const ProjectDetailsContext = React.createContext(null);
const ModelServingContext = React.createContext(null);

const ModelServingContextProvider: HostApiServices['contexts']['ModelServingContextProvider'] = ({
  children,
}) => children;

const unsupportedCreateProject: HostApiServices['createProject'] = () =>
  Promise.reject(new Error('Project creation is not available in the RHAII Tilt host.'));

const unsupportedSecretMutation = () =>
  Promise.reject(new Error('Secret mutations are not available in the RHAII Tilt host.'));

const coreApi: HostApiCoreServices = {
  dashboardNamespace: 'opendatahub',
  checkAccess: () => Promise.resolve(false),
  trackEvent: () => undefined,
  fetchDashboardConfig: () =>
    Promise.reject(new Error('DashboardConfig is not available in the RHAII Tilt host.')),
};

const infraApi: HostApiInfraServices = {
  createSecret: unsupportedSecretMutation,
  getSecret: unsupportedSecretMutation,
  deleteSecret: unsupportedSecretMutation,
  getSecretsByLabel: () => Promise.resolve([]),
  patchSecretWithOwnerReference: unsupportedSecretMutation,
  patchSecretWithProtocolAnnotation: unsupportedSecretMutation,
  createProject: () =>
    Promise.reject(new Error('Project creation is not available in the RHAII Tilt host.')),
  getDashboardPvcs: () => Promise.resolve([]),
};

const hostApi: HostApiServices = {
  useTemplates: () => [[], true, undefined],
  setProjectServingPlatform: (name) => Promise.resolve(name),
  useWatchConnectionTypes: () => [[], true, undefined, () => Promise.resolve([])],
  useServingConnections: () => [[], true, undefined, () => Promise.resolve([])],
  getDashboardConfigTemplateOrder: () => Promise.resolve([]),
  getDashboardConfigTemplateDisablement: () => Promise.resolve([]),
  isProjectNIMSupported: () => false,
  createProject: unsupportedCreateProject,
  ConnectionTypeFormFields: () => null,
  contexts: {
    ProjectDetailsContext,
    ModelServingContext,
    ModelServingContextProvider,
  },
};

type HostApiProviderProps = {
  children: React.ReactNode;
};

/** Minimal xKS host services needed by the federated model-serving UI. */
const HostApiProvider: React.FC<HostApiProviderProps> = ({ children }) => (
  <HostApiCoreContext.Provider value={coreApi}>
    <HostApiInfraContext.Provider value={infraApi}>
      <HostApiContext.Provider value={hostApi}>{children}</HostApiContext.Provider>
    </HostApiInfraContext.Provider>
  </HostApiCoreContext.Provider>
);

export default HostApiProvider;
