import * as React from 'react';
import {
  k8sPatchResource,
  useK8sWatchResource,
  type K8sModelCommon,
} from '@openshift/dynamic-plugin-sdk-utils';
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
import type { K8sResourceCommon, SecretKind, TemplateKind } from '@odh-dashboard/k8s-core';
import type { InferenceServiceKind, ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import { DashboardNamespaceContext } from './DashboardNamespaceContext';

const ProjectDetailsContext = React.createContext(null);
const MODEL_SERVING_CONTEXT_VALUE = {
  inferenceServices: {
    data: { items: [] },
    loaded: true,
  },
};
const ServingRuntimeModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'serving.kserve.io',
  kind: 'ServingRuntime',
  plural: 'servingruntimes',
};
const InferenceServiceModel: K8sModelCommon = {
  apiVersion: 'v1beta1',
  apiGroup: 'serving.kserve.io',
  kind: 'InferenceService',
  plural: 'inferenceservices',
};

const useServingRuntimeTemplates = (
  namespace?: string,
): ReturnType<HostApiServices['useTemplates']> => {
  const resource = React.useMemo(
    () =>
      namespace
        ? {
            isList: true,
            groupVersionKind: {
              group: 'serving.kserve.io',
              version: 'v1alpha1',
              kind: 'ServingRuntime',
              plural: 'servingruntimes',
            },
            namespace,
          }
        : null,
    [namespace],
  );
  const [runtimes, loaded, error] = useK8sWatchResource<ServingRuntimeKind[]>(
    resource,
    ServingRuntimeModel,
  );
  const templates = runtimes.map(
    (runtime): TemplateKind => ({
      apiVersion: 'template.openshift.io/v1',
      kind: 'Template',
      metadata: {
        ...runtime.metadata,
        labels: { 'opendatahub.io/dashboard': 'true' },
        annotations: {
          'opendatahub.io/modelServingSupport': '["single"]',
          'opendatahub.io/model-type': '["predictive"]',
        },
      },
      objects: [runtime],
      parameters: [],
    }),
  );
  return [templates, loaded, error instanceof Error ? error : undefined];
};

const useInferenceServices = (namespace?: string) => {
  const resource = React.useMemo(
    () =>
      namespace
        ? {
            isList: true,
            groupVersionKind: {
              group: 'serving.kserve.io',
              version: 'v1beta1',
              kind: 'InferenceService',
              plural: 'inferenceservices',
            },
            namespace,
          }
        : null,
    [namespace],
  );
  return useK8sWatchResource<InferenceServiceKind[]>(resource, InferenceServiceModel);
};
const ModelServingContext = React.createContext(MODEL_SERVING_CONTEXT_VALUE);

const ModelServingContextProvider: HostApiServices['contexts']['ModelServingContextProvider'] = ({
  children,
  namespace,
}) => (
  <ModelServingContextValueProvider namespace={namespace}>
    {children}
  </ModelServingContextValueProvider>
);

const ModelServingContextValueProvider: React.FC<{
  children: React.ReactNode;
  namespace?: string;
}> = ({ children, namespace }) => {
  const [items, loaded, error] = useInferenceServices(namespace);
  const value = React.useMemo(
    () => ({
      inferenceServices: {
        data: { items },
        loaded,
        error: error instanceof Error ? error : undefined,
      },
    }),
    [items, loaded, error],
  );

  return <ModelServingContext.Provider value={value}>{children}</ModelServingContext.Provider>;
};

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
  useTemplates: (namespace) => useServingRuntimeTemplates(namespace),
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
