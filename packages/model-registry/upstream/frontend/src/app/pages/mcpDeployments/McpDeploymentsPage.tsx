import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApplicationsPage } from 'mod-arch-shared';
import { useNamespaceSelector, useModularArchContext } from 'mod-arch-core';
import {
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { CubesIcon, RocketIcon } from '@patternfly/react-icons';
import NamespaceSelectorFieldWrapper from '~/odh/components/NamespaceSelectorFieldWrapper';
import { useNotification } from '~/app/hooks/useNotification';
import { McpDeployment } from '~/app/mcpDeploymentTypes';
import McpDeployModal from '~/odh/components/McpDeployModal';
import useMcpDeployments from './useMcpDeployments';
import McpDeploymentsTable from './McpDeploymentsTable';
import McpDeploymentsToolbar from './McpDeploymentsToolbar';
import McpDeploymentsEmptyState from './McpDeploymentsEmptyState';
import DeleteMcpDeploymentModal from './DeleteMcpDeploymentModal';
import { getDeploymentDisplayName } from './utils';

const ICON_SIZE = 40;
const ICON_PADDING = 4;
const ICON_INNER = ICON_SIZE - ICON_PADDING * 2;

const iconContainerStyle: React.CSSProperties = {
  background: 'var(--pf-t--color--teal--10)',
  borderRadius: ICON_SIZE / 2,
  padding: ICON_PADDING,
  width: ICON_SIZE,
  height: ICON_SIZE,
};

const iconStyle: React.CSSProperties = {
  width: ICON_INNER,
  height: ICON_INNER,
};

const McpDeploymentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [deployments, loaded, loadError, refresh] = useMcpDeployments();
  const [filterText, setFilterText] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<McpDeployment | undefined>();
  const [editingDeployment, setEditingDeployment] = React.useState<McpDeployment>();
  const { preferredNamespace, updatePreferredNamespace } = useNamespaceSelector();
  const { config } = useModularArchContext();
  const notification = useNotification();

  const isMandatoryNamespace = Boolean(config.mandatoryNamespace);
  const selectedProject = preferredNamespace?.name || '';

  // If a namespace query param is present (e.g. after deploying from the catalog),
  // use it to pre-select the project, then remove it from the URL.
  // TODO: Remove this when the page switches to ProjectsContext (RHOAIENG-56566).
  const namespaceParamConsumedRef = React.useRef(false);
  React.useEffect(() => {
    if (namespaceParamConsumedRef.current) {
      return;
    }
    const ns = searchParams.get('namespace');
    if (ns) {
      namespaceParamConsumedRef.current = true;
      updatePreferredNamespace({ name: ns });
      searchParams.delete('namespace');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, updatePreferredNamespace]);

  const handleProjectChange = React.useCallback(
    (projectName: string) => {
      if (!projectName || isMandatoryNamespace) {
        return;
      }
      updatePreferredNamespace({ name: projectName });
    },
    [isMandatoryNamespace, updatePreferredNamespace],
  );

  const handleDeleteClick = React.useCallback((deployment: McpDeployment) => {
    setDeleteTarget(deployment);
  }, []);

  const handleEditClick = React.useCallback((deployment: McpDeployment) => {
    setEditingDeployment(deployment);
  }, []);

  const handlePublishClick = React.useCallback(
    (deployment: McpDeployment) => {
      const displayName = getDeploymentDisplayName(deployment);
      const ns = selectedProject || deployment.namespace;
      const to = `/gen-ai-studio/assets/${ns}/mcpservers`;
      notification.success(
        'MCP server deployment published',
        undefined,
        {
          messageText: `The ${displayName} MCP server is now available from the MCP tab of the `,
          linkUrl: to,
          linkLabel: 'AI asset endpoints page',
        },
      );
    },
    [notification, selectedProject],
  );

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

  const noProjectSelected = !selectedProject;
  const isEmpty = !noProjectSelected && loaded && !loadError && deployments.items.length === 0;

  const headerContent = (
    <Stack hasGutter>
      <StackItem>
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <div style={iconContainerStyle}>
              <RocketIcon style={iconStyle} />
            </div>
          </FlexItem>
          <FlexItem>
            <Content component="h1">MCP server deployments</Content>
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>Project</FlexItem>
          <FlexItem>
            <NamespaceSelectorFieldWrapper
              selectedNamespace={selectedProject}
              onSelect={handleProjectChange}
              selectorOnly
            />
          </FlexItem>
        </Flex>
      </StackItem>
    </Stack>
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
            <EmptyStateBody>
              Select a project to view MCP server deployments.
            </EmptyStateBody>
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
        onPublishClick={handlePublishClick}
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
