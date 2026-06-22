import * as React from 'react';
import {
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
  const [detail] = useAgentRuntimeDetail(runtime.namespace, runtime.name);

  const endpointFields = React.useMemo(
    () => getAgentRuntimeEndpointFields(runtime, detail),
    [runtime, detail],
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
        {endpointFields.length > 0 && (
          <Stack hasGutter>
            {endpointFields.map((field) => (
              <StackItem key={field.id}>
                <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem>
                    <Content component={ContentVariants.p} className="pf-v6-u-font-weight-bold">
                      {field.label}
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
                    <Content
                      component={ContentVariants.small}
                      className="pf-v6-u-color-text-subtle"
                    >
                      {field.description}
                    </Content>
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
