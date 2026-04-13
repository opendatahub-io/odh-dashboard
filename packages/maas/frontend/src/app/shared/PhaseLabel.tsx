import * as React from 'react';
import { Label, LabelProps } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, InProgressIcon } from '@patternfly/react-icons';

type PhaseLabelProps = {
  phase: string | undefined;
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

const PhaseLabel: React.FC<PhaseLabelProps> = ({ phase }) => {
  if (!phase) {
    return <>—</>;
  }

  return (
    <Label isCompact data-testid="phase-label" {...getPhaseProps(phase)}>
      {phase}
    </Label>
  );
};

export default PhaseLabel;
