import React, { useCallback, useMemo, useState } from 'react';
import { Bullseye, PageSection, Spinner } from '@patternfly/react-core';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { loadRemote } from '@module-federation/runtime';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { isActionExtension } from '@odh-dashboard/plugin-core/extension-points';
import { ExtensibleActions } from '@odh-dashboard/plugin-core/helpers/ui';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { useNotification } from '@odh-dashboard/ui-core/contexts/NotificationContext';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { getStoredPreferredProject } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { WORKSPACE_QUERY_PARAM } from '@odh-dashboard/internal/routes/pipelines/mlflow';
import type { APIOptions } from 'mod-arch-core';
import {
  MCP_REGISTRY_BASENAME,
  mcpRegistryBaseRoute,
  mcpServerDetailRoute,
  DEFAULT_MCP_PATH,
} from './const';
import useHostRouteSync from './useHostRouteSync';
import { createMcpAccessEndpoint } from './api';
import { buildMcpAccessEndpointUrl } from './buildMcpAccessEndpointUrl';
import { registryVersionToDeployData } from './registryVersionToDeployData';
import { MCPServer, MCPServerVersion } from './types';
import MLflowUnavailable from '../shared/MLflowUnavailable';
import MlflowBreadcrumbs, { BreadcrumbEntry } from '../shared/MlflowBreadcrumbs';

const MCP_REGISTRY_SERVER_DEPLOY_GROUP = 'mcp-registry.server-deploy';

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
  const actionExtensions = useExtensions(isActionExtension);
  const notification = useNotification();
  const abortControllerRef = React.useRef<AbortController>();

  React.useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const handleBreadcrumbChange = useCallback(
    (segments: BreadcrumbEntry[]) => {
      syncHostRoute();
      setBreadcrumbs(segments);
    },
    [syncHostRoute],
  );

  const renderDetailActions = useCallback(
    (server: MCPServer, version?: MCPServerVersion) => {
      const isVersionDeployable = version?.status === 'active';

      let disabledReason: string | undefined;
      if (!version) {
        disabledReason = 'Select a server version to deploy';
      } else if (!isVersionDeployable) {
        disabledReason = 'Change this version to Active before deploying';
      } else if (!workspace) {
        disabledReason = 'Select a project to deploy to';
      }

      const registryData =
        !disabledReason && version
          ? { ...registryVersionToDeployData(server, version), namespace: workspace }
          : undefined;

      const deployData = registryData
        ? {
            registryServer: registryData.registryServer,
            registryVersion: registryData.registryVersion,
            displayName: registryData.displayName,
            namespace: registryData.namespace,
            image: registryData.image,
            yaml: registryData.yaml,
          }
        : undefined;

      /* eslint-disable camelcase */
      const onDeployed = registryData
        ? async (deployment: { name: string; namespace: string; port: number; path?: string }) => {
            abortControllerRef.current?.abort();
            const controller = new AbortController();
            abortControllerRef.current = controller;
            const opts: APIOptions = { signal: controller.signal };

            try {
              await createMcpAccessEndpoint(registryData.registryServer, deployment.namespace)(
                opts,
                {
                  endpoint_url: buildMcpAccessEndpointUrl(
                    deployment.name,
                    deployment.namespace,
                    deployment.port,
                    deployment.path || DEFAULT_MCP_PATH,
                  ),
                  transport_type: registryData.transportType,
                  server_version: registryData.registryVersion,
                },
              );
              notification.success('Deployment submitted');
            } catch (endpointError) {
              if (controller.signal.aborted) {
                return;
              }
              notification.warning(
                'Deployment submitted, but endpoint registration failed',
                (endpointError instanceof Error && endpointError.message) ||
                  'Failed to register the MCP access endpoint.',
              );
            }
          }
        : undefined;
      /* eslint-enable camelcase */

      return (
        <ExtensibleActions
          actions={actionExtensions}
          group={MCP_REGISTRY_SERVER_DEPLOY_GROUP}
          componentProps={{ deployData, disabledReason, onDeployed }}
        />
      );
    },
    [workspace, actionExtensions, notification],
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
