import * as React from 'react';
import {
  Alert,
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
  validationWarnings?: string[];
  onPreview: () => void;
  onEdit: () => void;
  onCancel: () => void;
};

const OpenAgentProfileModal: React.FC<OpenAgentProfileModalProps> = ({
  displayName,
  validationWarnings,
  onPreview,
  onEdit,
  onCancel,
}) => {
  const [doNotShow, setDoNotShow] = React.useState(false);
  const hasWarnings = !!validationWarnings?.length;

  const persist = () => {
    if (doNotShow && !hasWarnings) {
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
        {hasWarnings && (
          <Alert
            variant="warning"
            isInline
            title="Some resources from this agent configuration are no longer available"
            className="pf-v6-u-mb-md"
            data-testid="open-agent-profile-warning-alert"
          >
            <ul>
              {validationWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Alert>
        )}
        <Content>
          <Content component="p">
            You are opening <strong>{displayName}</strong>. Preview keeps agent configuration
            read-only so you can chat safely. Edit unlocks the agent configuration panel for
            changes.
          </Content>
        </Content>
        {!hasWarnings && (
          <Checkbox
            id="open-agent-do-not-show"
            label="Don't show this message again"
            isChecked={doNotShow}
            onChange={(_e, checked) => setDoNotShow(checked)}
          />
        )}
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
          isDisabled={hasWarnings}
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
