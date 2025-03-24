import * as React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import {
  InferenceServiceKind,
  ProjectKind,
  SecretKind,
  ServingRuntimeKind,
  TemplateKind,
} from '~/k8sTypes';
import { DEFAULT_CONTEXT_DATA, DEFAULT_LIST_WATCH_RESULT } from '~/utilities/const';
import { ContextResourceData, CustomWatchK8sResult } from '~/types';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import { useDashboardNamespace } from '~/redux/selectors';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import { useTemplates } from '~/api';
import { Connection } from '~/concepts/connectionTypes/types';
import useConnections from '~/pages/projects/screens/detail/connections/useConnections';
import useInferenceServices from './useInferenceServices';
import useServingRuntimes from './useServingRuntimes';
import useTemplateOrder from './customServingRuntimes/useTemplateOrder';
import useTemplateDisablement from './customServingRuntimes/useTemplateDisablement';
import { getTokenNames } from './utils';
import useServingRuntimeSecrets from './screens/projects/useServingRuntimeSecrets';

type ModelServingContextType = {
  refreshAllData: () => void;
  filterTokens: (servingRuntime?: string) => SecretKind[];
  connections: ContextResourceData<Connection>;
  servingRuntimeTemplates: CustomWatchK8sResult<TemplateKind[]>;
  servingRuntimeTemplateOrder: ContextResourceData<string>;
  servingRuntimeTemplateDisablement: ContextResourceData<string>;
  servingRuntimes: ContextResourceData<ServingRuntimeKind>;
  inferenceServices: ContextResourceData<InferenceServiceKind>;
  project: ProjectKind | null;
  preferredProject: ProjectKind | null;
  serverSecrets: ContextResourceData<SecretKind>;
  projects: ProjectKind[] | null;
};

type ModelServingContextProviderProps = {
  children: React.ReactNode;
  namespace?: string;
  getErrorComponent?: (errorMessage?: string) => React.ReactElement;
};

export const ModelServingContext = React.createContext<ModelServingContextType>({
  refreshAllData: () => undefined,
  filterTokens: () => [],
  connections: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplates: DEFAULT_LIST_WATCH_RESULT,
  servingRuntimeTemplateOrder: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplateDisablement: DEFAULT_CONTEXT_DATA,
  servingRuntimes: DEFAULT_CONTEXT_DATA,
  inferenceServices: DEFAULT_CONTEXT_DATA,
  serverSecrets: DEFAULT_CONTEXT_DATA,
  project: null,
  preferredProject: null,
  projects: null,
});

const ModelServingContextProvider = conditionalArea<ModelServingContextProviderProps>(
  SupportedArea.MODEL_SERVING,
  true,
)(({ children, namespace, getErrorComponent }) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const navigate = useNavigate();
  const { projects, preferredProject } = React.useContext(ProjectsContext);
  const project = projects.find(byName(namespace)) ?? null;
  const servingRuntimeTemplates = useTemplates(dashboardNamespace);

  const servingRuntimeTemplateOrder = useContextResourceData<string>(
    useTemplateOrder(dashboardNamespace),
  );
  const servingRuntimeTemplateDisablement = useContextResourceData<string>(
    useTemplateDisablement(dashboardNamespace),
  );
  const serverSecrets = useContextResourceData<SecretKind>(useServingRuntimeSecrets(namespace));
  const servingRuntimes = useContextResourceData<ServingRuntimeKind>(useServingRuntimes(namespace));
  const inferenceServices = useContextResourceData<InferenceServiceKind>(
    useInferenceServices(namespace),
  );
  const connections = useContextResourceData<Connection>(useConnections(namespace));

  const servingRuntimeRefresh = servingRuntimes.refresh;
  const inferenceServiceRefresh = inferenceServices.refresh;
  const connectionRefresh = connections.refresh;
  const refreshAllData = React.useCallback(() => {
    servingRuntimeRefresh();
    inferenceServiceRefresh();
    connectionRefresh();
  }, [servingRuntimeRefresh, inferenceServiceRefresh, connectionRefresh]);

  const {
    kServe: { installed: kServeInstalled },
    modelMesh: { installed: modelMeshInstalled },
  } = useServingPlatformStatuses();

  const notInstalledError =
    !kServeInstalled && !modelMeshInstalled
      ? new Error('No model serving platform installed')
      : undefined;

  const filterTokens = React.useCallback(
    (servingRuntimeName?: string): SecretKind[] => {
      if (!namespace || !servingRuntimeName) {
        return [];
      }
      const { serviceAccountName } = getTokenNames(servingRuntimeName, namespace);

      const secrets = serverSecrets.data.filter(
        (secret) =>
          secret.metadata.annotations?.['kubernetes.io/service-account.name'] ===
          serviceAccountName,
      );

      return secrets;
    },
    [namespace, serverSecrets],
  );

  if (
    notInstalledError ||
    servingRuntimes.error ||
    inferenceServices.error ||
    servingRuntimeTemplates[2] ||
    servingRuntimeTemplateOrder.error ||
    servingRuntimeTemplateDisablement.error ||
    serverSecrets.error ||
    connections.error
  ) {
    return getErrorComponent ? (
      getErrorComponent(
        notInstalledError?.message ||
          servingRuntimes.error?.message ||
          inferenceServices.error?.message ||
          servingRuntimeTemplates[2]?.message ||
          servingRuntimeTemplateOrder.error?.message ||
          servingRuntimeTemplateDisablement.error?.message ||
          connections.error?.message,
      )
    ) : (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Problem loading model serving page"
        >
          <EmptyStateBody>
            {notInstalledError?.message ||
              servingRuntimes.error?.message ||
              inferenceServices.error?.message ||
              servingRuntimeTemplates[2]?.message ||
              servingRuntimeTemplateOrder.error?.message ||
              servingRuntimeTemplateDisablement.error?.message ||
              serverSecrets.error?.message ||
              connections.error?.message}
          </EmptyStateBody>
          <EmptyStateFooter>
            <Button variant="primary" onClick={() => navigate('/projects')}>
              View my projects
            </Button>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  }

  return (
    <ModelServingContext.Provider
      value={{
        servingRuntimes,
        inferenceServices,
        servingRuntimeTemplates,
        servingRuntimeTemplateOrder,
        servingRuntimeTemplateDisablement,
        connections,
        refreshAllData,
        filterTokens,
        serverSecrets,
        project,
        preferredProject,
        projects,
      }}
    >
      {children}
    </ModelServingContext.Provider>
  );
});

export default ModelServingContextProvider;
