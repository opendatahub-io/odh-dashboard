import * as React from 'react';
import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import {
  HostApiContext,
  HostApiCoreContext,
  HostApiInfraContext,
  type HostApiCoreServices,
  type HostApiInfraServices,
  type HostApiServices,
  type ClusterSettingsType,
} from '@odh-dashboard/plugin-core';
import {
  createSecret,
  deleteSecret,
  getSecret,
  getSecretsByLabel,
} from '@odh-dashboard/k8s-core/api/secrets';
import { SecretModel } from '@odh-dashboard/k8s-core/api/models';
import type { K8sResourceCommon, SecretKind } from '@odh-dashboard/k8s-core';
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

const patchSecretWithOwnerReference = (
  secret: SecretKind,
  resource: K8sResourceCommon & { metadata: { name: string } },
  uid: string,
): Promise<SecretKind> =>
  k8sPatchResource({
    model: SecretModel,
    queryOptions: { name: secret.metadata.name, ns: secret.metadata.namespace },
    patches: [
      ...(secret.metadata.resourceVersion
        ? [
            {
              op: 'test' as const,
              path: '/metadata/resourceVersion',
              value: secret.metadata.resourceVersion,
            },
          ]
        : []),
      {
        op: 'add',
        path: '/metadata/ownerReferences',
        value: [
          ...(secret.metadata.ownerReferences || []),
          {
            uid,
            name: resource.metadata.name,
            apiVersion: resource.apiVersion,
            kind: resource.kind,
            blockOwnerDeletion: false,
          },
        ],
      },
    ],
  });

const patchSecretWithProtocolAnnotation = (
  secret: SecretKind,
  protocol: string,
): Promise<SecretKind> =>
  k8sPatchResource({
    model: SecretModel,
    queryOptions: { name: secret.metadata.name, ns: secret.metadata.namespace },
    patches: [
      ...(secret.metadata.resourceVersion
        ? [
            {
              op: 'test' as const,
              path: '/metadata/resourceVersion',
              value: secret.metadata.resourceVersion,
            },
          ]
        : []),
      {
        op: 'add',
        path: '/metadata/annotations/opendatahub.io~1connection-type-protocol',
        value: protocol,
      },
    ],
  });

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
  createSecret,
  getSecret,
  deleteSecret,
  getSecretsByLabel,
  patchSecretWithOwnerReference,
  patchSecretWithProtocolAnnotation,
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
