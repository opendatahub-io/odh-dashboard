import * as React from 'react';
import { Label, LabelProps, Popover } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, InProgressIcon } from '@patternfly/react-icons';
import { mapAgentRuntimeStatus } from '~/app/utilities/agentRuntimeStatus';

type AgentRuntimeStatusLabelProps = {
  status: string | undefined;
  statusMessage?: string;
};

const statusIconMap: Partial<Record<NonNullable<LabelProps['status']>, React.ReactNode>> = {
  success: <CheckCircleIcon />,
  danger: <ExclamationCircleIcon />,
  warning: <InProgressIcon />,
};

const AgentRuntimeStatusLabel: React.FC<AgentRuntimeStatusLabelProps> = ({
  status,
  statusMessage,
}) => {
  const { displayStatus, labelStatus, labelColor } = mapAgentRuntimeStatus(status);
  const hasPopover = !!statusMessage;

  const label = (
    <Label
      variant={hasPopover ? 'filled' : 'outline'}
      isCompact
      isClickable={hasPopover}
      data-testid="agent-runtime-status-label"
      status={labelStatus}
      color={labelColor}
      icon={labelStatus ? statusIconMap[labelStatus] : undefined}
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
