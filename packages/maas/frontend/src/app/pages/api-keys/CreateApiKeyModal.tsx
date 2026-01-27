import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  ClipboardCopy,
  ClipboardCopyVariant,
  DatePicker,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
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
  Title,
} from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import { z } from 'zod';
import { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { createApiKey } from '../../api/api-keys';

const getTodaysDate = () => {
  const date = new Date();
  return date;
};

const dateToGoDuration = (selectedDate: Date): string => {
  const today = getTodaysDate();
  const selected = new Date(selectedDate);
  selected.setHours(23, 59, 59, 999);

  const diffMs = selected.getTime() - today.getTime();
  const totalMinutes = Math.round(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
};

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  expirationDate: z
    .date()
    .optional()
    .refine(
      (date) => {
        if (!date) {
          return true;
        }
        const dateAtMidnight = new Date(date);
        dateAtMidnight.setHours(0, 0, 0, 0);
        const today = getTodaysDate();
        return dateAtMidnight > today;
      },
      { message: 'Date must be in the future (not today)' },
    ),
});

type CreateApiKeyFormData = z.infer<typeof createApiKeySchema>;

type CreateApiKeyModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const CreateApiKeyModal: React.FC<CreateApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = React.useState<CreateApiKeyFormData>({
    name: '',
    description: '',
    expirationDate: undefined,
  });
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [createdToken, setCreatedToken] = React.useState<string | undefined>();

  const { markFieldTouched } = useZodFormValidation(formData, createApiKeySchema);

  const dateValidator = (date: Date) => {
    const dateAtMidnight = new Date(date);
    dateAtMidnight.setHours(0, 0, 0, 0);
    const today = getTodaysDate();
    return dateAtMidnight <= today ? 'Date must be in the future (not today)' : '';
  };

  const isFormValid = () => {
    const result = createApiKeySchema.safeParse(formData);
    return result.success;
  };

  const clearForm = () => {
    setFormData({
      name: '',
      description: '',
      expirationDate: undefined,
    });
    setError(undefined);
    setIsCreating(false);
    setCreatedToken(undefined);
  };

  const handleClose = () => {
    clearForm();
    onClose();
  };

  const handleSubmit = async () => {
    setIsCreating(true);
    setError(undefined);

    try {
      const expirationDuration = formData.expirationDate
        ? dateToGoDuration(formData.expirationDate)
        : undefined;
      const response = await createApiKey()(
        {},
        {
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          expiration: expirationDuration,
        },
      );

      setCreatedToken(response.token);
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create API key'));
      setIsCreating(false);
    }
  };

  return (
    <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={handleClose}>
      <ModalHeader title={createdToken ? 'API key created' : 'Create API key'} />
      <ModalBody>
        {createdToken ? (
          <Stack hasGutter>
            <StackItem>
              <Alert
                variant="warning"
                isInline
                title="Save your API key"
                data-testid="api-key-created-alert"
              >
                This is the only time you will see this key. Copy it now and store it securely.
              </Alert>
            </StackItem>
            <StackItem>
              <Card>
                <CardTitle>
                  <Flex
                    alignItems={{ default: 'alignItemsCenter' }}
                    spaceItems={{ default: 'spaceItemsSm' }}
                  >
                    <FlexItem>
                      <CheckCircleIcon color="green" />
                    </FlexItem>
                    <FlexItem>
                      <Title headingLevel="h3"> Your API key </Title>
                    </FlexItem>
                  </Flex>
                </CardTitle>
                <CardBody>
                  <ClipboardCopy
                    variant={ClipboardCopyVariant.expansion}
                    hoverTip="Copy"
                    clickTip="Copied"
                    data-testid="api-key-token-copy"
                    onCopy={() => {
                      navigator.clipboard.writeText(createdToken);
                    }}
                  >
                    {createdToken}
                  </ClipboardCopy>
                </CardBody>
              </Card>
            </StackItem>
            <StackItem>
              <Card>
                <CardBody>
                  <DescriptionList isHorizontal isCompact>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Name</DescriptionListTerm>
                      <DescriptionListDescription data-testid="api-key-display-name">
                        {formData.name}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    {formData.expirationDate ? (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Expiration</DescriptionListTerm>
                        <DescriptionListDescription data-testid="api-key-display-expiration">
                          {formData.expirationDate.toISOString().split('T')[0]}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    ) : (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Expiration</DescriptionListTerm>
                        <DescriptionListDescription data-testid="api-key-display-expiration">
                          4 hours
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                  </DescriptionList>
                </CardBody>
              </Card>
            </StackItem>
          </Stack>
        ) : (
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
                    value={
                      formData.expirationDate
                        ? formData.expirationDate.toISOString().split('T')[0]
                        : undefined
                    }
                    onChange={(_event, value, date) => {
                      if (date) {
                        const dateAtMidnight = new Date(date);
                        dateAtMidnight.setHours(0, 0, 0, 0);
                        setFormData({ ...formData, expirationDate: dateAtMidnight });
                      } else {
                        setFormData({ ...formData, expirationDate: undefined });
                      }
                    }}
                    placeholder="YYYY-MM-DD"
                    data-testid="api-key-date-input"
                    validators={[dateValidator]}
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        Optional expiration date for this API key. If not specified, the API key
                        will expire in 4 hours.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              </Form>
            </StackItem>
          </Stack>
        )}
      </ModalBody>
      <ModalFooter>
        {createdToken ? (
          <Button
            key="close"
            variant="primary"
            onClick={handleClose}
            data-testid="close-api-key-button"
          >
            Close
          </Button>
        ) : (
          <>
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
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default CreateApiKeyModal;
