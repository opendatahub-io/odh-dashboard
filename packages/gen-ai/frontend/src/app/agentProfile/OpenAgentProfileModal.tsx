import * as React from 'react';
import {
  Button,
  Checkbox,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@patternfly/react-core';

export const OPEN_AGENT_MODAL_DISMISSED_KEY = 'gen-ai-agent-open-modal-dismissed';

type OpenAgentProfileModalProps = {
  displayName: string;
  onPreview: () => void;
  onEdit: () => void;
  onCancel: () => void;
};

const OpenAgentProfileModal: React.FC<OpenAgentProfileModalProps> = ({
  displayName,
  onPreview,
  onEdit,
  onCancel,
}) => {
  const [doNotShow, setDoNotShow] = React.useState(false);

  const persist = () => {
    if (doNotShow) {
      try {
        localStorage.setItem(OPEN_AGENT_MODAL_DISMISSED_KEY, 'true');
      } catch {
        // Silently ignore SecurityError / QuotaExceededError (private browsing, full storage)
      }
    }
  };

  return (
    <Modal
      isOpen
      onClose={onPreview}
      variant="small"
      aria-labelledby="open-agent-profile-modal-title"
      data-testid="open-agent-profile-modal"
    >
      <ModalHeader title="Open this agent?" labelId="open-agent-profile-modal-title" />
      <ModalBody>
        <Content>
          <Content component="p">
            You are opening <strong>{displayName}</strong>. Preview keeps agent configuration
            read-only so you can chat safely. Edit unlocks the agent configuration panel for
            changes.
          </Content>
        </Content>
        <Checkbox
          id="open-agent-do-not-show"
          label="Don't show this message again"
          isChecked={doNotShow}
          onChange={(_e, checked) => setDoNotShow(checked)}
        />
      </ModalBody>
      <ModalFooter>
        <Button
          variant="secondary"
          data-testid="open-agent-profile-preview-button"
          onClick={() => {
            persist();
            onPreview();
          }}
        >
          Preview
        </Button>
        <Button
          variant="primary"
          data-testid="open-agent-profile-edit-button"
          onClick={() => {
            persist();
            onEdit();
          }}
        >
          Edit
        </Button>
        <Button variant="link" onClick={onCancel}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default OpenAgentProfileModal;
