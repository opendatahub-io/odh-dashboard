import {
  Button,
  DatePicker,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import React from 'react';

type CreateApiKeyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const CreateApiKeyModal: React.FC<CreateApiKeyModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [keyName, setKeyName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [expirationDate, setExpirationDate] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);

  const minDate = React.useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const parseDateString = (dateString: string): Date | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return null;
    }
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const dateValidator = (date: Date) =>
    date < minDate ? 'Date is before the allowable range.' : '';

  const isDateInvalid = () => {
    if (!expirationDate) {
      return false;
    }
    const date = parseDateString(expirationDate);
    return date === null || date < minDate;
  };

  const clearForm = () => {
    setKeyName('');
    setDescription('');
    setExpirationDate('');
  };

  const handleClose = () => {
    clearForm();
    onClose();
  };

  const handleSubmit = async () => {
    setIsCreating(true);
    clearForm();
    setIsCreating(false);

    onSuccess?.();
    onClose();
  };

  return (
    <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={handleClose}>
      <ModalHeader title="Create API key" />
      <ModalBody>
        <Form>
          <FormGroup label="Name" isRequired fieldId="api-key-name">
            <TextInput
              isRequired
              type="text"
              id="api-key-name"
              name="api-key-name"
              value={keyName}
              onChange={(_event, value) => setKeyName(value)}
              data-testid="api-key-name-input"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>A descriptive name for this API key</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label="Description" fieldId="api-key-description">
            <TextArea
              id="api-key-description"
              name="api-key-description"
              value={description}
              onChange={(_event, value) => setDescription(value)}
              rows={5}
              data-testid="api-key-description-input"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>Optional description of how this key will be used</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label="Expiration date" fieldId="api-key-expiration">
            <DatePicker
              id="api-key-expiration"
              value={expirationDate}
              onChange={(_event, value) => setExpirationDate(value)}
              placeholder="YYYY-MM-DD"
              data-testid="api-key-date-input"
              validators={[dateValidator]}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>Optional expiration date for this API key</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          key="create"
          variant="primary"
          onClick={handleSubmit}
          isDisabled={!keyName.trim() || isCreating || isDateInvalid()}
          isLoading={isCreating}
          data-testid="create-api-key-button"
        >
          Create API key
        </Button>
        <Button key="cancel" variant="link" onClick={handleClose} isDisabled={isCreating}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CreateApiKeyModal;
