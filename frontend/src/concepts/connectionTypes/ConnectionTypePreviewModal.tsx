import React from 'react';
import { Form } from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
import ConnectionTypeForm from '~/concepts/connectionTypes/ConnectionTypeForm';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';

type Props = {
  onClose: () => void;
  obj: ConnectionTypeConfigMapObj;
};

const ConnectionTypePreviewModal: React.FC<Props> = ({ onClose, obj }) => (
  <Modal
    data-testid="connection-type-preview-modal"
    isOpen
    variant="medium"
    onClose={() => onClose()}
    title="Preview connection"
    description="This preview shows the user view of the connection form, and is for reference only."
  >
    <Form>
      <ConnectionTypeForm isPreview connectionType={obj} />
    </Form>
  </Modal>
);

export default ConnectionTypePreviewModal;
