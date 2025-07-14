import * as React from 'react';
import { Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import { ConnectionTypeDataField } from '#~/concepts/connectionTypes/types';

type Props = {
  field: ConnectionTypeDataField;
  onClose: (submit: boolean) => void;
};

const ConnectionTypeDataFieldRemoveModal: React.FC<Props> = ({ field, onClose }) => (
  <Modal isOpen onClose={() => onClose(false)} variant="small">
    <ModalHeader title="Remove field?" />
    <ModalBody>
      The <b>{field.name}</b> field will be removed.
    </ModalBody>
    <ModalFooter>
      <DashboardModalFooter
        submitLabel="Remove"
        onCancel={() => onClose(false)}
        onSubmit={() => onClose(true)}
      />
    </ModalFooter>
  </Modal>
);

export default ConnectionTypeDataFieldRemoveModal;
