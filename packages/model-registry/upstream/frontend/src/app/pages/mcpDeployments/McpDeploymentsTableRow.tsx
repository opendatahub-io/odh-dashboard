import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { Timestamp, TimestampTooltipVariant, Truncate } from '@patternfly/react-core';
import { McpDeployment } from '~/app/mcpDeploymentTypes';
import { getServerDisplayName } from './utils';
import McpDeploymentStatusLabel from './McpDeploymentStatusLabel';
import McpDeploymentServicePopover from './McpDeploymentServicePopover';

type McpDeploymentsTableRowProps = {
  deployment: McpDeployment;
  onDeleteClick: (deployment: McpDeployment) => void;
};

const McpDeploymentsTableRow: React.FC<McpDeploymentsTableRowProps> = ({
  deployment,
  onDeleteClick,
}) => {
  const actions: IAction[] = [
    {
      title: 'Edit',
      isAriaDisabled: true,
      tooltipProps: {
        content: 'Editing is not yet available.',
      },
    },
    {
      title: 'Delete',
      onClick: () => onDeleteClick(deployment),
    },
  ];

  return (
    <Tr data-testid={`mcp-deployment-row-${deployment.name}`}>
      <Td dataLabel="Server" data-testid="mcp-deployment-server">
        <Truncate content={getServerDisplayName(deployment)} />
      </Td>
      <Td dataLabel="Name" data-testid="mcp-deployment-name">
        <Truncate content={deployment.name} />
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
