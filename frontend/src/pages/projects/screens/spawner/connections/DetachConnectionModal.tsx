import React from 'react';
import { Button, Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';
import { Connection } from '~/concepts/connectionTypes/types';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';

type Props = {
  connection: Connection;
  isRunning?: boolean;
  notebookDisplayName: string;
  onDetach: () => void;
  onClose: () => void;
};

export const DetachConnectionModal: React.FC<Props> = ({
  connection,
  isRunning,
  notebookDisplayName,
  onDetach,
  onClose,
}) => (
  <Modal isOpen variant="medium" onClose={onClose}>
    <ModalHeader title="Detach connection?" titleIconVariant={isRunning ? 'warning' : undefined} />
    <ModalBody>
      {isRunning ? (
        <>
          The <b>{getDisplayNameFromK8sResource(connection)}</b> connection will be detached from
          the workbench. To avoid losing your work, save any recent data in the current workbench,{' '}
          <b>{notebookDisplayName}</b>.
        </>
      ) : (
        <>
          The <b>{getDisplayNameFromK8sResource(connection)}</b> connection will be detached from
          the <b>{notebookDisplayName}</b> workbench.
        </>
      )}
    </ModalBody>
    <ModalFooter>
      <Button
        key="detach-button"
        variant={isRunning ? 'danger' : 'primary'}
        onClick={() => {
          onDetach();
        }}
      >
        Detach
      </Button>
      <Button key="cancel-button" variant="link" onClick={onClose}>
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);
