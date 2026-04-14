import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Flex, FlexItem } from '@patternfly/react-core';
import { ApplicationsPage } from 'mod-arch-shared';
import useMcpDeployments from './useMcpDeployments';
import McpDeploymentsTable from './McpDeploymentsTable';
import McpDeploymentsToolbar from './McpDeploymentsToolbar';
import McpDeploymentsEmptyState from './McpDeploymentsEmptyState';
import DeleteMcpDeploymentModal from './DeleteMcpDeploymentModal';
import { getDeploymentDisplayName } from './utils';
import { mcpDeploymentsUrl } from '../../../upstream/frontend/src/app/routes/mcpCatalog/mcpCatalog';
import McpDeployModal from '../../odh/components/McpDeployModal';
import ProjectSelectorField from '../../projectSelector/ProjectSelectorField';
import { McpDeployment } from '../../types/mcpDeploymentTypes';

const McpDeploymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { namespace } = useParams<{ namespace: string }>();
  const [deployments, loaded, loadError, refresh] = useMcpDeployments();
  const [filterText, setFilterText] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<McpDeployment | undefined>();
  const [editingDeployment, setEditingDeployment] = React.useState<McpDeployment>();

  const handleProjectChange = React.useCallback(
    (projectName: string) => {
      if (!projectName) {
        return;
      }
      navigate(mcpDeploymentsUrl(projectName));
    },
    [navigate],
  );

  const handleDeleteClick = React.useCallback((deployment: McpDeployment) => {
    setDeleteTarget(deployment);
  }, []);

  const handleEditClick = React.useCallback((deployment: McpDeployment) => {
    setEditingDeployment(deployment);
  }, []);

  const filteredDeployments = React.useMemo(() => {
    if (!filterText) {
      return deployments.items;
    }
    const lower = filterText.toLowerCase();
    return deployments.items.filter(
      (d) =>
        d.name.toLowerCase().includes(lower) ||
        getDeploymentDisplayName(d).toLowerCase().includes(lower) ||
        (d.serverName ?? '').toLowerCase().includes(lower),
    );
  }, [deployments.items, filterText]);

  const clearFilters = React.useCallback(() => setFilterText(''), []);

  const isEmpty = loaded && !loadError && deployments.items.length === 0;

  // If namespace is undefined, the core loader will redirect to a valid project.
  const headerContent = namespace ? (
    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
      <FlexItem>Project</FlexItem>
      <FlexItem>
        <ProjectSelectorField
          selectedNamespace={namespace}
          onSelect={handleProjectChange}
          selectorOnly
        />
      </FlexItem>
    </Flex>
  ) : undefined;

  return (
    <ApplicationsPage
      noTitle
      description="Manage and view the health and performance of your deployed MCP servers."
      headerContent={headerContent}
      loadError={loadError}
      loaded={loaded}
      empty={isEmpty}
      emptyStatePage={<McpDeploymentsEmptyState />}
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
      />
      {deleteTarget && (
        <DeleteMcpDeploymentModal
          deployment={deleteTarget}
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
          existingDeployment={editingDeployment}
        />
      )}
    </ApplicationsPage>
  );
};

export default McpDeploymentsPage;
