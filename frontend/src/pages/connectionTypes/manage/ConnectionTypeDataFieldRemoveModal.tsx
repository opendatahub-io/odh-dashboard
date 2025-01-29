import * as React from 'react';
import { Modal } from '@patternfly/react-core/deprecated';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { ConnectionTypeDataField } from '~/concepts/connectionTypes/types';

type Props = {
  field: ConnectionTypeDataField;
  onClose: (submit: boolean) => void;
};

const ConnectionTypeDataFieldRemoveModal: React.FC<Props> = ({ field, onClose }) => (
  <Modal
    isOpen
    title="Remove field?"
    onClose={() => onClose(false)}
    variant="small"
    footer={
      <DashboardModalFooter
        submitLabel="Remove"
        onCancel={() => onClose(false)}
        onSubmit={() => onClose(true)}
      />
    }
  >
    The <b>{field.name}</b> field will be removed.
  </Modal>
);

export default ConnectionTypeDataFieldRemoveModal;
