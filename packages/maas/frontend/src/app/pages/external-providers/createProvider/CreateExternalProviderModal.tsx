import * as React from 'react';
import {
  Alert,
  Button,
  ExpandableSection,
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
  TextInput,
} from '@patternfly/react-core';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/k8s-core';
import { useZodFormValidation } from '@odh-dashboard/ui-core/hooks/useZodFormValidation';
import { AuthMechanism } from '~/app/types/external-models';
import { useExternalModelsContext } from '~/app/context/ExternalModelsContext';
import { useCreateExternalProvider } from '~/app/hooks/useCreateExternalProvider';
import { useCreateSecret } from '~/app/hooks/useCreateSecret';
import { mapAuthMechanismToHumanReadable } from '~/app/pages/external-models/utils';
import { EMPTY_CONFIG_PAIR } from '~/app/pages/external-providers/const';
import { ConfigPair } from '~/app/pages/external-providers/types';
import { toCreateExternalProviderRequest } from '~/app/pages/external-providers/utils';
import {
  AUTH_MECHANISM_VALUES,
  createExternalProviderFormSchema,
  getConfigPairsValidationError,
  isAuthMechanism,
} from '~/app/pages/external-providers/validation';
import CredentialSecretField from './CredentialSecretField';
import ProviderTypeField from './ProviderTypeField';
import {
  countNonEmptyConfigPairs,
  ProviderConfigurationSection,
} from './ProviderConfigKeyValueField';

type CreateExternalProviderModalProps = {
  namespace: string;
  onClose: (created?: boolean) => void;
};

const CreateExternalProviderModal: React.FC<CreateExternalProviderModalProps> = ({
  namespace,
  onClose,
}) => {
  const { secrets, secretsLoaded, refreshSecrets, refreshExternalProviders } =
    useExternalModelsContext();
  const { isCreating: isCreatingProvider, createExternalProviderCallback } =
    useCreateExternalProvider();
  const { isCreating: isCreatingSecret, createSecretCallback } = useCreateSecret();

  const { data: nameDescData, onDataChange: onNameDescChange } = useK8sNameDescriptionFieldData({});

  const [formData, setFormData] = React.useState<{
    provider: string;
    endpointUrl: string;
    authMechanism: AuthMechanism;
    credentialSecretRef: string;
    isNewSecret: boolean;
    secretValue: string;
  }>({
    provider: '',
    endpointUrl: '',
    authMechanism: 'apikey',
    credentialSecretRef: '',
    isNewSecret: false,
    secretValue: '',
  });
  const [configPairs, setConfigPairs] = React.useState<ConfigPair[]>([EMPTY_CONFIG_PAIR]);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = React.useState(false);
  const [isAuthOpen, setIsAuthOpen] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | undefined>();

  const { getFieldValidation, getFieldValidationProps, markFieldTouched } = useZodFormValidation(
    formData,
    createExternalProviderFormSchema,
  );

  const isValidK8sNameDescription = isK8sNameDescriptionDataValid(nameDescData);
  const configPairsError = getConfigPairsValidationError(configPairs);
  const isFormValid =
    isValidK8sNameDescription &&
    !configPairsError &&
    getFieldValidation(undefined, true).length === 0;
  const isSubmitting = isCreatingProvider || isCreatingSecret;
  const configPairCount = countNonEmptyConfigPairs(configPairs);

  const handleProviderChange = (providerType: string) => {
    setFormData((current) => ({ ...current, provider: providerType }));
  };

  const handleSubmit = async () => {
    if (!isFormValid) {
      return;
    }

    setSubmitError(undefined);

    try {
      if (formData.isNewSecret) {
        await createSecretCallback({
          namespace,
          name: formData.credentialSecretRef.trim(),
          value: formData.secretValue.trim(),
        });
        refreshSecrets();
      }

      await createExternalProviderCallback(
        toCreateExternalProviderRequest(namespace, nameDescData, formData, configPairs),
      );
      refreshExternalProviders();
      onClose(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create external provider';
      setSubmitError(message);
    }
  };

  return (
    <Modal variant={ModalVariant.medium} isOpen onClose={() => onClose()}>
      <ModalHeader title="Add external provider" />
      <ModalBody>
        <Form className="pf-v6-u-w-100">
          <FormGroup label="Project" fieldId="external-provider-project">
            <TextInput
              id="external-provider-project"
              className="pf-v6-u-w-100"
              value={namespace}
              readOnly
              isDisabled
              data-testid="external-provider-project-input"
            />
          </FormGroup>

          <K8sNameDescriptionField
            dataTestId="external-provider-name-desc"
            nameLabel="Display name"
            descriptionHelperText="e.g. Production OpenAI API endpoint for team use"
            data={nameDescData}
            onDataChange={onNameDescChange}
          />

          <ProviderTypeField
            provider={formData.provider}
            onProviderChange={handleProviderChange}
            validationMessage={getFieldValidation(['provider'])[0]?.message}
          />

          <FormGroup label="Endpoint" isRequired fieldId="external-provider-endpoint">
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  The fully qualified domain name (FQDN) of the provider API — for example,
                  api.openai.com or us-central1-aiplatform.googleapis.com. Do not include https://
                  or a path; the path is configured per model.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
            <TextInput
              isRequired
              id="external-provider-endpoint"
              className="pf-v6-u-w-100"
              value={formData.endpointUrl}
              onChange={(_event, value) =>
                setFormData((current) => ({ ...current, endpointUrl: value }))
              }
              placeholder="api.openai.com"
              data-testid="external-provider-endpoint-input"
              {...getFieldValidationProps(['endpointUrl'])}
            />
            {getFieldValidation(['endpointUrl']).map((validation) => (
              <FormHelperText key={validation.path.join('.')}>
                <HelperText>
                  <HelperTextItem variant="error">{validation.message}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            ))}
          </FormGroup>

          <CredentialSecretField
            secrets={secrets}
            secretsLoaded={secretsLoaded}
            isNewSecret={formData.isNewSecret}
            credentialSecretRef={formData.credentialSecretRef}
            secretValue={formData.secretValue}
            onSelectExisting={(secretName) =>
              setFormData((current) => ({
                ...current,
                credentialSecretRef: secretName,
                isNewSecret: false,
                secretValue: '',
              }))
            }
            onSelectCreateNew={() =>
              setFormData((current) => ({
                ...current,
                isNewSecret: true,
                credentialSecretRef: '',
                secretValue: '',
              }))
            }
            onNewSecretNameChange={(name) => {
              if (name.length > 0) {
                markFieldTouched(['credentialSecretRef']);
              }
              setFormData((current) => ({ ...current, credentialSecretRef: name }));
            }}
            onSecretValueChange={(value) => {
              if (value.length > 0) {
                markFieldTouched(['secretValue']);
              }
              setFormData((current) => ({ ...current, secretValue: value }));
            }}
            secretNameValidationProps={getFieldValidationProps(['credentialSecretRef'])}
            secretValueValidationProps={getFieldValidationProps(['secretValue'])}
            secretValidationMessage={getFieldValidation(['credentialSecretRef'])[0]?.message}
            secretValueValidationMessage={getFieldValidation(['secretValue'])[0]?.message}
          />

          <FormGroup label="Authentication" isRequired fieldId="external-provider-auth">
            <FormHelperText>
              <HelperText>
                <HelperTextItem>API key or bearer token authentication.</HelperTextItem>
              </HelperText>
            </FormHelperText>
            <Select
              id="external-provider-auth"
              isOpen={isAuthOpen}
              selected={formData.authMechanism}
              onSelect={(_event, value) => {
                const nextValue = String(value);
                if (isAuthMechanism(nextValue)) {
                  setFormData((current) => ({
                    ...current,
                    authMechanism: nextValue,
                  }));
                }
                setIsAuthOpen(false);
              }}
              onOpenChange={(nextOpen) => setIsAuthOpen(nextOpen)}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsAuthOpen((open) => !open)}
                  isExpanded={isAuthOpen}
                  isFullWidth
                  data-testid="external-provider-auth-toggle"
                >
                  {mapAuthMechanismToHumanReadable(formData.authMechanism)}
                </MenuToggle>
              )}
            >
              <SelectList>
                {AUTH_MECHANISM_VALUES.map((option) => (
                  <SelectOption
                    key={option}
                    value={option}
                    data-testid={`external-provider-auth-option-${option}`}
                  >
                    {mapAuthMechanismToHumanReadable(option)}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>

          <ExpandableSection
            toggleText={
              configPairCount > 0 ? `Advanced settings (${configPairCount})` : 'Advanced settings'
            }
            isExpanded={isAdvancedExpanded}
            onToggle={(_event, expanded) => setIsAdvancedExpanded(expanded)}
            data-testid="external-provider-advanced-settings"
          >
            <ProviderConfigurationSection
              pairs={configPairs}
              onChange={setConfigPairs}
              validationMessage={configPairsError}
            />
          </ExpandableSection>

          {submitError && (
            <Alert
              variant="danger"
              isInline
              title="Failed to create external provider"
              data-testid="create-external-provider-error"
            >
              {submitError}
            </Alert>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          key="create"
          variant="primary"
          onClick={handleSubmit}
          isDisabled={!isFormValid || isSubmitting}
          isLoading={isSubmitting}
          data-testid="create-external-provider-submit"
        >
          Add
        </Button>
        <Button
          key="cancel"
          variant="link"
          onClick={() => onClose()}
          isDisabled={isSubmitting}
          data-testid="create-external-provider-cancel"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CreateExternalProviderModal;
