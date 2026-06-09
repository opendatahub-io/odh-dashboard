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

// TODO: The BFF AgentRuntime model currently exposes a single `endpointUrl`.
// To support the full multi-endpoint view (Cluster URL, Local URL, External production endpoint)
// the following BFF changes are required:
//   1. Extend `bff/internal/models/agent_runtime.go` AgentRuntime struct with:
//      - ClusterURL  string `json:"clusterUrl,omitempty"`
//      - LocalURL    string `json:"localUrl,omitempty"`
//      - ExternalURL string `json:"externalUrl,omitempty"`
//   2. Populate those fields in the agent runtime repository/mapper from the agent's Service and Route resources.
//   3. Extend the frontend AgentRuntime type (`app/types/agentRuntimes.ts`) with the new fields.
//   4. Replace the single `endpointUrl` section below with the three labelled sections.

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
        {runtime.endpointUrl ? (
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
        ) : (
          <StackItem>
            <Content component="p">No endpoints are currently available for this agent.</Content>
          </StackItem>
        )}
        {/* TODO: Cluster URL section — requires BFF extension (see file-level TODO above) */}
        {/* TODO: Local URL section — requires BFF extension */}
        {/* TODO: External production endpoint section — requires BFF extension */}
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
