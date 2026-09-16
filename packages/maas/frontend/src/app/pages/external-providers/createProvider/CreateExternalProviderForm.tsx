import * as React from 'react';
import {
  ExpandableSection,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  TextInput,
} from '@patternfly/react-core';
import K8sNameDescriptionField from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import { mapAuthMechanismToHumanReadable } from '~/app/pages/external-models/utils';
import { AUTH_MECHANISM_VALUES, isAuthMechanism } from '~/app/pages/external-providers/validation';
import CredentialSecretField from './CredentialSecretField';
import ProviderTypeField from './ProviderTypeField';
import { ProviderConfigurationSection } from './ProviderConfigKeyValueField';
import CreateExternalProviderSubmitError from './CreateExternalProviderSubmitError';
import { UseCreateExternalProviderFormReturn } from './useCreateExternalProviderForm';

type CreateExternalProviderFormProps = {
  form: UseCreateExternalProviderFormReturn;
  showProjectField?: boolean;
};

const CreateExternalProviderForm: React.FC<CreateExternalProviderFormProps> = ({
  form,
  showProjectField = true,
}) => {
  const {
    namespace,
    secrets,
    secretsLoaded,
    nameDescData,
    onNameDescChange,
    formData,
    setFormData,
    configPairs,
    setConfigPairs,
    isAdvancedExpanded,
    setIsAdvancedExpanded,
    isAuthOpen,
    setIsAuthOpen,
    submitError,
    getFieldValidation,
    getFieldValidationProps,
    markFieldTouched,
    configPairsError,
    configPairCount,
    handleProviderChange,
  } = form;

  return (
    <Form className="pf-v6-u-w-100">
      {showProjectField && (
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
      )}

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
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              The fully qualified domain name (FQDN) of the provider API — for example,
              api.openai.com or us-central1-aiplatform.googleapis.com. Do not include https:// or a
              path; the path is configured per model.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
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
        <Select
          id="external-provider-auth"
          isOpen={isAuthOpen}
          selected={formData.authMechanism || undefined}
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
              {formData.authMechanism
                ? mapAuthMechanismToHumanReadable(formData.authMechanism)
                : 'Select authentication'}
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
        <FormHelperText>
          <HelperText>
            <HelperTextItem>API key or bearer token authentication.</HelperTextItem>
          </HelperText>
        </FormHelperText>
        {getFieldValidation(['authMechanism']).map((validation) => (
          <FormHelperText key={validation.path.join('.')}>
            <HelperText>
              <HelperTextItem variant="error">{validation.message}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        ))}
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

      <CreateExternalProviderSubmitError error={submitError} />
    </Form>
  );
};

export default CreateExternalProviderForm;
