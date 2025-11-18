import * as React from 'react';
import {
  Modal,
  ModalVariant,
  Button,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Alert,
} from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import { MCPServer } from '~/app/types';

interface MCPServerSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: MCPServer;
  toolsCount?: number;
  onEditTools: () => void;
  onDisconnect: () => void;
}

const MCPServerSuccessModal: React.FC<MCPServerSuccessModalProps> = ({
  isOpen,
  onClose,
  server,
  toolsCount = 0,
  onEditTools,
  onDisconnect,
}) => (
  <Modal
    variant={ModalVariant.medium}
    isOpen={isOpen}
    onClose={onClose}
    data-testid="mcp-server-success-modal"
  >
    <ModalHeader title="Connection successful" titleIconVariant="success" />
    <ModalBody>
      <p className="pf-v6-u-mb-md">
        You are now connected to <strong>{server.name}</strong>. You can use it directly in the
        playground chat.
      </p>
      {toolsCount > 40 && (
        <Alert
          variant="warning"
          title="Performance may be degraded with more than 40 active tools."
          isInline
          className="pf-v6-u-mb-md"
        />
      )}
      <div className="pf-v6-u-display-flex pf-v6-u-align-items-center pf-v6-u-mb-sm">
        <p className="pf-v6-u-mb-0 pf-v6-u-mr-md">
          {toolsCount} out of {toolsCount} tools are active.
        </p>
        <Button
          variant="link"
          icon={<PencilAltIcon />}
          onClick={onEditTools}
          className="pf-v6-u-p-0"
          isInline
          style={{ textDecoration: 'none' }}
        >
          Edit tool selection
        </Button>
      </div>
    </ModalBody>
    <ModalFooter data-testid="modal-footer">
      <Button key="save" variant="primary" onClick={onClose} data-testid="modal-submit-button">
        Save
      </Button>
      <Button
        key="disconnect"
        variant="link"
        onClick={onDisconnect}
        data-testid="modal-cancel-button"
      >
        Disconnect
      </Button>
    </ModalFooter>
  </Modal>
);

export default MCPServerSuccessModal;
