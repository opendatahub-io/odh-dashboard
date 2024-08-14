import * as React from 'react';
import {
  ConnectionTypeField,
  ConnectionTypeFieldType,
  SectionField,
} from '~/concepts/connectionTypes/types';
import ConnectionTypeSectionModal from '~/pages/connectionTypes/create/ConnectionTypeSectionModal';

type Props = {
  field?: ConnectionTypeField;
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: (field: SectionField) => void;
  isEdit?: boolean;
};

const ConnectionTypeFieldModal: React.FC<Props> = (props) => {
  if (props.field?.type === ConnectionTypeFieldType.Section) {
    return <ConnectionTypeSectionModal {...props} field={props.field} />;
  }
  // TODO open data field modal
  return null;
};

export default ConnectionTypeFieldModal;
