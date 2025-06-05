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
} from '#~/k8sTypes';
import {
  DEFAULT_LIST_FETCH_STATE,
  DEFAULT_LIST_WATCH_RESULT,
  DEFAULT_LIST_WITH_NON_DASHBOARD_PRESENCE_FETCH_STATE,
  POLL_INTERVAL,
} from '#~/utilities/const';
import useServingRuntimes from '#~/pages/modelServing/useServingRuntimes';
import useInferenceServices from '#~/pages/modelServing/useInferenceServices';
import { CustomWatchK8sResult, ListWithNonDashboardPresence } from '#~/types';
import { FetchStateObject } from '#~/utilities/useFetch';
import useServingRuntimeSecrets from '#~/pages/modelServing/screens/projects/useServingRuntimeSecrets';
import { PipelineContextProvider } from '#~/concepts/pipelines/context';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import InvalidProject from '#~/concepts/projects/InvalidProject';
import useSyncPreferredProject from '#~/concepts/projects/useSyncPreferredProject';
import useTemplateOrder from '#~/pages/modelServing/customServingRuntimes/useTemplateOrder';
import useTemplateDisablement from '#~/pages/modelServing/customServingRuntimes/useTemplateDisablement';
import { useDashboardNamespace } from '#~/redux/selectors';
import { getTokenNames } from '#~/pages/modelServing/utils';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { Connection } from '#~/concepts/connectionTypes/types';
import { useGroups, useTemplates } from '#~/api';
import { NotebookState } from './notebook/types';
import useProjectNotebookStates from './notebook/useProjectNotebookStates';
import useProjectPvcs from './screens/detail/storage/useProjectPvcs';
import useProjectSharing from './projectSharing/useProjectSharing';
import useConnections from './screens/detail/connections/useConnections';

export type ProjectDetailsContextType = {
  currentProject: ProjectKind;
  filterTokens: (servingRuntime?: string) => SecretKind[];
  notebooks: FetchStateObject<NotebookState[]>;
  pvcs: FetchStateObject<PersistentVolumeClaimKind[]>;
  connections: FetchStateObject<Connection[]>;
  servingRuntimes: FetchStateObject<ListWithNonDashboardPresence<ServingRuntimeKind>>;
  servingRuntimeTemplates: CustomWatchK8sResult<TemplateKind[]>;
  servingRuntimeTemplateOrder: FetchStateObject<string[]>;
  servingRuntimeTemplateDisablement: FetchStateObject<string[]>;
  inferenceServices: FetchStateObject<ListWithNonDashboardPresence<InferenceServiceKind>>;
  serverSecrets: FetchStateObject<SecretKind[]>;
  projectSharingRB: FetchStateObject<RoleBindingKind[]>;
  groups: CustomWatchK8sResult<GroupKind[]>;
};

export const ProjectDetailsContext = React.createContext<ProjectDetailsContextType>({
  currentProject: { apiVersion: '', kind: '', metadata: { name: '' } },
  filterTokens: () => [],
  notebooks: DEFAULT_LIST_FETCH_STATE,
  pvcs: DEFAULT_LIST_FETCH_STATE,
  connections: DEFAULT_LIST_FETCH_STATE,
  servingRuntimes: DEFAULT_LIST_WITH_NON_DASHBOARD_PRESENCE_FETCH_STATE,
  servingRuntimeTemplates: DEFAULT_LIST_WATCH_RESULT,
  servingRuntimeTemplateOrder: DEFAULT_LIST_FETCH_STATE,
  servingRuntimeTemplateDisablement: DEFAULT_LIST_FETCH_STATE,
  inferenceServices: DEFAULT_LIST_WITH_NON_DASHBOARD_PRESENCE_FETCH_STATE,
  serverSecrets: DEFAULT_LIST_FETCH_STATE,
  projectSharingRB: DEFAULT_LIST_FETCH_STATE,
  groups: DEFAULT_LIST_WATCH_RESULT,
});

const ProjectDetailsContextProvider: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { namespace } = useParams<{ namespace: string }>();
  const { projects } = React.useContext(ProjectsContext);
  const project = projects.find(byName(namespace)) ?? null;
  useSyncPreferredProject(project);
  const notebooks = useProjectNotebookStates(namespace, { refreshRate: POLL_INTERVAL });

  const pvcs = useProjectPvcs(namespace, { refreshRate: POLL_INTERVAL });
  const connections = useConnections(namespace, { refreshRate: POLL_INTERVAL });
  const servingRuntimes = useServingRuntimes(namespace, undefined, { refreshRate: POLL_INTERVAL });
  const servingRuntimeTemplates = useTemplates(dashboardNamespace);
  const servingRuntimeTemplateOrder = useTemplateOrder(dashboardNamespace);
  const servingRuntimeTemplateDisablement = useTemplateDisablement(dashboardNamespace);
  const inferenceServices = useInferenceServices(namespace, undefined, undefined, undefined, {
    refreshRate: POLL_INTERVAL,
  });
  const serverSecrets = useServingRuntimeSecrets(namespace, { refreshRate: POLL_INTERVAL });
  const projectSharingRB = useProjectSharing(namespace, { refreshRate: POLL_INTERVAL });

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
