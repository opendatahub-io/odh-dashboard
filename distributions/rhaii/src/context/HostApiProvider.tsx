import * as React from 'react';
import {
  HostApiContext,
  HostApiCoreContext,
  HostApiInfraContext,
  type HostApiCoreServices,
  type HostApiInfraServices,
  type HostApiServices,
  type ClusterSettingsType,
} from '@odh-dashboard/plugin-core';
import { DashboardNamespaceContext } from './DashboardNamespaceContext';

const ProjectDetailsContext = React.createContext(null);
const MODEL_SERVING_CONTEXT_VALUE = {
  inferenceServices: {
    data: { items: [] },
    loaded: true,
  },
};
const ModelServingContext = React.createContext(MODEL_SERVING_CONTEXT_VALUE);

const ModelServingContextProvider: HostApiServices['contexts']['ModelServingContextProvider'] = ({
  children,
}) => (
  <ModelServingContext.Provider value={MODEL_SERVING_CONTEXT_VALUE}>
    {children}
  </ModelServingContext.Provider>
);

const unsupportedCreateProject: HostApiServices['createProject'] = () =>
  Promise.reject(new Error('Project creation is not available in the RHAII Tilt host.'));

const unsupportedSecretMutation = () =>
  Promise.reject(new Error('Secret mutations are not available in the RHAII Tilt host.'));

const createCoreApi = (dashboardNamespace: string): HostApiCoreServices => ({
  dashboardNamespace,
  checkAccess: () => Promise.resolve(false),
  trackEvent: () => undefined,
  fetchDashboardConfig: () =>
    Promise.reject(new Error('DashboardConfig is not available in the RHAII Tilt host.')),
  fetchClusterSettings: () =>
    Promise.resolve<ClusterSettingsType>({
      userTrackingEnabled: false,
      pvcSize: 0,
      cullerTimeout: 0,
      modelServingPlatformEnabled: { kServe: true, LLMd: false },
    }),
  updateClusterSettings: () =>
    Promise.reject(new Error('Cluster settings are not configurable in the RHAII Tilt host.')),
});

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
const HostApiProvider: React.FC<HostApiProviderProps> = ({ children }) => {
  const dashboardNamespace = React.useContext(DashboardNamespaceContext);
  const coreApi = React.useMemo(() => createCoreApi(dashboardNamespace), [dashboardNamespace]);

  return (
    <HostApiCoreContext.Provider value={coreApi}>
      <HostApiInfraContext.Provider value={infraApi}>
        <HostApiContext.Provider value={hostApi}>{children}</HostApiContext.Provider>
      </HostApiInfraContext.Provider>
    </HostApiCoreContext.Provider>
  );
};

export default HostApiProvider;
