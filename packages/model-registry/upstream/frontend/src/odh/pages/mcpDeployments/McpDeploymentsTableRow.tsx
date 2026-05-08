import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { Timestamp, TimestampTooltipVariant, Truncate } from '@patternfly/react-core';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
import { getDeploymentDisplayName } from './utils';
import McpDeploymentStatusLabel from './McpDeploymentStatusLabel';
import McpDeploymentServicePopover from './McpDeploymentServicePopover';

type McpDeploymentsTableRowProps = {
  deployment: McpDeployment;
  onDeleteClick: (deployment: McpDeployment) => void;
  onEditClick: (deployment: McpDeployment) => void;
};

const McpDeploymentsTableRow: React.FC<McpDeploymentsTableRowProps> = ({
  deployment,
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
        <Truncate content={getDeploymentDisplayName(deployment)} />
      </Td>
      <Td dataLabel="MCP server" data-testid="mcp-deployment-server">
        <Truncate content={deployment.serverName || '-'} />
      </Td>
      <Td dataLabel="Created" data-testid="mcp-deployment-created">
        <Timestamp
          date={new Date(deployment.creationTimestamp)}
          tooltip={{ variant: TimestampTooltipVariant.default }}
        />
      </Td>
      <Td dataLabel="Status" data-testid="mcp-deployment-status">
        <McpDeploymentStatusLabel phase={deployment.phase} />
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
