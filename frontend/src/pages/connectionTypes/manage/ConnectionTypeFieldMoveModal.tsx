import * as React from 'react';
import {
  Form,
  FormGroup,
  MenuToggle,
  Modal,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { ConnectionTypeField, ConnectionTypeFieldType } from '~/concepts/connectionTypes/types';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';

type SectionSelection = { sectionName: string; sectionIndex: number };

type Props = {
  field?: ConnectionTypeField;
  rows?: ConnectionTypeField[];
  onClose: () => void;
  onSubmit: (field: ConnectionTypeField, index: number) => void;
};

export const ConnectionTypeMoveFieldToSectionModal: React.FC<Props> = ({
  field,
  rows,
  onClose,
  onSubmit,
}) => {
  const options = React.useMemo(() => {
    const temp: SectionSelection[] = [];
    for (let i = 0; rows && i < rows.length; i++) {
      if (rows[i].type === ConnectionTypeFieldType.Section) {
        temp.push({ sectionName: rows[i].name, sectionIndex: i });
      }
    }
    return temp;
  }, [rows]);

  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  const [selectedSection, setSelectedSection] = React.useState<SectionSelection | undefined>(
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
            if (field && selectedSection) {
              onSubmit(field, selectedSection.sectionIndex);
              onClose();
            }
          }}
          isSubmitDisabled={!selectedSection}
          alertTitle=""
        />
      }
    >
      Select the section heading that <b>{field?.name}</b> will be moved to.
      <Form>
        <FormGroup
          fieldId="sectionHeading"
          label="Section heading"
          isRequired
          data-testid="section-heading-select"
        >
          <Select
            id="sectionHeading"
            isOpen={isSelectOpen}
            shouldFocusToggleOnSelect
            selected={selectedSection}
            onSelect={(_e, value) => {
              setSelectedSection(options.find((s) => s.sectionIndex === value));
              setIsSelectOpen(false);
            }}
            onOpenChange={(open) => setIsSelectOpen(open)}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                id="type-select"
                isFullWidth
                onClick={() => {
                  setIsSelectOpen((open) => !open);
                }}
                isExpanded={isSelectOpen}
                isDisabled={options.length === 1}
              >
                {selectedSection?.sectionName}
              </MenuToggle>
            )}
          >
            <SelectList>
              {options.map((s, i) => (
                <SelectOption
                  key={s.sectionName}
                  value={s.sectionIndex}
                  data-testid={`select-value-${i} select-name-${s.sectionName}`}
                >
                  {s.sectionName}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
        </FormGroup>
      </Form>
    </Modal>
  );
};
