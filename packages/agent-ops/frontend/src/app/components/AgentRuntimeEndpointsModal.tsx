import * as React from 'react';
import {
  Button,
  ClipboardCopy,
  Content,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { AgentRuntime } from '~/app/types/agentRuntimes';

// TODO: Add endpoints popover details (Cluster URL, Local URL, External production endpoint) once BFF exposes them.

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
    <ModalHeader title="Endpoints" labelId="endpoints-modal-title" />
    <ModalBody>
      <Stack hasGutter>
        {runtime.endpointUrl && (
          <StackItem>
            <FormGroup
              label={<Content component="b">Endpoint URL</Content>}
              fieldId="endpoint-url"
            >
              <ClipboardCopy
                id="endpoint-url"
                isReadOnly
                hoverTip="Copy"
                clickTip="Copied"
              >
                {runtime.endpointUrl}
              </ClipboardCopy>
            </FormGroup>
          </StackItem>
        )}
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
