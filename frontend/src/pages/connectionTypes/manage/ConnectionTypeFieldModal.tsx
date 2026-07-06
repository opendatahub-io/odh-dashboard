import * as React from 'react';
import { ConnectionTypeField, ConnectionTypeFieldType } from '#~/concepts/connectionTypes/types';
import { ConnectionTypeDataFieldModal } from '#~/pages/connectionTypes/manage/ConnectionTypeDataFieldModal';
import ConnectionTypeSectionModal from './ConnectionTypeSectionModal';

type Props = {
  field?: ConnectionTypeField;
  onClose: () => void;
  onSubmit: (field: ConnectionTypeField) => void;
  isEdit?: boolean;
  fields?: ConnectionTypeField[];
};

const ConnectionTypeFieldModal: React.FC<Props> = (props) => {
  if (props.field?.type === ConnectionTypeFieldType.Section) {
    return <ConnectionTypeSectionModal {...props} field={props.field} />;
  }
  return <ConnectionTypeDataFieldModal {...props} field={props.field} />;
};

export default ConnectionTypeFieldModal;
