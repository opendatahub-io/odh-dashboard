import * as React from 'react';
import { Label, Popover } from '@patternfly/react-core';
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
  statusMessage?: string;
};

const statusIconMap: Record<AgentRuntimeDisplayStatus, React.ReactNode> = {
  [AgentRuntimeDisplayStatus.Ready]: <CheckCircleIcon />,
  [AgentRuntimeDisplayStatus.Stopped]: <OffIcon />,
  [AgentRuntimeDisplayStatus.Pending]: <PendingIcon />,
  [AgentRuntimeDisplayStatus.Failed]: <ExclamationCircleIcon />,
  [AgentRuntimeDisplayStatus.Unknown]: <QuestionCircleIcon />,
};

const AgentRuntimeStatusLabel: React.FC<AgentRuntimeStatusLabelProps> = ({
  status,
  statusMessage,
}) => {
  const { displayStatus, labelStatus, labelColor, labelVariant } = mapAgentRuntimeStatus(status);
  const hasPopover = !!statusMessage;

  const label = (
    <Label
      variant={labelVariant ?? (hasPopover ? 'filled' : 'outline')}
      isCompact
      isClickable={hasPopover}
      data-testid="agent-runtime-status-label"
      status={labelStatus}
      color={labelColor}
      icon={statusIconMap[displayStatus]}
    >
      {displayStatus}
    </Label>
  );

  if (!hasPopover) {
    return label;
  }

  return (
    <Popover
      data-testid="agent-runtime-status-popover"
      headerContent={displayStatus}
      bodyContent={statusMessage}
      position="top"
    >
      {label}
    </Popover>
  );
};

export default AgentRuntimeStatusLabel;
