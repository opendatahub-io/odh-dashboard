import * as React from 'react';
import { Label, Popover } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, InProgressIcon } from '@patternfly/react-icons';
import { McpDeploymentPhase } from '~/odh/types/mcpDeploymentTypes';
import { getStatusInfo } from './utils';

type McpDeploymentStatusLabelProps = {
  phase: McpDeploymentPhase;
};

const statusIconMap: Record<McpDeploymentPhase, React.ReactNode> = {
  [McpDeploymentPhase.RUNNING]: <CheckCircleIcon />,
  [McpDeploymentPhase.FAILED]: <ExclamationCircleIcon />,
  [McpDeploymentPhase.PENDING]: <InProgressIcon />,
};

const McpDeploymentStatusLabel: React.FC<McpDeploymentStatusLabelProps> = ({ phase }) => {
  const { label, status, popoverBody } = getStatusInfo(phase);

  return (
    <Popover bodyContent={popoverBody} data-testid="mcp-deployment-status-popover">
      <Label status={status} icon={statusIconMap[phase]} data-testid="mcp-deployment-status-label">
        {label}
      </Label>
    </Popover>
  );
};

export default McpDeploymentStatusLabel;
