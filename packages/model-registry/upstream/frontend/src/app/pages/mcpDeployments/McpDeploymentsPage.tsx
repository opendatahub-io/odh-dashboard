import * as React from 'react';
import { ApplicationsPage, SimpleSelect } from 'mod-arch-shared';
import { useNamespaceSelector, useModularArchContext } from 'mod-arch-core';
import { Flex, FlexItem } from '@patternfly/react-core';
import { McpDeployment } from '~/app/mcpDeploymentTypes';
import useMcpDeployments from './useMcpDeployments';
import McpDeploymentsTable from './McpDeploymentsTable';
import McpDeploymentsToolbar from './McpDeploymentsToolbar';
import McpDeploymentsEmptyState from './McpDeploymentsEmptyState';
import DeleteMcpDeploymentModal from './DeleteMcpDeploymentModal';
import { getServerDisplayName } from './utils';

const McpDeploymentsPage: React.FC = () => {
  const [deployments, loaded, loadError, refresh] = useMcpDeployments();
  const [filterText, setFilterText] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<McpDeployment | undefined>();
  const { namespaces = [], preferredNamespace, updatePreferredNamespace } = useNamespaceSelector();
  const { config } = useModularArchContext();

  const isMandatoryNamespace = Boolean(config.mandatoryNamespace);
  const projectOptions = namespaces.map((ns) => ({
    key: ns.name,
    label: ns.name,
  }));
  const selectedProject = preferredNamespace?.name || namespaces[0]?.name || '';

  const handleProjectChange = (key: string, isPlaceholder: boolean) => {
    if (isPlaceholder || !key || isMandatoryNamespace) {
      return;
    }
    updatePreferredNamespace({ name: key });
  };

  const handleDeleteClick = React.useCallback((deployment: McpDeployment) => {
    setDeleteTarget(deployment);
  }, []);

  const filteredDeployments = React.useMemo(() => {
    if (!filterText) {
      return deployments.items;
    }
    const lower = filterText.toLowerCase();
    return deployments.items.filter(
      (d) =>
        d.name.toLowerCase().includes(lower) ||
        getServerDisplayName(d).toLowerCase().includes(lower),
    );
  }, [deployments.items, filterText]);

  const clearFilters = React.useCallback(() => setFilterText(''), []);

  const isEmpty = loaded && !loadError && deployments.items.length === 0;

  return (
    <ApplicationsPage
      title="MCP server deployments"
      description="Manage and view the health and performance of your deployed MCP servers."
      headerContent={
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>Project</FlexItem>
          <FlexItem>
            <SimpleSelect
              options={projectOptions}
              value={selectedProject}
              onChange={handleProjectChange}
              isDisabled={isMandatoryNamespace || namespaces.length === 0}
              isScrollable
              maxMenuHeight="300px"
              popperProps={{ maxWidth: '400px' }}
              dataTestId="mcp-deployments-project-selector"
            />
          </FlexItem>
        </Flex>
      }
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
    </ApplicationsPage>
  );
};

export default McpDeploymentsPage;
