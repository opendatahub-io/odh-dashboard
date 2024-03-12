import * as React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ServingRuntimeKind, InferenceServiceKind, TemplateKind, ProjectKind } from '~/k8sTypes';
import { DEFAULT_CONTEXT_DATA } from '~/utilities/const';
import { ContextResourceData } from '~/types';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import { useDashboardNamespace } from '~/redux/selectors';
import { DataConnection } from '~/pages/projects/types';
import useDataConnections from '~/pages/projects/screens/detail/data-connections/useDataConnections';
import useSyncPreferredProject from '~/concepts/projects/useSyncPreferredProject';
import { ProjectsContext, byName } from '~/concepts/projects/ProjectsContext';
import { SupportedArea, conditionalArea } from '~/concepts/areas';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import useInferenceServices from './useInferenceServices';
import useServingRuntimes from './useServingRuntimes';
import useTemplates from './customServingRuntimes/useTemplates';
import useTemplateOrder from './customServingRuntimes/useTemplateOrder';
import useTemplateDisablement from './customServingRuntimes/useTemplateDisablement';

type ModelServingContextType = {
  refreshAllData: () => void;
  dataConnections: ContextResourceData<DataConnection>;
  servingRuntimeTemplates: ContextResourceData<TemplateKind>;
  servingRuntimeTemplateOrder: ContextResourceData<string>;
  servingRuntimeTemplateDisablement: ContextResourceData<string>;
  servingRuntimes: ContextResourceData<ServingRuntimeKind>;
  inferenceServices: ContextResourceData<InferenceServiceKind>;
  project: ProjectKind | null;
  preferredProject: ProjectKind | null;
  projects: ProjectKind[] | null;
};

type ModelServingContextProviderProps = {
  children: React.ReactNode;
  namespace?: string;
  getErrorComponent?: (errorMessage?: string) => React.ReactElement;
};

export const ModelServingContext = React.createContext<ModelServingContextType>({
  refreshAllData: () => undefined,
  dataConnections: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplates: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplateOrder: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplateDisablement: DEFAULT_CONTEXT_DATA,
  servingRuntimes: DEFAULT_CONTEXT_DATA,
  inferenceServices: DEFAULT_CONTEXT_DATA,
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
  useSyncPreferredProject(project);
  const servingRuntimeTemplates = useContextResourceData<TemplateKind>(
    useTemplates(dashboardNamespace),
  );
  const servingRuntimeTemplateOrder = useContextResourceData<string>(
    useTemplateOrder(dashboardNamespace),
  );
  const servingRuntimeTemplateDisablement = useContextResourceData<string>(
    useTemplateDisablement(dashboardNamespace),
  );
  const servingRuntimes = useContextResourceData<ServingRuntimeKind>(useServingRuntimes(namespace));
  const inferenceServices = useContextResourceData<InferenceServiceKind>(
    useInferenceServices(namespace),
  );
  const dataConnections = useContextResourceData<DataConnection>(useDataConnections(namespace));

  const servingRuntimeRefresh = servingRuntimes.refresh;
  const inferenceServiceRefresh = inferenceServices.refresh;
  const dataConnectionRefresh = dataConnections.refresh;
  const refreshAllData = React.useCallback(() => {
    servingRuntimeRefresh();
    inferenceServiceRefresh();
    dataConnectionRefresh();
  }, [servingRuntimeRefresh, inferenceServiceRefresh, dataConnectionRefresh]);

  const {
    kServe: { installed: kServeInstalled },
    modelMesh: { installed: modelMeshInstalled },
  } = useServingPlatformStatuses();

  const notInstalledError =
    !kServeInstalled && !modelMeshInstalled
      ? new Error('No model serving platform installed')
      : undefined;

  if (
    notInstalledError ||
    servingRuntimes.error ||
    inferenceServices.error ||
    servingRuntimeTemplates.error ||
    servingRuntimeTemplateOrder.error ||
    servingRuntimeTemplateDisablement.error ||
    dataConnections.error
  ) {
    return getErrorComponent ? (
      getErrorComponent(
        notInstalledError?.message ||
          servingRuntimes.error?.message ||
          inferenceServices.error?.message ||
          servingRuntimeTemplates.error?.message ||
          servingRuntimeTemplateOrder.error?.message ||
          servingRuntimeTemplateDisablement.error?.message ||
          dataConnections.error?.message,
      )
    ) : (
      <Bullseye>
        <EmptyState>
          <EmptyStateHeader
            titleText="Problem loading model serving page"
            icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
            headingLevel="h2"
          />
          <EmptyStateBody>
            {notInstalledError?.message ||
              servingRuntimes.error?.message ||
              inferenceServices.error?.message ||
              servingRuntimeTemplates.error?.message ||
              servingRuntimeTemplateOrder.error?.message ||
              servingRuntimeTemplateDisablement.error?.message ||
              dataConnections.error?.message}
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
        dataConnections,
        refreshAllData,
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
