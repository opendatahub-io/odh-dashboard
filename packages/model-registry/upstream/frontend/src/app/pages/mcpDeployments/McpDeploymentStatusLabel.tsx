import * as React from 'react';
import { Label, Popover } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InProgressIcon,
} from '@patternfly/react-icons';
import { McpDeploymentCondition } from '~/app/mcpDeploymentTypes';
import { getStatusInfo, McpDeploymentStatusInfo } from './utils';

type McpDeploymentStatusLabelProps = {
  conditions: McpDeploymentCondition[];
};

const statusIconMap: Record<McpDeploymentStatusInfo['status'], React.ReactNode> = {
  success: <CheckCircleIcon />,
  danger: <ExclamationCircleIcon />,
  warning: <ExclamationTriangleIcon />,
  info: <InProgressIcon />,
};

const McpDeploymentStatusLabel: React.FC<McpDeploymentStatusLabelProps> = ({ conditions }) => {
  const { label, status, popoverBody } = getStatusInfo(conditions);

  return (
    <Popover bodyContent={popoverBody} data-testid="mcp-deployment-status-popover">
      <Label status={status} icon={statusIconMap[status]} data-testid="mcp-deployment-status-label">
        {label}
      </Label>
    </Popover>
  );
};

export default McpDeploymentStatusLabel;
