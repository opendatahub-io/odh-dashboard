import React, { useCallback, useMemo, useState } from 'react';
import { Bullseye, PageSection, Spinner } from '@patternfly/react-core';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { loadRemote } from '@module-federation/runtime';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { getStoredPreferredProject } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { WORKSPACE_QUERY_PARAM } from '@odh-dashboard/internal/routes/pipelines/mlflow';
import { MCP_REGISTRY_BASENAME, mcpRegistryBaseRoute, mcpServerDetailRoute } from './const';
import useHostRouteSync from './useHostRouteSync';
import McpRegistryDeployAction from './McpRegistryDeployAction';
import { MCPServer, MCPServerVersion } from './types';
import MLflowUnavailable from '../shared/MLflowUnavailable';
import MlflowBreadcrumbs, { BreadcrumbEntry } from '../shared/MlflowBreadcrumbs';

/**
 * Full-screen breakout for a single MCP server's detail page.
 *
 * Registered as a standalone `app.route` (see extensions.ts) so it renders
 * outside of the "MCP servers" tab page shell (no page title, no tab bar).
 * The remote reports breadcrumb segments (with the resolved server display
 * name) via `onBreadcrumbChange`; its own internal breadcrumb is hidden
 * when embedded so only this host-rendered one shows.
 */
const MlflowMcpRegistryDetailPage: React.FC = () => {
  const { serverName } = useParams<{ serverName: string }>();
  const [searchParams] = useSearchParams();
  const workspace = searchParams.get(WORKSPACE_QUERY_PARAM) ?? '';
  const { projects, preferredProject } = React.useContext(ProjectsContext);
  const storedProject = getStoredPreferredProject(projects);
  const syncHostRoute = useHostRouteSync();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([]);

  const handleBreadcrumbChange = useCallback(
    (segments: BreadcrumbEntry[]) => {
      syncHostRoute();
      setBreadcrumbs(segments);
    },
    [syncHostRoute],
  );

  const renderDetailActions = useCallback(
    (server: MCPServer, version?: MCPServerVersion) => (
      <McpRegistryDeployAction server={server} version={version} namespace={workspace} />
    ),
    [workspace],
  );

  const loadWrapper = useMemo(
    () => () =>
      loadRemote<{ default: React.ComponentType }>('mlflowEmbedded/MlflowMcpRegistryWrapper')
        .then((mod) => mod ?? { default: MLflowUnavailable })
        .catch(() => ({ default: MLflowUnavailable })),
    [],
  );

  if (!workspace && projects.length > 0) {
    const defaultProject = storedProject ?? preferredProject ?? projects[0];
    // Preserve the requested server (e.g. a bookmarked/shared detail URL
    // without a workspace param) instead of dropping back to the list.
    const redirectTo = serverName
      ? mcpServerDetailRoute(serverName, defaultProject.metadata.name)
      : mcpRegistryBaseRoute(defaultProject.metadata.name);
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <ApplicationsPage
      loaded
      empty={false}
      noHeader
      breadcrumb={
        breadcrumbs.length > 0 ? (
          <MlflowBreadcrumbs
            basePath={MCP_REGISTRY_BASENAME}
            workspace={workspace}
            breadcrumbs={breadcrumbs}
          />
        ) : undefined
      }
      keepBodyWrapper={false}
    >
      <LazyCodeRefComponent
        key={workspace}
        component={loadWrapper}
        props={{
          basename: MCP_REGISTRY_BASENAME,
          onBreadcrumbChange: handleBreadcrumbChange,
          renderDetailActions,
        }}
        fallback={
          <PageSection hasBodyWrapper={false}>
            <Bullseye>
              <Spinner />
            </Bullseye>
          </PageSection>
        }
      />
    </ApplicationsPage>
  );
};

export default MlflowMcpRegistryDetailPage;
