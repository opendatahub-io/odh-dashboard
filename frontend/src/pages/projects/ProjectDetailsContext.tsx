import * as React from 'react';
import {
  ServingRuntimeKind,
  PersistentVolumeClaimKind,
  ProjectKind,
  InferenceServiceKind,
  SecretKind,
} from '../../k8sTypes';
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
import useProject from './useProject';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import useProjectNotebookStates from './notebook/useProjectNotebookStates';
import useProjectPvcs from './screens/detail/storage/useProjectPvcs';
import useDataConnections from './screens/detail/data-connections/useDataConnections';
import { DataConnection } from './types';
import { NotebookState } from './notebook/types';
import { DEFAULT_CONTEXT_DATA } from '../../utilities/const';
import useServingRuntimes from '../modelServing/useServingRuntimes';
import useInferenceServices from '../modelServing/useInferenceServices';
import { ContextResourceData } from '../../types';
import { useContextResourceData } from '../../utilities/useContextResourceData';
import useServingRuntimeSecrets from '../modelServing/screens/projects/useServingRuntimeSecrets';

type ProjectDetailsContextType = {
  currentProject: ProjectKind;
  refreshAllProjectData: () => void;
  notebooks: ContextResourceData<NotebookState>;
  pvcs: ContextResourceData<PersistentVolumeClaimKind>;
  dataConnections: ContextResourceData<DataConnection>;
  servingRuntimes: ContextResourceData<ServingRuntimeKind>;
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
  inferenceServices: DEFAULT_CONTEXT_DATA,
  serverSecrets: DEFAULT_CONTEXT_DATA,
});

const ProjectDetailsContextProvider: React.FC = () => {
  const navigate = useNavigate();
  const { namespace } = useParams<{ namespace: string }>();
  const [project, loaded, error] = useProject(namespace);
  const notebooks = useContextResourceData<NotebookState>(useProjectNotebookStates(namespace));
  const pvcs = useContextResourceData<PersistentVolumeClaimKind>(useProjectPvcs(namespace));
  const dataConnections = useContextResourceData<DataConnection>(useDataConnections(namespace));
  const servingRuntimes = useContextResourceData<ServingRuntimeKind>(useServingRuntimes(namespace));
  const inferenceServices = useContextResourceData<InferenceServiceKind>(
    useInferenceServices(namespace),
  );
  const serverSecrets = useContextResourceData<SecretKind>(useServingRuntimeSecrets(namespace));

  const notebookRefresh = notebooks.refresh;
  const pvcRefresh = pvcs.refresh;
  const dataConnectionRefresh = dataConnections.refresh;
  const servingRuntimeRefresh = servingRuntimes.refresh;
  const inferenceServiceRefresh = inferenceServices.refresh;
  const refreshAllProjectData = React.useCallback(() => {
    notebookRefresh();
    setTimeout(notebookRefresh, 2000);
    pvcRefresh();
    dataConnectionRefresh();
    servingRuntimeRefresh();
    inferenceServiceRefresh();
  }, [
    notebookRefresh,
    pvcRefresh,
    dataConnectionRefresh,
    servingRuntimeRefresh,
    inferenceServiceRefresh,
  ]);

  if (error) {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateIcon icon={ExclamationCircleIcon} />
          <Title headingLevel="h4" size="lg">
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
