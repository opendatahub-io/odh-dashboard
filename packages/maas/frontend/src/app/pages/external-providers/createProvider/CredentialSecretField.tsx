import * as React from 'react';
import {
  Button,
  Divider,
  Flex,
  FlexItem,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  Stack,
  TextInput,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon, PlusCircleIcon } from '@patternfly/react-icons';
import FieldGroupHelpLabelIcon from '@odh-dashboard/ui-core/components/FieldGroupHelpLabelIcon';
import { FieldValidationProps } from '@odh-dashboard/ui-core/hooks/useZodFormValidation';
import { SecretSummary } from '~/app/types/external-models';
import {
  IPP_MANAGED_SECRET_LABEL_KEY,
  IPP_MANAGED_SECRET_LABEL_VALUE,
  CREATE_NEW_SECRET_VALUE,
  SECRET_API_KEY_DATA_KEY,
} from '~/app/pages/external-providers/const';
import { getSecretDisplayLabel } from '~/app/pages/external-providers/utils';

type CredentialSecretFieldProps = {
  secrets: SecretSummary[];
  secretsLoaded: boolean;
  isNewSecret: boolean;
  credentialSecretRef: string;
  secretValue: string;
  onSelectExisting: (secretName: string) => void;
  onSelectCreateNew: () => void;
  onNewSecretNameChange: (name: string) => void;
  onSecretValueChange: (value: string) => void;
  secretNameValidationProps?: FieldValidationProps;
  secretValueValidationProps?: FieldValidationProps;
  secretValidationMessage?: string;
  secretValueValidationMessage?: string;
};

const credentialSecretHelpContent = (
  <>
    <p>
      A <strong>credential secret</strong> is a Kubernetes Secret (type: Opaque) in your namespace
      that stores the authentication credentials needed to connect to the provider.
    </p>
    <p>
      <strong>Expected format:</strong> The secret should contain a data key (e.g.,{' '}
      <code>apiKey</code> or <code>credentials</code>) whose value is your API key or token.
    </p>
  </>
);

const CredentialSecretField: React.FC<CredentialSecretFieldProps> = ({
  secrets,
  secretsLoaded,
  isNewSecret,
  credentialSecretRef,
  secretValue,
  onSelectExisting,
  onSelectCreateNew,
  onNewSecretNameChange,
  onSecretValueChange,
  secretNameValidationProps,
  secretValueValidationProps,
  secretValidationMessage,
  secretValueValidationMessage,
}) => {
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  const [isApiKeyVisible, setIsApiKeyVisible] = React.useState(false);

  const selectedDropdownValue = isNewSecret ? CREATE_NEW_SECRET_VALUE : credentialSecretRef;

  const selectedExistingSecret = React.useMemo(
    () => secrets.find((secret) => secret.name === credentialSecretRef),
    [credentialSecretRef, secrets],
  );

  const toggleLabel = React.useMemo(() => {
    if (isNewSecret) {
      return 'Create new secret';
    }
    if (credentialSecretRef) {
      return getSecretDisplayLabel(
        selectedExistingSecret ?? { name: credentialSecretRef, displayName: undefined },
      );
    }
    return 'Select a credential secret';
  }, [credentialSecretRef, isNewSecret, selectedExistingSecret]);

  const handleSecretValueBlur = () => {
    secretValueValidationProps?.onBlur();
    const trimmed = secretValue.trim();
    if (trimmed !== secretValue) {
      onSecretValueChange(trimmed);
    }
  };

  const handleSecretValuePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    onSecretValueChange(event.clipboardData.getData('text').trim());
  };

  const newSecretHelperText = credentialSecretRef.trim() ? (
    <>
      A Kubernetes Secret named <strong>{credentialSecretRef.trim()}</strong> will be created as
      type Opaque with data key <strong>{SECRET_API_KEY_DATA_KEY}</strong> and the required label{' '}
      <strong>
        {IPP_MANAGED_SECRET_LABEL_KEY}: &quot;{IPP_MANAGED_SECRET_LABEL_VALUE}&quot;
      </strong>
      . Without that label, the gateway cannot use the key.
    </>
  ) : null;

  return (
    <>
      <FormGroup
        label="Credential secret"
        isRequired
        fieldId="credential-secret"
        labelHelp={
          <FieldGroupHelpLabelIcon
            buttonTestId="credential-secret-help-icon"
            popoverBodyTestId="credential-secret-help-popover"
            content={credentialSecretHelpContent}
          />
        }
      >
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              Select an existing secret by its display name, or create a new one and set the Secret
              resource name plus API key.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
        <Select
          id="credential-secret"
          isOpen={isSelectOpen}
          selected={selectedDropdownValue}
          onSelect={(_event, value) => {
            const selection = String(value ?? '');
            if (selection === CREATE_NEW_SECRET_VALUE) {
              onSelectCreateNew();
            } else if (selection) {
              onSelectExisting(selection);
            }
            setIsSelectOpen(false);
          }}
          onOpenChange={(open) => setIsSelectOpen(open)}
          toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
            <MenuToggle
              ref={toggleRef}
              onClick={() => setIsSelectOpen((open) => !open)}
              isExpanded={isSelectOpen}
              isDisabled={!secretsLoaded}
              isFullWidth
              data-testid="credential-secret-toggle"
            >
              {toggleLabel}
            </MenuToggle>
          )}
        >
          <SelectList>
            {secrets.map((secret) => (
              <SelectOption
                key={secret.name}
                value={secret.name}
                description={secret.name}
                data-testid={`credential-secret-option-${secret.name}`}
              >
                {getSecretDisplayLabel(secret)}
              </SelectOption>
            ))}
            <Divider component="li" />
            <SelectOption
              value={CREATE_NEW_SECRET_VALUE}
              data-testid="credential-secret-create-new-option"
            >
              <Flex
                spaceItems={{ default: 'spaceItemsSm' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem>
                  <PlusCircleIcon color="var(--pf-t--global--icon--color--brand--default)" />
                </FlexItem>
                <FlexItem>Create new secret</FlexItem>
              </Flex>
            </SelectOption>
          </SelectList>
        </Select>
        {!isNewSecret && secretValidationMessage && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error">{secretValidationMessage}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}

        {isNewSecret && (
          <Stack hasGutter className="pf-v6-u-pl-lg pf-v6-u-pt-md">
            <FormGroup label="Secret name" isRequired fieldId="credential-secret-name">
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    The Kubernetes Secret resource name. Must be lowercase, alphanumeric, and may
                    contain hyphens. Existing secrets in the dropdown are listed by a friendly
                    display name.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
              <TextInput
                isRequired
                id="credential-secret-name"
                className="pf-v6-u-w-100"
                value={credentialSecretRef}
                onChange={(_event, value) => onNewSecretNameChange(value)}
                placeholder="provider-api-key"
                data-testid="credential-secret-name-input"
                {...secretNameValidationProps}
              />
              {secretValidationMessage && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant="error">{secretValidationMessage}</HelperTextItem>
                  </HelperText>
                </FormHelperText>
              )}
            </FormGroup>

            <FormGroup label="API key" isRequired fieldId="credential-secret-value">
              <InputGroup className="pf-v6-u-w-100">
                <InputGroupItem isFill>
                  <TextInput
                    isRequired
                    type={isApiKeyVisible ? 'text' : 'password'}
                    id="credential-secret-value"
                    name="credential-secret-value"
                    aria-label="API key"
                    value={secretValue}
                    placeholder="Paste your API key"
                    onChange={(_event, value) => onSecretValueChange(value)}
                    onBlur={handleSecretValueBlur}
                    onPaste={handleSecretValuePaste}
                    data-testid="credential-secret-value-input"
                    validated={secretValueValidationProps?.validated}
                  />
                </InputGroupItem>
                <InputGroupItem>
                  <Button
                    variant="control"
                    data-testid="credential-secret-value-visibility-toggle"
                    aria-label={isApiKeyVisible ? 'Hide API key' : 'Show API key'}
                    icon={isApiKeyVisible ? <EyeSlashIcon /> : <EyeIcon />}
                    onClick={() => setIsApiKeyVisible((visible) => !visible)}
                  />
                </InputGroupItem>
              </InputGroup>
              {secretValueValidationMessage && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant="error">{secretValueValidationMessage}</HelperTextItem>
                  </HelperText>
                </FormHelperText>
              )}
              {newSecretHelperText && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>{newSecretHelperText}</HelperTextItem>
                  </HelperText>
                </FormHelperText>
              )}
            </FormGroup>
          </Stack>
        )}
      </FormGroup>
    </>
  );
};

export default CredentialSecretField;
