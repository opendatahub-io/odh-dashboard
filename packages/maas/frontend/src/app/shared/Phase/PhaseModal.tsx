import * as React from 'react';
import {
  Alert,
  Bullseye,
  Flex,
  Modal,
  ModalBody,
  ModalHeader,
  Stack,
  StackItem,
  Label,
  FlexItem,
  ModalFooter,
  Content,
  Spinner,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  getModalAlertProps,
  getPhaseProps,
  normalizePhase,
  PhaseResourceType,
  PhaseStatus,
} from '~/app/utilities/phaseLabelUtils';
import {
  EventTrackingSource,
  MaaSEvents,
  convertPhaseResourceTypeToEventTrackingResourceType,
  MaaSSettingsDetailsViewedProperties,
} from '~/app/types/event-tracking';
import type { AffectedModel } from '~/app/types/maas-model';
import AffectedModelsTable from './AffectedModelsTable';

type PhaseModalProps = {
  phase: string;
  resourceType: PhaseResourceType;
  statusMessage?: string;
  reason?: string;
  isOpen: boolean;
  onClose: () => void;
  subtitle: string;
  resourceName: string;
  resourceUrl: string;
  returnTo?: string;
  status?: string;
  conditionType?: string;
  lastTransitionTime?: string;
  affectedModels?: AffectedModel[];
  isLoadingAffected?: boolean;
  affectedLoadError?: string;
  overviewLoaded?: boolean;
};

const getModalTitle = (resourceName: string, phase: string, subtitle: string) => {
  const phaseProps = getPhaseProps(phase);
  return (
    <Stack>
      <StackItem>
        <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>{resourceName}</FlexItem>
          <FlexItem>
            <Label status={phaseProps.status} color={phaseProps.color} icon={phaseProps.icon}>
              {phase}
            </Label>
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        <Content component="small" data-testid="phase-modal-subtitle">
          {subtitle}
        </Content>
      </StackItem>
    </Stack>
  );
};

const shouldShowAffectedModelsSection = (phase: string, resourceType: PhaseResourceType): boolean =>
  phase === PhaseStatus.DEGRADED &&
  (resourceType === PhaseResourceType.SUBSCRIPTION ||
    resourceType === PhaseResourceType.AUTHPOLICY);

const PhaseModal: React.FC<PhaseModalProps> = ({
  phase,
  resourceType,
  statusMessage,
  reason,
  isOpen,
  onClose,
  subtitle = 'Status',
  resourceName,
  resourceUrl,
  returnTo,
  status,
  conditionType,
  lastTransitionTime,
  affectedModels,
  isLoadingAffected = false,
  affectedLoadError,
  overviewLoaded,
}) => {
  const showAffectedSection = shouldShowAffectedModelsSection(phase, resourceType);
  const hasAffectedModels = (affectedModels?.length ?? 0) > 0;
  const isAffectedModelsLoading =
    showAffectedSection &&
    (isLoadingAffected || (affectedModels === undefined && overviewLoaded === false));
  const showAffectedModels =
    showAffectedSection && (hasAffectedModels || isAffectedModelsLoading || !!affectedLoadError);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${phase} ${resourceType}`}
      variant="medium"
      data-testid="phase-modal"
    >
      <ModalHeader title={getModalTitle(resourceName, normalizePhase(phase), subtitle)} />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Alert
              {...getModalAlertProps(
                phase,
                resourceType,
                statusMessage,
                reason,
                status,
                conditionType,
                lastTransitionTime,
              )}
              data-testid="phase-modal-alert"
            />
          </StackItem>
          {showAffectedModels ? (
            <StackItem>
              {isAffectedModelsLoading ? (
                <Bullseye>
                  <Spinner size="lg" aria-label="Loading affected models" />
                </Bullseye>
              ) : affectedLoadError ? (
                <Content component="p" data-testid="affected-models-load-error">
                  {affectedLoadError}
                </Content>
              ) : (
                <AffectedModelsTable models={affectedModels ?? []} />
              )}
            </StackItem>
          ) : null}
        </Stack>
      </ModalBody>
      {resourceUrl && returnTo ? (
        <ModalFooter>
          <Link
            to={resourceUrl}
            state={returnTo ? { returnTo } : undefined}
            data-testid="phase-modal-view-details-link"
            onClick={() =>
              fireMiscTrackingEvent(MaaSEvents.MAAS_RESOURCE_DETAILS_VIEWED, {
                resourceType: convertPhaseResourceTypeToEventTrackingResourceType(resourceType),
                source: EventTrackingSource.TAB_LINK,
                resourceStatus: phase,
              } satisfies MaaSSettingsDetailsViewedProperties)
            }
          >
            View details
          </Link>
        </ModalFooter>
      ) : null}
    </Modal>
  );
};

export default PhaseModal;
