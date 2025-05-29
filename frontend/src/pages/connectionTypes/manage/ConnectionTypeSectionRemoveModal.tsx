import * as React from 'react';
import {
  Badge,
  Checkbox,
  ExpandableSection,
  List,
  ListItem,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import { ConnectionTypeField, SectionField } from '#~/concepts/connectionTypes/types';

type Props = {
  field: SectionField;
  onClose: (submit: boolean, removeFields: boolean) => void;
  fields: ConnectionTypeField[];
};

const ConnectionTypeSectionRemoveModal: React.FC<Props> = ({ field, fields, onClose }) => {
  const [removedFields, setRemovedFields] = React.useState(false);
  return (
    <Modal isOpen onClose={() => onClose(false, false)} variant="small">
      <ModalHeader title="Remove section?" />
      <ModalBody>
        <div>
          The <b>{field.name}</b> section heading will be removed.
        </div>
        {fields.length > 0 ? (
          <div className="pf-v6-u-mt-md">
            <Checkbox
              id="remove-fields-checkbox"
              data-testid="remove-fields-checkbox"
              label="Remove associated fields"
              isChecked={removedFields}
              onChange={(_, checked) => setRemovedFields(checked)}
            />
            <ExpandableSection
              className="pf-v6-u-mt-md"
              isIndented
              toggleContent={
                <>
                  Associated fields <Badge isRead>{fields.length}</Badge>
                </>
              }
            >
              <List>
                {fields.map((f, i) => (
                  <ListItem key={i}>{f.name}</ListItem>
                ))}
              </List>
            </ExpandableSection>
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Remove"
          onCancel={() => onClose(false, false)}
          onSubmit={() => onClose(true, removedFields)}
        />
      </ModalFooter>
    </Modal>
  );
};

export default ConnectionTypeSectionRemoveModal;
