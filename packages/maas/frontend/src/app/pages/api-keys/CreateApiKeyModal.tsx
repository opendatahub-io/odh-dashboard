import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  ClipboardCopy,
  ClipboardCopyVariant,
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
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Select,
  SelectList,
  SelectOption,
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
import { formatApiKeyError } from '~/app/pages/api-keys/utils';
import { createApiKey } from '../../api/api-keys';

const EXPIRATION_OPTION_VALUES = ['30d', '60d', '90d', '180d', '1y', 'none'] as const;

type ExpirationOptionValue = (typeof EXPIRATION_OPTION_VALUES)[number];

const EXPIRATION_OPTIONS: { value: ExpirationOptionValue; label: string; expiresIn?: string }[] = [
  { value: '30d', label: '30 days', expiresIn: '30d' },
  { value: '60d', label: '60 days', expiresIn: '60d' },
  { value: '90d', label: '90 days', expiresIn: '90d' },
  { value: '180d', label: '180 days', expiresIn: '180d' },
  { value: '1y', label: '1 year', expiresIn: '365d' },
  { value: 'none', label: 'Max expiration' },
];

const isValidExpirationOption = (v: string | number | undefined): v is ExpirationOptionValue =>
  EXPIRATION_OPTION_VALUES.some((val) => val === v);

const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .refine((val) => /^[a-zA-Z0-9_-]+$/.test(val), {
      message: 'Name can only contain letters, numbers, dashes, and underscores',
    }),
  description: z.string().optional(),
  expirationOption: z.enum(EXPIRATION_OPTION_VALUES),
});

type CreateApiKeyFormData = z.infer<typeof createApiKeySchema>;

type CreateApiKeyModalProps = {
  onClose: () => void;
};

const CreateApiKeyModal: React.FC<CreateApiKeyModalProps> = ({ onClose }) => {
  const [formData, setFormData] = React.useState<CreateApiKeyFormData>({
    name: '',
    description: '',
    expirationOption: '90d',
  });
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [createdToken, setCreatedToken] = React.useState<string | undefined>();

  const { getFieldValidation, getFieldValidationProps } = useZodFormValidation(
    formData,
    createApiKeySchema,
  );

  const isFormValid = () => {
    const result = createApiKeySchema.safeParse(formData);
    return result.success;
  };

  const selectedOption = EXPIRATION_OPTIONS.find((opt) => opt.value === formData.expirationOption);

  const handleSubmit = async () => {
    setIsCreating(true);
    setError(undefined);

    try {
      const response = await createApiKey()(
        {},
        {
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          expiresIn: selectedOption?.expiresIn,
        },
      );

      setCreatedToken(response.key);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create API key';
      setError(new Error(formatApiKeyError(msg)));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal variant={ModalVariant.medium} isOpen onClose={onClose}>
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
                    {formData.description && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Description</DescriptionListTerm>
                        <DescriptionListDescription data-testid="api-key-display-description">
                          {formData.description}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                    <DescriptionListGroup>
                      <DescriptionListTerm>Expiration</DescriptionListTerm>
                      <DescriptionListDescription data-testid="api-key-display-expiration">
                        {selectedOption?.label ?? 'Max expiration'}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
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
                    {...getFieldValidationProps(['name'])}
                    data-testid="api-key-name-input"
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>A descriptive name for this API key</HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                  {getFieldValidation(['name']).length > 0 && (
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem variant="error">
                          {getFieldValidation(['name'])[0].message}
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  )}
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

                <FormGroup label="Expiration" fieldId="api-key-expiration">
                  <Select
                    id="api-key-expiration"
                    isOpen={isSelectOpen}
                    onOpenChange={(open) => setIsSelectOpen(open)}
                    selected={formData.expirationOption}
                    onSelect={(_event, value) => {
                      if (isValidExpirationOption(value)) {
                        setFormData({ ...formData, expirationOption: value });
                      }
                      setIsSelectOpen(false);
                    }}
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={() => setIsSelectOpen(!isSelectOpen)}
                        isExpanded={isSelectOpen}
                        data-testid="api-key-expiration-toggle"
                      >
                        {selectedOption?.label ?? '90 days'}
                      </MenuToggle>
                    )}
                  >
                    <SelectList>
                      {EXPIRATION_OPTIONS.map((opt) => (
                        <SelectOption
                          key={opt.value}
                          value={opt.value}
                          data-testid={`api-key-expiration-option-${opt.value}`}
                        >
                          {opt.label}
                        </SelectOption>
                      ))}
                    </SelectList>
                  </Select>
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
            onClick={onClose}
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
              data-testid="submit-create-api-key-button"
            >
              Create API key
            </Button>
            <Button key="cancel" variant="link" onClick={onClose} isDisabled={isCreating}>
              Cancel
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default CreateApiKeyModal;
