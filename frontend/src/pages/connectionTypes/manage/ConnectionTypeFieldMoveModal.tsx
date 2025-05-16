import * as React from 'react';
import { Form, FormGroup } from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
import { ConnectionTypeField, ConnectionTypeFieldType } from '~/concepts/connectionTypes/types';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';

type Props = {
  row: { field: ConnectionTypeField; index: number };
  fields?: ConnectionTypeField[];
  onClose: () => void;
  onSubmit: (field: ConnectionTypeField, index: number) => void;
};

export const ConnectionTypeMoveFieldToSectionModal: React.FC<Props> = ({
  row,
  fields: fields,
  onClose,
  onSubmit,
}) => {
  const options = React.useMemo(() => {
    const parentSectionIndex = fields?.findLastIndex(
      (r, i) => r.type === ConnectionTypeFieldType.Section && i < row.index,
    );

    const temp: SimpleSelectOption[] = [];
    for (let i = 0; fields && i < fields.length; i++) {
      if (fields[i].type === ConnectionTypeFieldType.Section && i !== parentSectionIndex) {
        temp.push({ label: fields[i].name, key: String(i) });
      }
    }

    return temp;
  }, [fields, row]);

  const [selectedSection, setSelectedSection] = React.useState<SimpleSelectOption | undefined>(
    options[0],
  );

  return (
    <Modal
      isOpen
      title="Move to section"
      onClose={onClose}
      variant="medium"
      footer={
        <DashboardModalFooter
          submitLabel="Move"
          onCancel={onClose}
          onSubmit={() => {
            if (selectedSection) {
              onSubmit(row.field, Number(selectedSection.key));
              onClose();
            }
          }}
          isSubmitDisabled={!selectedSection}
        />
      }
    >
      <Form>
        <div>
          Select the section heading that <b>{row.field.name}</b> will be moved to.
        </div>
        <FormGroup fieldId="sectionHeading" label="Section heading" isRequired>
          <SimpleSelect
            id="sectionHeading"
            dataTestId="section-heading-select"
            options={options}
            value={selectedSection?.key}
            onChange={(key) => setSelectedSection(options.find((s) => s.key === key))}
            isFullWidth
          />
        </FormGroup>
      </Form>
    </Modal>
  );
};
