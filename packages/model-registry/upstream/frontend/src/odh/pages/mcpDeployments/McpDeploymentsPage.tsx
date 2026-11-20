import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApplicationsPage } from 'mod-arch-shared';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Button,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
import McpDeployModal from '~/odh/components/McpDeployModal';
import NamespaceSelectorFieldWrapper from '~/odh/components/NamespaceSelectorFieldWrapper';
import { useProjectsBridge } from '~/odh/context/ProjectsBridgeContext';
import { mcpDeploymentsUrl } from '~/app/routes/mcpCatalog/mcpCatalog';
import useMcpDeployments from './useMcpDeployments';
import McpDeploymentsTable from './McpDeploymentsTable';
import McpDeploymentsToolbar from './McpDeploymentsToolbar';
import McpDeploymentsEmptyState from './McpDeploymentsEmptyState';
import DeleteMcpDeploymentModal from './DeleteMcpDeploymentModal';
import DeleteMcpGatewayLayerModal from './DeleteMcpGatewayLayerModal';
import McpDeploymentInstallStatusModal from './McpDeploymentInstallStatusModal';
import { getDeploymentDisplayName } from './utils';

type McpDeploymentsPageProps = {
  namespace?: string;
};

const McpDeploymentsPage: React.FC<McpDeploymentsPageProps> = ({ namespace }) => {
  const [deployments, loaded, loadError, refresh] = useMcpDeployments(namespace);
  const [filterText, setFilterText] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<McpDeployment | undefined>();
  const [deleteGatewayLayer, setDeleteGatewayLayer] = React.useState(false);
  const [editingDeployment, setEditingDeployment] = React.useState<McpDeployment>();
  const [statusDeployment, setStatusDeployment] = React.useState<McpDeployment>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { updatePreferredProject, projects } = useProjectsBridge();
  const navigate = useNavigate();

  const installationName = searchParams.get('installation');
  const newDeploymentName =
    searchParams.get('newInstall') === 'true' ? (installationName ?? undefined) : undefined;
  React.useEffect(() => {
    if (!loaded || !installationName) {
      return;
    }
    const target = deployments.items.find((deployment) => deployment.name === installationName);
    if (target) {
      setStatusDeployment(target);
    }
  }, [deployments.items, installationName, loaded]);

  const handleProjectSelect = React.useCallback(
    (ns: string) => {
      const match = projects.find((p) => p.name === ns) ?? null;
      updatePreferredProject(match);
      navigate(mcpDeploymentsUrl(ns));
    },
    [projects, updatePreferredProject, navigate],
  );

  const handleDeleteClick = React.useCallback((deployment: McpDeployment) => {
    setDeleteTarget(deployment);
  }, []);

  const handleEditClick = React.useCallback((deployment: McpDeployment) => {
    setEditingDeployment(deployment);
  }, []);

  const handleViewStatus = React.useCallback((deployment: McpDeployment) => {
    setStatusDeployment(deployment);
  }, []);

  const closeStatus = React.useCallback(() => {
    setStatusDeployment(undefined);
    if (searchParams.has('installation')) {
      const next = new URLSearchParams(searchParams);
      next.delete('installation');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filteredDeployments = React.useMemo(() => {
    if (!filterText) {
      return deployments.items;
    }
    const lower = filterText.toLowerCase();
    return deployments.items.filter(
      (d) =>
        d.name.toLowerCase().includes(lower) ||
        getDeploymentDisplayName(d).toLowerCase().includes(lower) ||
        (d.serverName ?? '').toLowerCase().includes(lower) ||
        (d.registryServer ?? '').toLowerCase().includes(lower) ||
        (d.registryServerDisplayName ?? '').toLowerCase().includes(lower),
    );
  }, [deployments.items, filterText]);

  const clearFilters = React.useCallback(() => setFilterText(''), []);

  const noProjectSelected = !namespace;
  const isEmpty = !noProjectSelected && loaded && !loadError && deployments.items.length === 0;

  const headerContent = (
    <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
      <ProjectIconWithSize size={IconSize.XXL} />
      <Flex
        spaceItems={{ default: 'spaceItemsSm' }}
        alignItems={{ default: 'alignItemsCenter' }}
        flex={{ default: 'flex_2' }}
      >
        <FlexItem>
          <Bullseye>Project</Bullseye>
        </FlexItem>
        <FlexItem flex={{ default: 'flex_1' }}>
          <NamespaceSelectorFieldWrapper
            selectedNamespace={namespace ?? ''}
            onSelect={handleProjectSelect}
            selectorOnly
          />
        </FlexItem>
        {namespace && (
          <FlexItem>
            <Button
              variant="secondary"
              onClick={() => setDeleteGatewayLayer(true)}
              data-testid="remove-mcp-gateway-layer"
            >
              Remove Gateway layer
            </Button>
          </FlexItem>
        )}
      </Flex>
    </Flex>
  );

  return (
    <ApplicationsPage
      noTitle
      description="Manage and view the health and performance of your deployed MCP servers."
      headerContent={headerContent}
      loadError={noProjectSelected ? undefined : loadError}
      loaded={noProjectSelected ? true : loaded}
      empty={noProjectSelected || isEmpty}
      emptyStatePage={
        noProjectSelected ? (
          <EmptyState
            icon={CubesIcon}
            titleText="Select a project"
            variant={EmptyStateVariant.lg}
            data-testid="mcp-deployments-select-project"
          >
            <EmptyStateBody>Select a project to view MCP server deployments.</EmptyStateBody>
          </EmptyState>
        ) : (
          <McpDeploymentsEmptyState />
        )
      }
      provideChildrenPadding
    >
      <McpDeploymentsTable
        deployments={filteredDeployments}
        toolbarContent={
          <McpDeploymentsToolbar
            filterText={filterText}
            onFilterChange={setFilterText}
            onClearFilters={clearFilters}
          />
        }
        onClearFilters={clearFilters}
        onDeleteClick={handleDeleteClick}
        onEditClick={handleEditClick}
        onViewStatus={handleViewStatus}
        newDeploymentName={newDeploymentName}
      />
      {statusDeployment && (
        <McpDeploymentInstallStatusModal deployment={statusDeployment} onClose={closeStatus} />
      )}
      {deleteTarget && namespace && (
        <DeleteMcpDeploymentModal
          deployment={deleteTarget}
          namespace={namespace}
          onClose={(deleted) => {
            if (deleted) {
              refresh();
            }
            setDeleteTarget(undefined);
          }}
        />
      )}
      {editingDeployment && (
        <McpDeployModal
          onClose={(saved) => {
            setEditingDeployment(undefined);
            if (saved) {
              refresh();
            }
          }}
          data={{
            name: editingDeployment.name,
            displayName: editingDeployment.displayName,
            namespace: editingDeployment.namespace,
            serverName: editingDeployment.serverName,
            image: editingDeployment.image,
            yaml: editingDeployment.yaml,
          }}
        />
      )}
      {deleteGatewayLayer && namespace && (
        <DeleteMcpGatewayLayerModal
          namespace={namespace}
          onClose={(deleted) => {
            if (deleted) {
              refresh();
            }
            setDeleteGatewayLayer(false);
          }}
        />
      )}
    </ApplicationsPage>
  );
};

export default McpDeploymentsPage;
