import * as React from 'react';
import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  Stack,
  TextInput,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon, PlusCircleIcon } from '@patternfly/react-icons';
import FieldGroupHelpLabelIcon from '@odh-dashboard/ui-core/components/FieldGroupHelpLabelIcon';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/ui-core/components/TypeaheadSelect';
import { FieldValidationProps } from '@odh-dashboard/ui-core/hooks/useZodFormValidation';
import { SecretSummary } from '~/app/types/external-models';
import {
  IPP_MANAGED_SECRET_LABEL_KEY,
  IPP_MANAGED_SECRET_LABEL_VALUE,
  CREATE_NEW_SECRET_VALUE,
  SECRET_API_KEY_DATA_KEY,
} from '~/app/pages/external-providers/const';
import styles from './CredentialSecretField.module.scss';

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
      <strong>Expected format:</strong> The secret must contain the data key{' '}
      <code>{SECRET_API_KEY_DATA_KEY}</code> whose value is your API key or token.
    </p>
  </>
);

const EXISTING_SECRETS_GROUP = 'existing-secrets';

const filterSecretOptions = (
  filterValue: string,
  options: TypeaheadSelectOption[],
): TypeaheadSelectOption[] => {
  const createNewOption = options.find((option) => option.value === CREATE_NEW_SECRET_VALUE);
  const secretOptions = options.filter((option) => option.value !== CREATE_NEW_SECRET_VALUE);
  const filteredSecrets = secretOptions.filter((option) =>
    String(option.content).toLowerCase().includes(filterValue.toLowerCase()),
  );

  return createNewOption ? [...filteredSecrets, createNewOption] : filteredSecrets;
};

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
  const [isApiKeyVisible, setIsApiKeyVisible] = React.useState(false);

  const secretSelectOptions = React.useMemo<TypeaheadSelectOption[]>(
    () => [
      ...secrets.map((secret) => ({
        value: secret.name,
        content: secret.name,
        group: EXISTING_SECRETS_GROUP,
        'data-testid': `credential-secret-option-${secret.name}`,
      })),
      {
        value: CREATE_NEW_SECRET_VALUE,
        content: 'Create new secret',
        icon: <PlusCircleIcon aria-hidden />,
        'data-testid': 'credential-secret-create-new-option',
      },
    ],
    [secrets],
  );

  const selectedSecretValue = isNewSecret ? CREATE_NEW_SECRET_VALUE : credentialSecretRef;

  const handleSecretValueBlur = () => {
    secretValueValidationProps?.onBlur();
    const trimmed = secretValue.trim();
    if (trimmed !== secretValue) {
      onSecretValueChange(trimmed);
    }
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
        <TypeaheadSelect
          id="credential-secret"
          dataTestId="credential-secret-toggle"
          selectOptions={secretSelectOptions}
          selected={selectedSecretValue}
          onSelect={(_event, value) => {
            const selection = String(value);
            if (selection === CREATE_NEW_SECRET_VALUE) {
              onSelectCreateNew();
              return;
            }
            if (selection) {
              onSelectExisting(selection);
            }
          }}
          filterFunction={filterSecretOptions}
          placeholder="Select a credential secret"
          previewDescription={false}
          isRequired={false}
          isDisabled={!secretsLoaded}
          noOptionsAvailableMessage="No secrets are available"
          className={styles.credentialSecretSelectMenu}
          popperProps={{ maxWidth: 'trigger' }}
          isScrollable
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              Select an existing secret, or create a new one and set the Secret resource name plus
              API key.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
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
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    The Kubernetes Secret resource name. Must be lowercase, alphanumeric, and may
                    contain hyphens.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
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
