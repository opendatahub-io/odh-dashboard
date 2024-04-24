import * as React from 'react';
import {
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  Modal,
  TextInput,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import DashboardDescriptionListGroup, {
  DashboardDescriptionListGroupProps,
} from './DashboardDescriptionListGroup';

type EditableTextDescriptionListGroupProps = Partial<
  Pick<DashboardDescriptionListGroupProps, 'title' | 'contentWhenEmpty'>
> & {
  labels: string[];
  saveEditedLabels: (labels: string[]) => Promise<void>;
};

const EditableLabelsDescriptionListGroup: React.FC<EditableTextDescriptionListGroupProps> = ({
  title = 'Labels',
  contentWhenEmpty = 'No labels',
  labels,
  saveEditedLabels,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [unsavedLabels, setUnsavedLabels] = React.useState(labels);
  const [isSavingEdits, setIsSavingEdits] = React.useState(false);

  const editUnsavedLabel = (newText: string, index: number) => {
    if (isSavingEdits) {
      return;
    }
    const copy = [...unsavedLabels];
    copy[index] = newText;
    setUnsavedLabels(copy);
  };
  const removeUnsavedLabel = (text: string) => {
    if (isSavingEdits) {
      return;
    }
    setUnsavedLabels(unsavedLabels.filter((label) => label !== text));
  };
  const addUnsavedLabel = (text: string) => {
    if (isSavingEdits) {
      return;
    }
    setUnsavedLabels([...unsavedLabels, text]);
  };

  const [isAddLabelModalOpen, setIsAddLabelModalOpen] = React.useState(false);
  const [addLabelInputValue, setAddLabelInputValue] = React.useState('');
  const addLabelInputRef = React.useRef<HTMLInputElement>(null);
  const addLabelInputTooLong = addLabelInputValue.length > 63;

  const toggleAddLabelModal = () => {
    setAddLabelInputValue('');
    setIsAddLabelModalOpen(!isAddLabelModalOpen);
  };
  React.useEffect(() => {
    if (isAddLabelModalOpen && addLabelInputRef.current) {
      addLabelInputRef.current.focus();
    }
  }, [isAddLabelModalOpen]);
  const addLabelModalSubmitDisabled = !addLabelInputValue || addLabelInputTooLong;
  const submitAddLabelModal = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!addLabelModalSubmitDisabled) {
      addUnsavedLabel(addLabelInputValue);
      toggleAddLabelModal();
    }
  };

  return (
    <>
      <DashboardDescriptionListGroup
        title={title}
        isEmpty={labels.length === 0}
        contentWhenEmpty={contentWhenEmpty}
        isEditable
        isEditing={isEditing}
        isSavingEdits={isSavingEdits}
        contentWhenEditing={
          <LabelGroup
            isEditable={!isSavingEdits}
            numLabels={unsavedLabels.length}
            addLabelControl={
              !isSavingEdits && (
                <Label color="blue" variant="outline" isOverflowLabel onClick={toggleAddLabelModal}>
                  Add label
                </Label>
              )
            }
          >
            {unsavedLabels.map((label, index) => (
              <Label
                key={label}
                color="blue"
                data-testid="label"
                isEditable={!isSavingEdits}
                editableProps={{ 'aria-label': `Editable label with text ${label}` }}
                onClose={() => removeUnsavedLabel(label)}
                closeBtnProps={{ isDisabled: isSavingEdits }}
                onEditComplete={(_event, newText) => editUnsavedLabel(newText, index)}
              >
                {label}
              </Label>
            ))}
          </LabelGroup>
        }
        onEditClick={() => {
          setUnsavedLabels(labels);
          setIsEditing(true);
        }}
        onSaveEditsClick={async () => {
          setIsSavingEdits(true);
          try {
            await saveEditedLabels(unsavedLabels);
          } finally {
            setIsSavingEdits(false);
          }
          setIsEditing(false);
        }}
        onDiscardEditsClick={() => {
          setUnsavedLabels(labels);
          setIsEditing(false);
        }}
      >
        <LabelGroup>
          {labels.map((label) => (
            <Label key={label} color="blue" data-testid="label">
              {label}
            </Label>
          ))}
        </LabelGroup>
      </DashboardDescriptionListGroup>
      <Modal
        variant="small"
        title="Add label"
        isOpen={isAddLabelModalOpen}
        onClose={toggleAddLabelModal}
        actions={[
          <Button
            key="save"
            variant="primary"
            form="add-label-form"
            onClick={submitAddLabelModal}
            isDisabled={addLabelModalSubmitDisabled}
          >
            Save
          </Button>,
          <Button key="cancel" variant="link" onClick={toggleAddLabelModal}>
            Cancel
          </Button>,
        ]}
      >
        <Form id="add-label-form" onSubmit={submitAddLabelModal}>
          <FormGroup label="Label text" fieldId="add-label-form-label-text" isRequired>
            <TextInput
              type="text"
              id="add-label-form-label-text"
              name="add-label-form-label-text"
              value={addLabelInputValue}
              onChange={(_event: React.FormEvent<HTMLInputElement>, value: string) =>
                setAddLabelInputValue(value)
              }
              ref={addLabelInputRef}
              isRequired
              validated={addLabelInputTooLong ? 'error' : 'default'}
            />
            {addLabelInputTooLong && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem icon={<ExclamationCircleIcon />} variant="error">
                    Label text can&apos;t exceed 63 characters
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>
        </Form>
      </Modal>
    </>
  );
};

export default EditableLabelsDescriptionListGroup;
