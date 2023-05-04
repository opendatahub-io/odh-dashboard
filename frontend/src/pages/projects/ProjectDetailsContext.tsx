import * as React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import {
  ServingRuntimeKind,
  PersistentVolumeClaimKind,
  ProjectKind,
  InferenceServiceKind,
  SecretKind,
  TemplateKind,
} from '~/k8sTypes';
import { DEFAULT_CONTEXT_DATA } from '~/utilities/const';
import useServingRuntimes from '~/pages/modelServing/useServingRuntimes';
import useInferenceServices from '~/pages/modelServing/useInferenceServices';
import { ContextResourceData } from '~/types';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import useServingRuntimeSecrets from '~/pages/modelServing/screens/projects/useServingRuntimeSecrets';
import useTemplates from '~/pages/modelServing/customServingRuntimes/useTemplates';
import useTemplateOrder from '~/pages/modelServing/customServingRuntimes/useTemplateOrder';
import { useDashboardNamespace } from '~/redux/selectors';
import { featureFlagEnabled } from '~/utilities/utils';
import { useAppContext } from '~/app/AppContext';
import { NotebookState } from './notebook/types';
import { DataConnection } from './types';
import useDataConnections from './screens/detail/data-connections/useDataConnections';
import useProjectNotebookStates from './notebook/useProjectNotebookStates';
import useProject from './useProject';
import useProjectPvcs from './screens/detail/storage/useProjectPvcs';

type ProjectDetailsContextType = {
  currentProject: ProjectKind;
  refreshAllProjectData: () => void;
  notebooks: ContextResourceData<NotebookState>;
  pvcs: ContextResourceData<PersistentVolumeClaimKind>;
  dataConnections: ContextResourceData<DataConnection>;
  servingRuntimes: ContextResourceData<ServingRuntimeKind>;
  servingRuntimeTemplates: ContextResourceData<TemplateKind>;
  servingRuntimeTemplateOrder: ContextResourceData<string>;
  inferenceServices: ContextResourceData<InferenceServiceKind>;
  serverSecrets: ContextResourceData<SecretKind>;
};

export const ProjectDetailsContext = React.createContext<ProjectDetailsContextType>({
  // We never will get into a case without a project, so fudge the default value
  currentProject: null as unknown as ProjectKind,
  refreshAllProjectData: () => undefined,
  notebooks: DEFAULT_CONTEXT_DATA,
  pvcs: DEFAULT_CONTEXT_DATA,
  dataConnections: DEFAULT_CONTEXT_DATA,
  servingRuntimes: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplates: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplateOrder: DEFAULT_CONTEXT_DATA,
  inferenceServices: DEFAULT_CONTEXT_DATA,
  serverSecrets: DEFAULT_CONTEXT_DATA,
});

const ProjectDetailsContextProvider: React.FC = () => {
  const navigate = useNavigate();
  const { namespace } = useParams<{ namespace: string }>();
  const { dashboardNamespace } = useDashboardNamespace();
  const { dashboardConfig } = useAppContext();
  const modelServingEnabled = featureFlagEnabled(
    dashboardConfig.spec.dashboardConfig.disableModelServing,
  );
  const customServingRuntimesEnabled = featureFlagEnabled(
    dashboardConfig.spec.dashboardConfig.disableCustomServingRuntimes,
  );
  const [project, loaded, error] = useProject(namespace);
  const notebooks = useContextResourceData<NotebookState>(useProjectNotebookStates(namespace));
  const pvcs = useContextResourceData<PersistentVolumeClaimKind>(useProjectPvcs(namespace));
  const dataConnections = useContextResourceData<DataConnection>(useDataConnections(namespace));
  const servingRuntimes = useContextResourceData<ServingRuntimeKind>(useServingRuntimes(namespace));
  const servingRuntimeTemplates = useContextResourceData<TemplateKind>(
    useTemplates(dashboardNamespace, !modelServingEnabled || !customServingRuntimesEnabled),
  );
  const servingRuntimeTemplateOrder = useContextResourceData<string>(
    useTemplateOrder(dashboardNamespace, !modelServingEnabled || !customServingRuntimesEnabled),
  );
  const inferenceServices = useContextResourceData<InferenceServiceKind>(
    useInferenceServices(namespace),
  );
  const serverSecrets = useContextResourceData<SecretKind>(useServingRuntimeSecrets(namespace));

  const notebookRefresh = notebooks.refresh;
  const pvcRefresh = pvcs.refresh;
  const dataConnectionRefresh = dataConnections.refresh;
  const servingRuntimeRefresh = servingRuntimes.refresh;
  const servingRuntimeTemplateRefresh = servingRuntimeTemplates.refresh;
  const servingRuntimeTemplateOrderRefresh = servingRuntimeTemplateOrder.refresh;
  const inferenceServiceRefresh = inferenceServices.refresh;
  const refreshAllProjectData = React.useCallback(() => {
    notebookRefresh();
    setTimeout(notebookRefresh, 2000);
    pvcRefresh();
    dataConnectionRefresh();
    servingRuntimeRefresh();
    inferenceServiceRefresh();
    servingRuntimeTemplateRefresh();
    servingRuntimeTemplateOrderRefresh();
  }, [
    notebookRefresh,
    pvcRefresh,
    dataConnectionRefresh,
    servingRuntimeRefresh,
    servingRuntimeTemplateRefresh,
    servingRuntimeTemplateOrderRefresh,
    inferenceServiceRefresh,
  ]);

  if (error) {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateIcon icon={ExclamationCircleIcon} />
          <Title headingLevel="h2" size="lg">
            Problem loading project details
          </Title>
          <EmptyStateBody>{error.message}</EmptyStateBody>
          <Button variant="primary" onClick={() => navigate('/projects')}>
            View my projects
          </Button>
        </EmptyState>
      </Bullseye>
    );
  }

  if (!loaded || !project) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <ProjectDetailsContext.Provider
      value={{
        currentProject: project,
        notebooks,
        pvcs,
        dataConnections,
        servingRuntimes,
        servingRuntimeTemplates,
        servingRuntimeTemplateOrder,
        inferenceServices,
        refreshAllProjectData,
        serverSecrets,
      }}
    >
      <Outlet />
    </ProjectDetailsContext.Provider>
  );
};

export default ProjectDetailsContextProvider;
