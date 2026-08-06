import * as React from 'react';
import {
  Alert,
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
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  getModalAlertProps,
  getPhaseProps,
  normalizePhase,
  PhaseResourceType,
} from '~/app/utilities/phaseLabelUtils';
import {
  EventTrackingSource,
  MaaSEvents,
  convertPhaseResourceTypeToEventTrackingResourceType,
} from '~/app/types/event-tracking';

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
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={`${phase} ${resourceType}`}
    variant="medium"
    data-testid="phase-modal"
  >
    <ModalHeader title={getModalTitle(resourceName, normalizePhase(phase), subtitle)} />
    <ModalBody>
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
            })
          }
        >
          View Details
        </Link>
      </ModalFooter>
    ) : null}
  </Modal>
);

export default PhaseModal;
