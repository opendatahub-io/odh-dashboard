import * as React from 'react';
import { Label, Tooltip } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
} from '@patternfly/react-icons';
import { McpDeploymentPhase } from '~/app/mcpDeploymentTypes';
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
  const { label, status, tooltip } = getStatusInfo(phase);

  return (
    <Tooltip content={tooltip}>
      <Label status={status} icon={statusIconMap[phase]} data-testid="mcp-deployment-status-label">
        {label}
      </Label>
    </Tooltip>
  );
};

export default McpDeploymentStatusLabel;
