import * as React from 'react';
import { Label } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  OffIcon,
  PendingIcon,
  QuestionCircleIcon,
} from '@patternfly/react-icons';
import {
  AgentRuntimeDisplayStatus,
  mapAgentRuntimeStatus,
} from '~/app/utilities/agentRuntimeStatus';

type AgentRuntimeStatusLabelProps = {
  status: string | undefined;
};

const statusIconMap: Record<AgentRuntimeDisplayStatus, React.ReactNode> = {
  [AgentRuntimeDisplayStatus.Ready]: <CheckCircleIcon />,
  [AgentRuntimeDisplayStatus.Stopped]: <OffIcon />,
  [AgentRuntimeDisplayStatus.Pending]: <PendingIcon />,
  [AgentRuntimeDisplayStatus.Failed]: <ExclamationCircleIcon />,
  [AgentRuntimeDisplayStatus.Unknown]: <QuestionCircleIcon />,
};

const AgentRuntimeStatusLabel: React.FC<AgentRuntimeStatusLabelProps> = ({ status }) => {
  const { displayStatus, labelStatus, labelColor, labelVariant } = mapAgentRuntimeStatus(status);

  return (
    <Label
      variant={labelVariant ?? 'outline'}
      isCompact
      data-testid="agent-runtime-status-label"
      status={labelStatus}
      color={labelColor}
      icon={statusIconMap[displayStatus]}
    >
      {displayStatus}
    </Label>
  );
};

export default AgentRuntimeStatusLabel;
