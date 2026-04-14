import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { byName, ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import InvalidProject from '@odh-dashboard/internal/concepts/projects/InvalidProject';
import ProjectSelectorNavigator from '@odh-dashboard/internal/concepts/projects/ProjectSelectorNavigator';
import { EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { ApplicationsPage } from 'mod-arch-shared';
import { useModularArchContext, Namespace } from 'mod-arch-core';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type EmptyStateProps = 'emptyStatePage' | 'empty';

type McpDeploymentsCoreLoaderProps = {
  getInvalidRedirectPath: (namespace: string) => string;
};

type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

const McpDeploymentsCoreLoader: React.FC<McpDeploymentsCoreLoaderProps> = ({
  getInvalidRedirectPath,
}) => {
  const { namespace } = useParams<{ namespace: string }>();
  const { projects, preferredProject, updatePreferredProject, loaded } =
    React.useContext(ProjectsContext);
  const { updatePreferredNamespace } = useModularArchContext();

  const foundProject = React.useMemo(
    () => (namespace ? projects.find(byName(namespace)) : undefined),
    [namespace, projects],
  );

  // Sync the URL namespace to both ProjectsContext and mod-arch-core's preferred
  // namespace so that: (1) other pages (model serving, etc.) see the same preferred
  // project, and (2) upstream API hooks (useQueryParamNamespaces) pick up the
  // correct namespace.
  React.useEffect(() => {
    if (namespace) {
      const ns: Namespace = { name: namespace };
      updatePreferredNamespace(ns);
    }
    if (foundProject) {
      updatePreferredProject(foundProject);
    }
  }, [namespace, foundProject, updatePreferredNamespace, updatePreferredProject]);

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  if (projects.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <EmptyState
          icon={CubesIcon}
          titleText="No data science projects"
          variant={EmptyStateVariant.lg}
          data-testid="mcp-deployments-no-projects"
        >
          <EmptyStateBody>
            To view MCP server deployments, first create a data science project.
          </EmptyStateBody>
        </EmptyState>
      ),
    };
  } else if (namespace) {
    if (foundProject) {
      return <Outlet />;
    }

    // Invalid project path
    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <InvalidProject namespace={namespace} getRedirectPath={getInvalidRedirectPath} />
      ),
    };
  } else {
    // No namespace in URL — redirect to preferred project
    if (preferredProject) {
      return <Navigate to={getInvalidRedirectPath(preferredProject.metadata.name)} replace />;
    }
    // Fall back to first project
    return <Navigate to={getInvalidRedirectPath(projects[0].metadata.name)} replace />;
  }

  return (
    <ApplicationsPage
      {...renderStateProps}
      title="MCP server deployments"
      description="Manage and view the health and performance of your deployed MCP servers."
      loaded={loaded}
      headerContent={
        <ProjectSelectorNavigator getRedirectPath={getInvalidRedirectPath} showTitle />
      }
      provideChildrenPadding
    />
  );
};

export default McpDeploymentsCoreLoader;
