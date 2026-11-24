import * as React from 'react';
import { Content, EmptyState, EmptyStateBody, Flex, FlexItem } from '@patternfly/react-core';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useWorkingProjectRouteSync } from '@odh-dashboard/plugin-core/routing';
import {
  requiresWorkingProjectSelection,
  useWorkingProject,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { CollectionsContextProvider } from '~/app/context/CollectionsContext';
import EvalHubNoProjects from './EvalHubNoProjects';
import EvalHubInvalidProject from './EvalHubInvalidProject';
import EvalHubHeader from './EvalHubHeader';
import EvalHubProjectSelector from './EvalHubProjectSelector';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type EmptyStateProps = 'emptyStatePage' | 'empty';

type EvalHubCoreLoaderProps = {
  getInvalidRedirectPath: (namespace: string) => string;
};

type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

const EvalHubCoreLoader: React.FC<EvalHubCoreLoaderProps> = ({ getInvalidRedirectPath }) => {
  const { namespace } = useParams<{ namespace: string }>();
  const isUnifiedProjectSelectorEnabled = useIsAreaAvailable(
    SupportedArea.UNIFIED_PROJECT_SELECTOR,
  ).status;
  const { namespaces, namespacesLoaded, preferredNamespace } =
    useNamespaceSelectorWithPersistence();
  const {
    activeProject,
    projects: workingProjects,
    selectProject,
    registerProjectRouteSync,
    status: workingProjectStatus,
  } = useWorkingProject();
  useWorkingProjectRouteSync({
    activeProjectName: activeProject?.name,
    routeProjectName: namespace,
    projects: workingProjects,
    selectProject,
    enabled: isUnifiedProjectSelectorEnabled,
    getProjectPath: getInvalidRedirectPath,
    registerProjectRouteSync,
  });

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  if (namespaces.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: <EvalHubNoProjects />,
    };
  } else if (namespace) {
    const routeProjects = isUnifiedProjectSelectorEnabled ? workingProjects : namespaces;
    const foundProject = routeProjects.find((n) => n.name === namespace);
    if (foundProject) {
      return (
        <CollectionsContextProvider key={namespace} namespace={namespace}>
          {/* Keying by namespace remounts the page on project switch so namespace-scoped
              page state (drawer selection, run selection, filters) cannot leak across projects */}
          <Outlet key={namespace} />
        </CollectionsContextProvider>
      );
    }

    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <EvalHubInvalidProject namespace={namespace} getRedirectPath={getInvalidRedirectPath} />
      ),
    };
  } else {
    const shouldSelectProject =
      isUnifiedProjectSelectorEnabled && requiresWorkingProjectSelection(workingProjectStatus);
    if (shouldSelectProject) {
      renderStateProps = {
        empty: true,
        emptyStatePage: (
          <EmptyState titleText="Select a project to begin" headingLevel="h2">
            <EmptyStateBody>Choose a project from the project selector to continue.</EmptyStateBody>
          </EmptyState>
        ),
      };
    } else {
      const redirectNamespace = isUnifiedProjectSelectorEnabled
        ? activeProject
        : (preferredNamespace ?? namespaces[0]);
      if (redirectNamespace) {
        return <Navigate to={getInvalidRedirectPath(redirectNamespace.name)} replace />;
      }
      renderStateProps = { empty: true, emptyStatePage: <EvalHubNoProjects /> };
    }
  }

  return (
    <ApplicationsPage
      {...renderStateProps}
      title={<EvalHubHeader title="Evaluations" />}
      description="Run evaluations on models, agents, and datasets to optimize performance."
      headerContent={
        !isUnifiedProjectSelectorEnabled && (
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
            <ProjectIconWithSize size={IconSize.LG} />
            <FlexItem>
              <Content component="p">Project</Content>
            </FlexItem>
            <FlexItem>
              <EvalHubProjectSelector
                namespace={namespace}
                getRedirectPath={getInvalidRedirectPath}
              />
            </FlexItem>
          </Flex>
        )
      }
      loaded={namespacesLoaded}
      provideChildrenPadding
    />
  );
};

export default EvalHubCoreLoader;
