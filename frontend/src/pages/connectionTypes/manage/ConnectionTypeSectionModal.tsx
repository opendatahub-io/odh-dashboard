import * as React from 'react';
import { Form, FormGroup, Modal, TextInput, TextArea, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { SectionField } from '~/concepts/connectionTypes/types';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';

type Props = {
  field?: SectionField;
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: (field: SectionField) => void;
  isEdit?: boolean;
};

const ConnectionTypeSectionModal: React.FC<Props> = ({
  field,
  isOpen,
  onClose,
  onSubmit,
  isEdit,
}) => {
  const [name, setName] = React.useState(field?.name || '');
  const [description, setDescription] = React.useState(field?.description || '');

  const isValid = name.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      title={isEdit ? 'Edit section heading' : 'Add section heading'}
      onClose={onClose}
      variant="medium"
      footer={
        <DashboardModalFooter
          submitLabel={isEdit ? 'Edit' : 'Add'}
          onCancel={onClose}
          onSubmit={() => {
            if (isValid) {
              onSubmit({ type: 'section', name, description });
              onClose();
            }
          }}
          isSubmitDisabled={!isValid}
          alertTitle=""
        />
      }
    >
      <Form>
        <FormGroup
          label="Section heading"
          isRequired
          fieldId="section-name"
          labelIcon={
            <Popover
              headerContent="Section heading"
              bodyContent="Use section headings to indicate groups of related fields. Use descriptive headings, for example, Details, Configuration, Preferences."
            >
              <DashboardPopupIconButton
                icon={<OutlinedQuestionCircleIcon />}
                aria-label="More info for section heading"
              />
            </Popover>
          }
        >
          <TextInput
            isRequired
            id="section-name"
            data-testid="section-name"
            value={name}
            onChange={(_e, value) => setName(value)}
          />
        </FormGroup>
        <FormGroup
          label="Section description"
          fieldId="section-description"
          labelIcon={
            <Popover
              headerContent="Section description"
              bodyContent="Use section descriptions to summarize the required input."
            >
              <DashboardPopupIconButton
                icon={<OutlinedQuestionCircleIcon />}
                aria-label="More info for section description"
              />
            </Popover>
          }
        >
          <TextArea
            id="section-description"
            data-testid="section-description"
            value={description}
            onChange={(_e, value) => setDescription(value)}
          />
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default ConnectionTypeSectionModal;
