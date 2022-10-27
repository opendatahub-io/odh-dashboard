import * as React from 'react';
import { PersistentVolumeClaimKind, ProjectKind } from '../../k8sTypes';
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
import { POLL_INTERVAL } from '../../utilities/const';

type ContextResourceData<T> = {
  data: T[];
  loaded: boolean;
  error?: Error;
  refresh: () => void;
};

type ProjectDetailsContextType = {
  currentProject: ProjectKind;
  refreshAllProjectData: () => void;
  notebooks: ContextResourceData<NotebookState>;
  pvcs: ContextResourceData<PersistentVolumeClaimKind>;
  dataConnections: ContextResourceData<DataConnection>;
};

const DEFAULT_DATA: ContextResourceData<never> = {
  data: [],
  loaded: false,
  refresh: () => undefined,
};

const useContextResourceData = <T,>(resourceData): ContextResourceData<T> => {
  const [values, loaded, error, refresh] = resourceData;
  React.useEffect(() => {
    const timer = setInterval(() => refresh(), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [refresh]);
  return React.useMemo(
    () => ({
      data: values,
      loaded,
      error,
      refresh,
    }),
    [error, loaded, refresh, values],
  );
};

export const ProjectDetailsContext = React.createContext<ProjectDetailsContextType>({
  // We never will get into a case without a project, so fudge the default value
  currentProject: null as unknown as ProjectKind,
  refreshAllProjectData: () => undefined,
  notebooks: DEFAULT_DATA,
  pvcs: DEFAULT_DATA,
  dataConnections: DEFAULT_DATA,
});

const ProjectDetailsContextProvider: React.FC = () => {
  const navigate = useNavigate();
  const { namespace } = useParams<{ namespace: string }>();
  const [project, loaded, error] = useProject(namespace);
  const notebooks = useContextResourceData<NotebookState>(useProjectNotebookStates(namespace));
  const pvcs = useContextResourceData<PersistentVolumeClaimKind>(useProjectPvcs(namespace));
  const dataConnections = useContextResourceData<DataConnection>(useDataConnections(namespace));

  const notebookRefresh = notebooks.refresh;
  const pvcRefresh = pvcs.refresh;
  const dataConnectionRefresh = dataConnections.refresh;
  const refreshAllProjectData = React.useCallback(() => {
    notebookRefresh();
    setTimeout(notebookRefresh, 2000);
    pvcRefresh();
    dataConnectionRefresh();
  }, [notebookRefresh, pvcRefresh, dataConnectionRefresh]);

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
      value={{ currentProject: project, notebooks, pvcs, dataConnections, refreshAllProjectData }}
    >
      <Outlet />
    </ProjectDetailsContext.Provider>
  );
};

export default ProjectDetailsContextProvider;
