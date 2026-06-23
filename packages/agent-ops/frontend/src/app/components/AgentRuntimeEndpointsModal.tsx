import * as React from 'react';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import {
  Alert,
  Button,
  ClipboardCopy,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { useAgentRuntimeDetail } from '~/app/hooks/useAgentRuntimeDetail';
import { AgentRuntime } from '~/app/types/agentRuntimes';
import { getAgentRuntimeEndpointFields } from '~/app/utilities/agentRuntimeEndpoints';

type AgentRuntimeEndpointsModalProps = {
  runtime: AgentRuntime;
  onClose: () => void;
};

const AgentRuntimeEndpointsModal: React.FC<AgentRuntimeEndpointsModalProps> = ({
  runtime,
  onClose,
}) => {
  const [detail, loaded, detailError] = useAgentRuntimeDetail(runtime.namespace, runtime.name);
  const isAccessDenied = !!detailError && getGenericErrorCode(detailError) === 403;

  const endpointFields = React.useMemo(
    () => getAgentRuntimeEndpointFields(runtime, loaded && !detailError ? detail : undefined),
    [runtime, detail, loaded, detailError],
  );

  return (
    <Modal
      variant="medium"
      isOpen
      onClose={onClose}
      aria-labelledby="endpoints-modal-title"
      data-testid="agent-runtime-endpoints-modal"
    >
      <ModalHeader title="Endpoints" labelId="endpoints-modal-title" />
      <ModalBody>
        {!loaded && !detailError && <Spinner aria-label="Loading endpoints" />}
        {detailError && (
          <Alert
            variant="danger"
            isInline
            title={isAccessDenied ? 'Access permissions needed' : 'Error loading endpoints'}
            data-testid="agent-runtime-endpoints-error"
          >
            {isAccessDenied
              ? 'You do not have permission to view endpoint details for this agent deployment.'
              : 'Unable to load endpoint details. Please try again later.'}
          </Alert>
        )}
        {endpointFields.length > 0 && (
          <Stack hasGutter>
            {endpointFields.map((field) => (
              <StackItem key={field.id}>
                <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem>
                    <Content component={ContentVariants.p}>
                      <strong>{field.label}</strong>
                    </Content>
                  </FlexItem>
                  <FlexItem>
                    <ClipboardCopy
                      id={field.id}
                      isReadOnly
                      hoverTip="Copy"
                      clickTip="Copied"
                      data-testid={`agent-runtime-endpoint-${field.id}`}
                    >
                      {field.url}
                    </ClipboardCopy>
                  </FlexItem>
                  <FlexItem>
                    <Content component={ContentVariants.small}>{field.description}</Content>
                  </FlexItem>
                </Flex>
              </StackItem>
            ))}
          </Stack>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AgentRuntimeEndpointsModal;
