import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { Timestamp, TimestampTooltipVariant, Truncate } from '@patternfly/react-core';
import { ResourceNameTooltip } from '@odh-dashboard/ui-core';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
import { convertMcpDeploymentToK8sResource, getDeploymentDisplayName } from './utils';
import McpDeploymentStatusLabel from './McpDeploymentStatusLabel';
import McpDeploymentServicePopover from './McpDeploymentServicePopover';
import McpDeploymentServerCell from './McpDeploymentServerCell';
import McpDeploymentRegisteredVersionCell from './McpDeploymentRegisteredVersionCell';

type McpDeploymentsTableRowProps = {
  deployment: McpDeployment;
  /** Must match the same flag McpDeploymentsTable used to build its columns, or cells and
   * headers will fall out of alignment. */
  showRegisteredVersion: boolean;
  onDeleteClick: (deployment: McpDeployment) => void;
  onEditClick: (deployment: McpDeployment) => void;
};

const McpDeploymentsTableRow: React.FC<McpDeploymentsTableRowProps> = ({
  deployment,
  showRegisteredVersion,
  onDeleteClick,
  onEditClick,
}) => {
  const actions: IAction[] = React.useMemo(
    () => [
      {
        title: 'Edit',
        onClick: () => onEditClick(deployment),
      },
      {
        title: 'Delete',
        onClick: () => onDeleteClick(deployment),
      },
    ],
    [deployment, onDeleteClick, onEditClick],
  );

  return (
    <Tr data-testid={`mcp-deployment-row-${deployment.name}`}>
      <Td dataLabel="Name" data-testid="mcp-deployment-name">
        <ResourceNameTooltip resource={convertMcpDeploymentToK8sResource(deployment)}>
          <Truncate content={getDeploymentDisplayName(deployment)} />
        </ResourceNameTooltip>
      </Td>
      <Td dataLabel="MCP server" data-testid="mcp-deployment-server">
        <McpDeploymentServerCell deployment={deployment} />
      </Td>
      {showRegisteredVersion && (
        <Td dataLabel="Registered version" data-testid="mcp-deployment-registered-version">
          <McpDeploymentRegisteredVersionCell deployment={deployment} />
        </Td>
      )}
      <Td dataLabel="Created" data-testid="mcp-deployment-created">
        <Timestamp
          date={new Date(deployment.creationTimestamp)}
          tooltip={{ variant: TimestampTooltipVariant.default }}
        />
      </Td>
      <Td dataLabel="Status" data-testid="mcp-deployment-status">
        <McpDeploymentStatusLabel conditions={deployment.conditions} />
      </Td>
      <Td dataLabel="Service" data-testid="mcp-deployment-service">
        <McpDeploymentServicePopover deployment={deployment} />
      </Td>
      <Td isActionCell>
        <ActionsColumn items={actions} />
      </Td>
    </Tr>
  );
};

export default McpDeploymentsTableRow;
