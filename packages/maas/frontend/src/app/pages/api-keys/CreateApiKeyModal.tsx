import {
  Alert,
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
  Stack,
  StackItem,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import React from 'react';
import { z } from 'zod';
import { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { createApiKey } from '~/app/api/api-keys';

const getTodaysDate = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  expirationDate: z
    .string()
    .optional()
    .refine(
      (dateStr) => {
        if (!dateStr) {
          return true;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return false;
        }
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        if (Number.isNaN(date.getTime())) {
          return false;
        }
        if (
          date.getFullYear() !== year ||
          date.getMonth() !== month - 1 ||
          date.getDate() !== day
        ) {
          return false;
        }
        return date >= getTodaysDate();
      },
      { message: 'Date must be today or in the future' },
    ),
});

type CreateApiKeyFormData = z.infer<typeof createApiKeySchema>;

type CreateApiKeyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const CreateApiKeyModal: React.FC<CreateApiKeyModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = React.useState<CreateApiKeyFormData>({
    name: '',
    description: '',
    expirationDate: '',
  });
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const { markFieldTouched } = useZodFormValidation(formData, createApiKeySchema);

  const minDate = React.useMemo(() => getTodaysDate(), []);

  const dateValidator = (date: Date) => {
    const dateAtMidnight = new Date(date);
    dateAtMidnight.setHours(0, 0, 0, 0);
    return dateAtMidnight < minDate ? 'Date must be today or in the future' : '';
  };

  const isFormValid = () => {
    const result = createApiKeySchema.safeParse(formData);
    return result.success;
  };

  const clearForm = () => {
    setFormData({
      name: '',
      description: '',
      expirationDate: '',
    });
    setError(undefined);
  };

  const handleClose = () => {
    clearForm();
    onClose();
  };

  const handleSubmit = async () => {
    setIsCreating(true);
    setError(undefined);

    try {
      await createApiKey()(
        {},
        {
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          expiration: formData.expirationDate || undefined,
        },
      );

      clearForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create API key'));
      setIsCreating(false);
    }
  };

  return (
    <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={handleClose}>
      <ModalHeader title="Create API key" />
      <ModalBody>
        <Stack hasGutter>
          {error && (
            <StackItem>
              <Alert
                data-testid="create-api-key-error-alert"
                title="Error creating API key"
                isInline
                variant="danger"
              >
                {error.message}
              </Alert>
            </StackItem>
          )}
          <StackItem>
            <Form>
              <FormGroup label="Name" isRequired fieldId="api-key-name">
                <TextInput
                  isRequired
                  type="text"
                  id="api-key-name"
                  name="api-key-name"
                  value={formData.name}
                  onChange={(_event, value) => setFormData({ ...formData, name: value })}
                  onBlur={() => markFieldTouched(['name'])}
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
                  value={formData.description}
                  onChange={(_event, value) => setFormData({ ...formData, description: value })}
                  rows={5}
                  data-testid="api-key-description-input"
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Optional description of how this key will be used
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>

              <FormGroup label="Expiration date" fieldId="api-key-expiration">
                <DatePicker
                  id="api-key-expiration"
                  value={formData.expirationDate}
                  onChange={(_event, value) => setFormData({ ...formData, expirationDate: value })}
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
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          key="create"
          variant="primary"
          onClick={handleSubmit}
          isDisabled={!isFormValid() || isCreating}
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
