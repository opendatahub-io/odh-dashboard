import * as React from 'react';
import { Content, Flex, FlexItem, Label } from '@patternfly/react-core';
import {
  normalizePhase,
  getPhaseProps,
  PhaseStatus,
  PhaseResourceType,
  getStatusSubtext,
  getModalSubtitle,
  getSubtextProps,
} from '~/app/utilities/phaseLabelUtils';
import type { AffectedModel } from '~/app/types/maas-model';
import PhaseModal from './PhaseModal';

type PhaseLabelProps = {
  phase: string | undefined;
  resourceType: PhaseResourceType;
  statusMessage?: string;
  reason?: string;
  forceModal?: boolean;
  onClick?: () => void;
  resourceName: string;
  resourceUrl?: string;
  returnTo?: string;
  hideSubtext?: boolean;
  status?: string;
  conditionType?: string;
  lastTransitionTime?: string;
  affectedModels?: AffectedModel[];
  overviewLoaded?: boolean;
  secondaryStatus?: React.ReactNode;
};

const PhaseLabel: React.FC<PhaseLabelProps> = ({
  phase,
  resourceType,
  statusMessage,
  reason,
  forceModal = false,
  onClick,
  resourceName,
  resourceUrl,
  returnTo,
  hideSubtext = false,
  status,
  conditionType,
  lastTransitionTime,
  affectedModels,
  overviewLoaded = false,
  secondaryStatus,
}) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [hasOpenedModal, setHasOpenedModal] = React.useState(false);

  const normalized = normalizePhase(phase);
  const phaseProps = getPhaseProps(normalized);
  const isClickable = forceModal || normalized !== PhaseStatus.READY;
  const statusSubtext = getStatusSubtext(normalized, resourceType);
  const subtextProps = getSubtextProps(normalized);

  const handleClick = () => {
    if (!isClickable) {
      return;
    }

    setHasOpenedModal(true);
    setIsModalOpen(true);
    onClick?.();
  };

  return (
    <>
      <Flex>
        <FlexItem>
          <Label
            variant={isClickable ? 'filled' : 'outline'}
            isCompact
            isClickable={isClickable}
            data-testid="phase-label"
            {...phaseProps}
            onClick={isClickable ? handleClick : undefined}
          >
            {normalized}
          </Label>
        </FlexItem>
        {secondaryStatus && <FlexItem>{secondaryStatus}</FlexItem>}
      </Flex>
      {statusSubtext && subtextProps && !hideSubtext ? (
        <Content component="small" {...subtextProps} data-testid="phase-label-subtext">
          {statusSubtext}
        </Content>
      ) : null}
      {isClickable && hasOpenedModal ? (
        <PhaseModal
          phase={normalized}
          resourceType={resourceType}
          statusMessage={statusMessage}
          reason={reason}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
          }}
          subtitle={getModalSubtitle(resourceType) ?? ''}
          resourceName={resourceName}
          resourceUrl={resourceUrl ?? ''}
          returnTo={returnTo}
          status={status}
          conditionType={conditionType}
          lastTransitionTime={lastTransitionTime}
          affectedModels={affectedModels}
          overviewLoaded={overviewLoaded}
        />
      ) : null}
    </>
  );
};

export default PhaseLabel;
