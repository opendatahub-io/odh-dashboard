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
  statusMessage?: React.ReactNode;
  reason?: string;
  isOpen: boolean;
  onClose: () => void;
  subtitle: string;
  resourceName: string;
  resourceUrl: string;
  returnTo?: string;
};

const getModalTitle = (resourceName: string, phase: string) => {
  const phaseProps = getPhaseProps(phase);
  return (
    <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>{resourceName}</FlexItem>
      <FlexItem>
        <Label status={phaseProps.status} color={phaseProps.color} icon={phaseProps.icon}>
          {phase}
        </Label>
      </FlexItem>
    </Flex>
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
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={`${phase} ${resourceType}`} variant="small">
    <ModalHeader title={getModalTitle(resourceName, normalizePhase(phase))} />
    <ModalBody>
      <Stack hasGutter>
        <StackItem>{subtitle}</StackItem>
        <StackItem>
          <Alert {...getModalAlertProps(phase, resourceType, statusMessage, reason)} />
        </StackItem>
      </Stack>
    </ModalBody>
    {resourceUrl ? (
      <ModalFooter>
        <Link
          to={resourceUrl}
          state={returnTo ? { returnTo } : undefined}
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
