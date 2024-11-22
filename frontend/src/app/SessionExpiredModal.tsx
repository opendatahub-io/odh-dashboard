import React from 'react';

import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@patternfly/react-core';
import { logout } from './appUtils';

const SessionExpiredModal: React.FC = () => (
  <Modal
    data-testid="session-expired-modal"
    variant={ModalVariant.small}
    isOpen
    aria-labelledby="session-expired-modal-title"
  >
    <ModalHeader
      title="Session Expired"
      titleIconVariant="warning"
      labelId="session-expired-modal-title"
    />
    <ModalBody>Your session timed out. To continue working, log in.</ModalBody>
    <ModalFooter>
      <Button
        data-testid="modal-login-button"
        key="confirm"
        variant="primary"
        onClick={() => logout().then(() => window.location.reload())}
      >
        Log in
      </Button>
    </ModalFooter>
  </Modal>
);

export default SessionExpiredModal;
