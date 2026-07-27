import * as React from 'react';
import { Label, Popover } from '@patternfly/react-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  normalizePhase,
  getPhaseProps,
  getPopoverContent,
  PhaseStatus,
  PhaseResourceType,
  PhaseLabelLocation,
} from '~/app/utilities/phaseLabelUtils';
import { MaaSEvents } from '~/app/types/event-tracking';

type PhaseLabelProps = {
  phase: string | undefined;
  resourceType: PhaseResourceType;
  statusMessage?: React.ReactNode;
  forcePopover?: boolean;
  location: PhaseLabelLocation;
  onClick?: () => void;
};

const PhaseLabel: React.FC<PhaseLabelProps> = ({
  phase,
  resourceType,
  statusMessage,
  forcePopover = false,
  location,
  onClick,
}) => {
  const normalized = normalizePhase(phase);
  const phaseProps = getPhaseProps(normalized);
  const hasPopover = forcePopover || (normalized !== PhaseStatus.READY && !!statusMessage);
  const popoverContent = getPopoverContent(normalized, resourceType, statusMessage);

  const label = (
    <Label
      variant={hasPopover ? 'filled' : 'outline'}
      isCompact
      isClickable={hasPopover}
      data-testid="phase-label"
      {...phaseProps}
      onClick={onClick}
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
      onShow={() => {
        fireMiscTrackingEvent(MaaSEvents.SUBSCRIPTION_MANAGEMENT_STATUS_POPOVER_VIEWED, {
          popoverType: 'status',
          status: normalized,
          location,
        });
      }}
    >
      {label}
    </Popover>
  );
};

export default PhaseLabel;
