import * as React from 'react';
import { Label, Popover } from '@patternfly/react-core';
import {
  normalizePhase,
  getPhaseProps,
  getPopoverContent,
  PhaseStatus,
  PhaseResourceType,
} from '~/app/utilities/phaseLabelUtils';

type PhaseLabelProps = {
  phase: string | undefined;
  resourceType: PhaseResourceType;
  statusMessage?: string;
};

const PhaseLabel: React.FC<PhaseLabelProps> = ({ phase, resourceType, statusMessage }) => {
  const normalized = normalizePhase(phase);
  const phaseProps = getPhaseProps(normalized);
  const hasPopover = normalized !== PhaseStatus.READY && !!statusMessage;
  const popoverContent = getPopoverContent(normalized, resourceType, statusMessage);

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
      headerContent={popoverContent.headerContent}
      headerIcon={popoverContent.headerIcon}
      bodyContent={popoverContent.bodyContent}
      footerContent={popoverContent.footerContent}
      position="top"
    >
      {label}
    </Popover>
  );
};

export default PhaseLabel;
