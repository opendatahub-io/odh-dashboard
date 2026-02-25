import React from 'react';
import { Modal, ModalVariant } from '@patternfly/react-core';

type RunDetailPlaceholderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  runName?: string;
};

const RunDetailPlaceholderModal: React.FC<RunDetailPlaceholderModalProps> = ({
  isOpen,
  onClose,
  runName,
}) => (
  <Modal
    variant={ModalVariant.small}
    title="Detail page"
    isOpen={isOpen}
    onClose={onClose}
    aria-label="Run detail placeholder"
  >
    <p>
      {runName
        ? `Detail page for run "${runName}" will be implemented here.`
        : 'Detail page will be implemented here.'}
    </p>
  </Modal>
);

export default RunDetailPlaceholderModal;
