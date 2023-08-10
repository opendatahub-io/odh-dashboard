import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import {
  ServingRuntimeKind,
  PersistentVolumeClaimKind,
  ProjectKind,
  InferenceServiceKind,
  SecretKind,
  RoleBindingKind,
  GroupKind,
  TemplateKind,
} from '~/k8sTypes';
import { DEFAULT_CONTEXT_DATA } from '~/utilities/const';
import useServingRuntimes from '~/pages/modelServing/useServingRuntimes';
import useInferenceServices from '~/pages/modelServing/useInferenceServices';
import { ContextResourceData } from '~/types';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import useServingRuntimeSecrets from '~/pages/modelServing/screens/projects/useServingRuntimeSecrets';
import { PipelineContextProvider } from '~/concepts/pipelines/context';
import { useAppContext } from '~/app/AppContext';
import { featureFlagEnabled } from '~/utilities/utils';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import InvalidProject from '~/concepts/projects/InvalidProject';
import useSyncPreferredProject from '~/concepts/projects/useSyncPreferredProject';
import useTemplates from '~/pages/modelServing/customServingRuntimes/useTemplates';
import useTemplateOrder from '~/pages/modelServing/customServingRuntimes/useTemplateOrder';
import useTemplateDisablement from '~/pages/modelServing/customServingRuntimes/useTemplateDisablement';
import { useDashboardNamespace } from '~/redux/selectors';
import { getTokenNames } from '~/pages/modelServing/utils';
import { NotebookState } from './notebook/types';
import { DataConnection } from './types';
import useDataConnections from './screens/detail/data-connections/useDataConnections';
import useProjectNotebookStates from './notebook/useProjectNotebookStates';
import useProjectPvcs from './screens/detail/storage/useProjectPvcs';
import useProjectSharing from './projectSharing/useProjectSharing';
import useGroups from './projectSharing/useGroups';

type ProjectDetailsContextType = {
  currentProject: ProjectKind;
  refreshAllProjectData: () => void;
  filterTokens: (servingRuntime?: string) => SecretKind[];
  notebooks: ContextResourceData<NotebookState>;
  pvcs: ContextResourceData<PersistentVolumeClaimKind>;
  dataConnections: ContextResourceData<DataConnection>;
  servingRuntimes: ContextResourceData<ServingRuntimeKind>;
  servingRuntimeTemplates: ContextResourceData<TemplateKind>;
  servingRuntimeTemplateOrder: ContextResourceData<string>;
  servingRuntimeTemplateDisablement: ContextResourceData<string>;
  inferenceServices: ContextResourceData<InferenceServiceKind>;
  serverSecrets: ContextResourceData<SecretKind>;
  projectSharingRB: ContextResourceData<RoleBindingKind>;
  groups: ContextResourceData<GroupKind>;
};

export const ProjectDetailsContext = React.createContext<ProjectDetailsContextType>({
  // We never will get into a case without a project, so fudge the default value
  currentProject: null as unknown as ProjectKind,
  refreshAllProjectData: () => undefined,
  filterTokens: () => [],
  notebooks: DEFAULT_CONTEXT_DATA,
  pvcs: DEFAULT_CONTEXT_DATA,
  dataConnections: DEFAULT_CONTEXT_DATA,
  servingRuntimes: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplates: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplateOrder: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplateDisablement: DEFAULT_CONTEXT_DATA,
  inferenceServices: DEFAULT_CONTEXT_DATA,
  serverSecrets: DEFAULT_CONTEXT_DATA,
  projectSharingRB: DEFAULT_CONTEXT_DATA,
  groups: DEFAULT_CONTEXT_DATA,
});

const ProjectDetailsContextProvider: React.FC = () => {
  const { dashboardConfig } = useAppContext();
  const { dashboardNamespace } = useDashboardNamespace();
  const { namespace } = useParams<{ namespace: string }>();
  const { projects } = React.useContext(ProjectsContext);
  const project = projects.find(byName(namespace)) ?? null;
  useSyncPreferredProject(project);
  const notebooks = useContextResourceData<NotebookState>(useProjectNotebookStates(namespace));
  const pvcs = useContextResourceData<PersistentVolumeClaimKind>(useProjectPvcs(namespace));
  const dataConnections = useContextResourceData<DataConnection>(useDataConnections(namespace));
  const servingRuntimes = useContextResourceData<ServingRuntimeKind>(useServingRuntimes(namespace));
  const servingRuntimeTemplates = useContextResourceData<TemplateKind>(
    useTemplates(dashboardNamespace),
  );
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
  const groups = useContextResourceData<GroupKind>(useGroups());

  const notebookRefresh = notebooks.refresh;
  const pvcRefresh = pvcs.refresh;
  const dataConnectionRefresh = dataConnections.refresh;
  const servingRuntimeRefresh = servingRuntimes.refresh;
  const servingRuntimeTemplateRefresh = servingRuntimeTemplates.refresh;
  const servingRuntimeTemplateOrderRefresh = servingRuntimeTemplateOrder.refresh;
  const servingRuntimeTemplateDisablementRefresh = servingRuntimeTemplateDisablement.refresh;
  const inferenceServiceRefresh = inferenceServices.refresh;
  const projectSharingRefresh = projectSharingRB.refresh;
  const groupsRefresh = groups.refresh;
  const refreshAllProjectData = React.useCallback(() => {
    notebookRefresh();
    setTimeout(notebookRefresh, 2000);
    pvcRefresh();
    dataConnectionRefresh();
    servingRuntimeRefresh();
    inferenceServiceRefresh();
    projectSharingRefresh();
    groupsRefresh();
    servingRuntimeTemplateRefresh();
    servingRuntimeTemplateOrderRefresh();
    servingRuntimeTemplateDisablementRefresh();
  }, [
    notebookRefresh,
    pvcRefresh,
    dataConnectionRefresh,
    servingRuntimeRefresh,
    servingRuntimeTemplateRefresh,
    servingRuntimeTemplateOrderRefresh,
    servingRuntimeTemplateDisablementRefresh,
    inferenceServiceRefresh,
    projectSharingRefresh,
    groupsRefresh,
  ]);

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

  if (!project) {
    if (
      featureFlagEnabled(dashboardConfig.spec.dashboardConfig.disableProjects) &&
      projects.length === 0
    ) {
      // No projects, but we do have the projects view -- navigate them so they can go through normal flows
      return <Navigate to="/projects" replace />;
    }

    return (
      <InvalidProject
        namespace={namespace}
        title="Problem loading project details"
        getRedirectPath={(namespace) => `/projects/${namespace}`}
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
        servingRuntimes,
        servingRuntimeTemplates,
        servingRuntimeTemplateOrder,
        servingRuntimeTemplateDisablement,
        inferenceServices,
        refreshAllProjectData,
        filterTokens,
        serverSecrets,
        projectSharingRB,
        groups,
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
