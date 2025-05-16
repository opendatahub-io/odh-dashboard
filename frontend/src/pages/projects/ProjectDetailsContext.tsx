import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import {
  GroupKind,
  InferenceServiceKind,
  PersistentVolumeClaimKind,
  ProjectKind,
  RoleBindingKind,
  SecretKind,
  ServingRuntimeKind,
  TemplateKind,
} from '~/k8sTypes';
import { DEFAULT_CONTEXT_DATA, DEFAULT_LIST_WATCH_RESULT } from '~/utilities/const';
import useServingRuntimes from '~/pages/modelServing/useServingRuntimes';
import useInferenceServices from '~/pages/modelServing/useInferenceServices';
import { ContextResourceData, CustomWatchK8sResult } from '~/types';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import useServingRuntimeSecrets from '~/pages/modelServing/screens/projects/useServingRuntimeSecrets';
import { PipelineContextProvider } from '~/concepts/pipelines/context';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import InvalidProject from '~/concepts/projects/InvalidProject';
import useSyncPreferredProject from '~/concepts/projects/useSyncPreferredProject';
import useTemplateOrder from '~/pages/modelServing/customServingRuntimes/useTemplateOrder';
import useTemplateDisablement from '~/pages/modelServing/customServingRuntimes/useTemplateDisablement';
import { useDashboardNamespace } from '~/redux/selectors';
import { getTokenNames } from '~/pages/modelServing/utils';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { Connection } from '~/concepts/connectionTypes/types';
import { useGroups, useTemplates } from '~/api';
import { NotebookState } from './notebook/types';
import useProjectNotebookStates from './notebook/useProjectNotebookStates';
import useProjectPvcs from './screens/detail/storage/useProjectPvcs';
import useProjectSharing from './projectSharing/useProjectSharing';
import useConnections from './screens/detail/connections/useConnections';

type ProjectDetailsContextType = {
  currentProject: ProjectKind;
  filterTokens: (servingRuntime?: string) => SecretKind[];
  notebooks: ContextResourceData<NotebookState>;
  pvcs: ContextResourceData<PersistentVolumeClaimKind>;
  connections: ContextResourceData<Connection>;
  servingRuntimes: ContextResourceData<ServingRuntimeKind>;
  servingRuntimeTemplates: CustomWatchK8sResult<TemplateKind[]>;
  servingRuntimeTemplateOrder: ContextResourceData<string>;
  servingRuntimeTemplateDisablement: ContextResourceData<string>;
  inferenceServices: ContextResourceData<InferenceServiceKind>;
  serverSecrets: ContextResourceData<SecretKind>;
  projectSharingRB: ContextResourceData<RoleBindingKind>;
  groups: CustomWatchK8sResult<GroupKind[]>;
};

export const ProjectDetailsContext = React.createContext<ProjectDetailsContextType>({
  currentProject: { apiVersion: '', kind: '', metadata: { name: '' } },
  filterTokens: () => [],
  notebooks: DEFAULT_CONTEXT_DATA,
  pvcs: DEFAULT_CONTEXT_DATA,
  connections: DEFAULT_CONTEXT_DATA,
  servingRuntimes: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplates: DEFAULT_LIST_WATCH_RESULT,
  servingRuntimeTemplateOrder: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplateDisablement: DEFAULT_CONTEXT_DATA,
  inferenceServices: DEFAULT_CONTEXT_DATA,
  serverSecrets: DEFAULT_CONTEXT_DATA,
  projectSharingRB: DEFAULT_CONTEXT_DATA,
  groups: DEFAULT_LIST_WATCH_RESULT,
});

const ProjectDetailsContextProvider: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { namespace } = useParams<{ namespace: string }>();
  const { projects } = React.useContext(ProjectsContext);
  const project = projects.find(byName(namespace)) ?? null;
  useSyncPreferredProject(project);
  const notebooks = useContextResourceData<NotebookState>(useProjectNotebookStates(namespace));
  const pvcs = useContextResourceData<PersistentVolumeClaimKind>(useProjectPvcs(namespace));
  const connections = useContextResourceData<Connection>(useConnections(namespace));
  const servingRuntimes = useContextResourceData<ServingRuntimeKind>(useServingRuntimes(namespace));
  const servingRuntimeTemplates = useTemplates(dashboardNamespace);

  const servingRuntimeTemplateOrder = useContextResourceData<string>(
    useTemplateOrder(dashboardNamespace),
  );
  const servingRuntimeTemplateDisablement = useContextResourceData<string>(
    useTemplateDisablement(dashboardNamespace),
  );
  const inferenceServices = useContextResourceData<InferenceServiceKind>(
    useInferenceServices(namespace),
  );
  const serverSecrets = useContextResourceData<SecretKind>(useServingRuntimeSecrets(namespace));
  const projectSharingRB = useContextResourceData<RoleBindingKind>(useProjectSharing(namespace));
  const groups = useGroups();
  const pageName = 'project details';

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

  const projectsEnabled = useIsAreaAvailable(SupportedArea.DS_PROJECTS_VIEW).status;
  const pipelinesEnabled = useIsAreaAvailable(SupportedArea.DS_PIPELINES).status;

  const contextValue = React.useMemo(
    () =>
      project
        ? {
            currentProject: project,
            notebooks,
            pvcs,
            connections,
            servingRuntimes,
            servingRuntimeTemplates,
            servingRuntimeTemplateOrder,
            servingRuntimeTemplateDisablement,
            inferenceServices,
            filterTokens,
            serverSecrets,
            projectSharingRB,
            groups,
          }
        : null,
    [
      project,
      notebooks,
      pvcs,
      connections,
      servingRuntimes,
      servingRuntimeTemplates,
      servingRuntimeTemplateOrder,
      servingRuntimeTemplateDisablement,
      inferenceServices,
      filterTokens,
      serverSecrets,
      projectSharingRB,
      groups,
    ],
  );

  if (!project || !contextValue) {
    if (projectsEnabled && projects.length === 0) {
      // No projects, but we do have the projects view -- navigate them so they can go through normal flows
      return <Navigate to="/projects" replace />;
    }

    return (
      <InvalidProject
        namespace={namespace}
        title={`Problem loading ${pageName}`}
        getRedirectPath={(ns) => `/projects/${ns}`}
      />
    );
  }

  return (
    <ProjectDetailsContext.Provider value={contextValue}>
      {pipelinesEnabled ? (
        <PipelineContextProvider namespace={project.metadata.name} pageName={pageName}>
          <Outlet />
        </PipelineContextProvider>
      ) : (
        <Outlet />
      )}
    </ProjectDetailsContext.Provider>
  );
};

export default ProjectDetailsContextProvider;
