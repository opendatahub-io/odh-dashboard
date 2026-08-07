import * as React from 'react';
import { Content, Label } from '@patternfly/react-core';
import {
  normalizePhase,
  getPhaseProps,
  PhaseStatus,
  PhaseResourceType,
  getStatusSubtext,
  getModalSubtitle,
  getSubtextProps,
} from '~/app/utilities/phaseLabelUtils';
import type { AffectedModel } from './AffectedModelsTable';
import {
  AFFECTED_MODELS_FETCH_ERROR,
  loadAffectedModels,
  shouldFetchAffectedModels,
} from './loadAffectedModels';
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
  /** K8s resource name — used to fetch affected models on list/overview when not precomputed. */
  resourceId?: string;
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
  affectedModels: affectedModelsProp,
  resourceId,
}) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [hasOpenedModal, setHasOpenedModal] = React.useState(false);
  const [fetchedModels, setFetchedModels] = React.useState<AffectedModel[] | undefined>(undefined);
  const [isLoadingAffected, setIsLoadingAffected] = React.useState(false);
  const [affectedLoadError, setAffectedLoadError] = React.useState<string | undefined>(undefined);

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

    if (!shouldFetchAffectedModels(normalized, resourceType, affectedModelsProp, resourceId)) {
      return;
    }

    setIsLoadingAffected(true);
    setAffectedLoadError(undefined);

    loadAffectedModels(resourceType, resourceId)
      .then((models) => {
        setFetchedModels(models);
      })
      .catch(() => {
        setFetchedModels(undefined);
        setAffectedLoadError(AFFECTED_MODELS_FETCH_ERROR);
      })
      .finally(() => {
        setIsLoadingAffected(false);
      });
  };

  const affectedModels = affectedModelsProp ?? fetchedModels;

  return (
    <>
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
          isLoadingAffected={isLoadingAffected}
          affectedLoadError={affectedLoadError}
        />
      ) : null}
    </>
  );
};

export default PhaseLabel;
