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
import { AgentRuntime } from '~/app/types/agentRuntimes';

type AgentRuntimeEndpointsModalProps = {
  runtime: AgentRuntime;
  onClose: () => void;
};

const AgentRuntimeEndpointsModal: React.FC<AgentRuntimeEndpointsModalProps> = ({
  runtime,
  onClose,
}) => (
  <Modal
    variant="medium"
    isOpen
    onClose={onClose}
    aria-labelledby="endpoints-modal-title"
    data-testid="agent-runtime-endpoints-modal"
  >
    <ModalHeader title="Connect to sandbox" labelId="endpoints-modal-title" />
    <ModalBody>
      <Stack hasGutter>
        <StackItem>
          <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              <Content component={ContentVariants.p}>
                <strong>Port forward</strong>
              </Content>
            </FlexItem>
            <FlexItem>
              <ClipboardCopy
                isReadOnly
                hoverTip="Copy"
                clickTip="Copied"
                data-testid="agent-runtime-endpoint-forward"
              >
                {`openshell forward start <port> ${runtime.name}`}
              </ClipboardCopy>
            </FlexItem>
            <FlexItem>
              <Content component={ContentVariants.small}>
                Forward a port from the sandbox to your local machine. Replace &lt;port&gt; with the
                port your agent is listening on.
              </Content>
            </FlexItem>
          </Flex>
        </StackItem>
        <StackItem>
          <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              <Content component={ContentVariants.p}>
                <strong>Expose service</strong>
              </Content>
            </FlexItem>
            <FlexItem>
              <ClipboardCopy
                isReadOnly
                hoverTip="Copy"
                clickTip="Copied"
                data-testid="agent-runtime-endpoint-expose"
              >
                {`openshell service expose ${runtime.name} <port> <service-name>`}
              </ClipboardCopy>
            </FlexItem>
            <FlexItem>
              <Content component={ContentVariants.small}>
                Expose a service through the OpenShell gateway. Replace &lt;port&gt; with the target
                port and &lt;service-name&gt; with a name for the service.
              </Content>
            </FlexItem>
          </Flex>
        </StackItem>
        <StackItem>
          <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              <Content component={ContentVariants.p}>
                <strong>Connect to shell</strong>
              </Content>
            </FlexItem>
            <FlexItem>
              <ClipboardCopy
                isReadOnly
                hoverTip="Copy"
                clickTip="Copied"
                data-testid="agent-runtime-endpoint-connect"
              >
                {`openshell sandbox connect -n ${runtime.name}`}
              </ClipboardCopy>
            </FlexItem>
            <FlexItem>
              <Content component={ContentVariants.small}>
                Open an interactive shell session inside the sandbox.
              </Content>
            </FlexItem>
          </Flex>
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

export default AgentRuntimeEndpointsModal;
