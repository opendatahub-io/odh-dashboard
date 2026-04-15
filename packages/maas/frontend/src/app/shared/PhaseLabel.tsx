import * as React from 'react';
import { Label, LabelProps, Popover } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, InProgressIcon } from '@patternfly/react-icons';

type PhaseLabelProps = {
  phase: string | undefined;
  statusMessage?: string;
};

const getPhaseProps = (
  phase: string | undefined,
): { icon: React.ReactNode; status?: LabelProps['status']; color?: LabelProps['color'] } => {
  switch (phase) {
    case 'Active':
    case 'Ready':
      return { icon: <CheckCircleIcon />, status: 'success' };
    case 'Failed':
    case 'Unhealthy':
      return { icon: <ExclamationCircleIcon />, status: 'danger' };
    case 'Pending':
      return { icon: <InProgressIcon />, color: 'blue' };
    default:
      return { icon: undefined, color: 'grey' };
  }
};

const PhaseLabel: React.FC<PhaseLabelProps> = ({ phase, statusMessage }) => {
  const normalized = phase?.trim() || 'Unknown';
  const phaseProps = getPhaseProps(normalized);
  const hasPopover = !!statusMessage;

  const label = (
    <Label
      variant={hasPopover ? 'filled' : 'outline'}
      isCompact
      isClickable={hasPopover}
      data-testid="phase-label"
      {...phaseProps}
    >
      {normalized}
    </Label>
  );

  if (!hasPopover) {
    return label;
  }

  return (
    <Popover
      data-testid="phase-popover"
      headerContent={normalized}
      bodyContent={statusMessage}
      position="top"
    >
      {label}
    </Popover>
  );
};

export default PhaseLabel;
