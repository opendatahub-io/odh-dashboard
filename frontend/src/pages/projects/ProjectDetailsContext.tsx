import * as React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import {
  ServingRuntimeKind,
  PersistentVolumeClaimKind,
  ProjectKind,
  InferenceServiceKind,
  SecretKind,
} from '~/k8sTypes';
import { DEFAULT_CONTEXT_DATA } from '~/utilities/const';
import useServingRuntimes from '~/pages/modelServing/useServingRuntimes';
import useInferenceServices from '~/pages/modelServing/useInferenceServices';
import { ContextResourceData } from '~/types';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import useServingRuntimeSecrets from '~/pages/modelServing/screens/projects/useServingRuntimeSecrets';
import {
  useServingRuntimesConfig,
  ServingRuntimesConfigResourceData,
} from '~/pages/modelServing/useServingRuntimesConfig';
import { PipelineContextProvider } from '~/concepts/pipelines/context';
import { useAppContext } from '~/app/AppContext';
import { featureFlagEnabled } from '~/utilities/utils';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import InvalidProject from '~/concepts/projects/InvalidProject';
import { NotebookState } from './notebook/types';
import { DataConnection } from './types';
import useDataConnections from './screens/detail/data-connections/useDataConnections';
import useProjectNotebookStates from './notebook/useProjectNotebookStates';
import useProjectPvcs from './screens/detail/storage/useProjectPvcs';

type ProjectDetailsContextType = {
  currentProject: ProjectKind;
  refreshAllProjectData: () => void;
  notebooks: ContextResourceData<NotebookState>;
  pvcs: ContextResourceData<PersistentVolumeClaimKind>;
  dataConnections: ContextResourceData<DataConnection>;
  servingRuntimesConfig: ServingRuntimesConfigResourceData;
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
  servingRuntimesConfig: {
    servingRuntimesConfig: undefined,
    loaded: false,
    refresh: () => undefined,
  },
  servingRuntimes: DEFAULT_CONTEXT_DATA,
  inferenceServices: DEFAULT_CONTEXT_DATA,
  serverSecrets: DEFAULT_CONTEXT_DATA,
});

const ProjectDetailsContextProvider: React.FC = () => {
  const { dashboardConfig } = useAppContext();
  const { namespace } = useParams<{ namespace: string }>();
  const { projects } = React.useContext(ProjectsContext);
  const project = projects.find(byName(namespace));
  const notebooks = useContextResourceData<NotebookState>(useProjectNotebookStates(namespace));
  const pvcs = useContextResourceData<PersistentVolumeClaimKind>(useProjectPvcs(namespace));
  const dataConnections = useContextResourceData<DataConnection>(useDataConnections(namespace));
  const servingRuntimesConfig = useServingRuntimesConfig();
  const servingRuntimes = useContextResourceData<ServingRuntimeKind>(useServingRuntimes(namespace));
  const inferenceServices = useContextResourceData<InferenceServiceKind>(
    useInferenceServices(namespace),
  );
  const serverSecrets = useContextResourceData<SecretKind>(useServingRuntimeSecrets(namespace));

  const notebookRefresh = notebooks.refresh;
  const pvcRefresh = pvcs.refresh;
  const dataConnectionRefresh = dataConnections.refresh;
  const servingRuntimesConfigRefresh = servingRuntimesConfig.refresh;
  const servingRuntimeRefresh = servingRuntimes.refresh;
  const inferenceServiceRefresh = inferenceServices.refresh;
  const refreshAllProjectData = React.useCallback(() => {
    notebookRefresh();
    setTimeout(notebookRefresh, 2000);
    pvcRefresh();
    dataConnectionRefresh();
    servingRuntimesConfigRefresh();
    servingRuntimeRefresh();
    inferenceServiceRefresh();
  }, [
    notebookRefresh,
    pvcRefresh,
    dataConnectionRefresh,
    servingRuntimesConfigRefresh,
    servingRuntimeRefresh,
    inferenceServiceRefresh,
  ]);

  if (!project) {
    return (
      <InvalidProject
        namespace={namespace}
        title="Problem loading project details"
        navigateTo="/projects"
        navigateText="View my projects"
      />
    );
  }

  return (
    <ProjectDetailsContext.Provider
      value={{
        currentProject: project,
        notebooks,
        pvcs,
        dataConnections,
        servingRuntimesConfig,
        servingRuntimes,
        inferenceServices,
        refreshAllProjectData,
        serverSecrets,
      }}
    >
      {featureFlagEnabled(dashboardConfig.spec.dashboardConfig.disablePipelines) ? (
        <PipelineContextProvider namespace={project.metadata.name}>
          <Outlet />
        </PipelineContextProvider>
      ) : (
        <Outlet />
      )}
    </ProjectDetailsContext.Provider>
  );
};

export default ProjectDetailsContextProvider;
