import React from 'react';
import {
  Button,
  Content,
  Flex,
  FlexItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { MaaSModelRefSummary, MaaSSubscription } from '~/app/types/subscriptions';
import { DEFAULT_MODEL_KIND } from '~/app/utilities/authpolicies';

type InferencePriorityStatusModalProps = {
  subscription: MaaSSubscription;
  modelRefs: MaaSModelRefSummary[];
  onClose: () => void;
};

const formatReady = (ready: boolean | undefined): string => {
  if (ready === true) {
    return 'Applied';
  }
  if (ready === false) {
    return 'Not ready';
  }
  return '—';
};

const modalTitle = () => (
  <Stack>
    <StackItem>
      <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>Inference priority details</FlexItem>
      </Flex>
    </StackItem>
    <StackItem>
      <Content component="small" data-testid="subtitle">
        When capacity is limited, higher priority values are scheduled for inference first. Applies
        only to internal models in this subscription. External models are not affected.
      </Content>
    </StackItem>
  </Stack>
);

const InferencePriorityStatusModal: React.FC<InferencePriorityStatusModalProps> = ({
  subscription,
  modelRefs,
  onClose,
}) => {
  const internalModelKeys = new Set(
    modelRefs
      .filter((m) => m.modelRef.kind === DEFAULT_MODEL_KIND)
      .map((m) => `${m.namespace}/${m.name}`),
  );
  const internalModelRefs = subscription.modelRefs.filter((modelRef) =>
    internalModelKeys.has(`${modelRef.namespace}/${modelRef.name}`),
  );

  return (
    <Modal
      isOpen
      variant={ModalVariant.large}
      onClose={onClose}
      data-testid="inference-priority-status-modal"
    >
      <ModalHeader title={modalTitle()} />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <Title headingLevel="h2" size="xl">
                  Models
                </Title>
              </FlexItem>
              <FlexItem>
                <Content component="p">
                  Status of inference priority for each internal model in this subscription.
                </Content>
              </FlexItem>
            </Flex>
          </StackItem>
          <StackItem>
            <Table aria-label="Inference priority status by model" variant="compact">
              <Thead>
                <Tr>
                  <Th width={20}>Model</Th>
                  <Th width={15}>Project</Th>
                  <Th width={15}>Applied</Th>
                  <Th width={15}>Reason</Th>
                  <Th width={35}>Message</Th>
                </Tr>
              </Thead>
              <Tbody>
                {internalModelRefs.map((modelRef) => (
                  <Tr key={`${modelRef.namespace}/${modelRef.name}`}>
                    <Td dataLabel="Model">
                      <TableRowTitleDescription
                        title={<strong>{modelRef.displayName ?? modelRef.name}</strong>}
                        subtitle={<code>{modelRef.name}</code>}
                        description={modelRef.description}
                        truncateDescriptionLines={2}
                      />
                    </Td>
                    <Td dataLabel="Project">{modelRef.namespace}</Td>
                    <Td dataLabel="Applied">
                      <Label
                        status={modelRef.ready ? 'success' : 'danger'}
                        isClickable={false}
                        variant="outline"
                      >
                        {formatReady(modelRef.ready)}
                      </Label>
                    </Td>
                    <Td dataLabel="Reason">{modelRef.reason ?? '—'}</Td>
                    <Td dataLabel="Message">{modelRef.message ?? '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default InferencePriorityStatusModal;
