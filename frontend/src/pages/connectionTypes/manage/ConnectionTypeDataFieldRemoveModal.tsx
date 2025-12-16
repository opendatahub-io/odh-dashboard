import * as React from 'react';
import ContentModal from '#~/components/modals/ContentModal';
import { ConnectionTypeDataField } from '#~/concepts/connectionTypes/types';

type Props = {
  field: ConnectionTypeDataField;
  onClose: (submit: boolean) => void;
};

const ConnectionTypeDataFieldRemoveModal: React.FC<Props> = ({ field, onClose }) => (
  <ContentModal
    title="Remove field?"
    onClose={() => onClose(false)}
    variant="small"
    dataTestId="connection-type-data-field-remove-modal"
    buttonActions={[
      {
        label: 'Remove',
        onClick: () => onClose(true),
        variant: 'primary',
        dataTestId: 'connection-remove-button',
      },
      {
        label: 'Cancel',
        onClick: () => onClose(false),
        variant: 'link',
        clickOnEnter: true,
        dataTestId: 'connection-cancel-button',
      },
    ]}
    contents={
      <>
        The <b>{field.name}</b> field will be removed.
      </>
    }
  />
);

export default ConnectionTypeDataFieldRemoveModal;
