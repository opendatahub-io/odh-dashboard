import React from 'react';
import {
  Button,
  ExpandableSection,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import { ExternalProvider } from '~/app/types/external-models';
import InheritedProviderConfig from './InheritedProviderConfig';
import ModelConfigPairsEditor from './ModelConfigPairsEditor';
import {
  ProviderReferenceFieldErrors,
  ProviderReferenceFormData,
  ProviderReferenceHelperVariant,
} from './providerReferenceFormTypes';
import {
  EXTERNAL_MODEL_FIELD_MAX_LENGTH,
  PROVIDER_REFERENCE_PATH_MAX_LENGTH,
  isProviderReferenceApiFormat,
  PROVIDER_REFERENCE_API_FORMAT_OPTIONS,
  PROVIDER_REFERENCE_API_FORMATS,
} from './providerReferenceUtils';

const INHERITED_CONFIG_PREVIEW_COUNT = 5;

const ADD_PATH_PLACEHOLDER_HELPER =
  'Only the path uses {key} placeholders. {model} is filled automatically from the Target model ID. Other keys come from provider configuration — add a model override in Advanced settings only if this model needs a different value.';

const EDIT_PATH_PLACEHOLDER_HELPER =
  'Wrap any key from the key-value pairs section in curly braces to insert its value — for example, /v1/projects/{project}/locations/{location}/chat/completions.';

const EDIT_KEY_VALUE_PAIRS_DESCRIPTION =
  'Configuration keys and values for this model reference. These can be used as {key} placeholders in the path below. Inherited values from the provider you select or create above will appear here. To change provider-level key-value pairs, update them in the provider section above. Use model configuration to override inherited values or add new ones.';

const EDIT_INHERITED_CONFIG_HELPER =
  'These values come from the external provider and are available for {key} resolution in the path. Add an override below to change a value for this model.';

const CONFIG_EXAMPLES_HELPER = (
  <>
    For example, Vertex AI providers typically need <strong>project</strong> and{' '}
    <strong>location</strong> keys (e.g., project=my-gcp-project, location=us-central1). AWS Bedrock
    may need <strong>region</strong>.
  </>
);

type ProviderReferenceFormFieldProps = {
  form: ProviderReferenceFormData;
  onChange: (updates: Partial<ProviderReferenceFormData>) => void;
};

type ProviderReferenceValidatedFieldProps = ProviderReferenceFormFieldProps & {
  fieldErrors?: ProviderReferenceFieldErrors;
};

type ProviderReferenceApiFormatFieldProps = ProviderReferenceFormFieldProps & {
  showHelperText?: boolean;
};

export const ProviderReferenceApiFormatField: React.FC<ProviderReferenceApiFormatFieldProps> = ({
  form,
  onChange,
  showHelperText = false,
}) => {
  const handleApiFormatChange = (key: string) => {
    if (!isProviderReferenceApiFormat(key)) {
      return;
    }
    onChange({
      apiFormat: key,
      path: PROVIDER_REFERENCE_API_FORMATS[key].defaultPath,
    });
  };

  return (
    <FormGroup label="API format" fieldId="provider-ref-api-format" isRequired>
      <SimpleSelect
        data-testid="provider-ref-api-format"
        ariaLabel="API format"
        value={form.apiFormat}
        options={PROVIDER_REFERENCE_API_FORMAT_OPTIONS}
        onChange={handleApiFormatChange}
        isFullWidth
        toggleProps={{ id: 'provider-ref-api-format' }}
      />
      {showHelperText && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              Determines how requests and responses are translated for this provider.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </FormGroup>
  );
};

type ProviderReferenceTargetModelFieldProps = ProviderReferenceValidatedFieldProps & {
  showHelperText?: boolean;
};

export const ProviderReferenceTargetModelField: React.FC<
  ProviderReferenceTargetModelFieldProps
> = ({ form, onChange, fieldErrors, showHelperText = false }) => {
  const targetModelError = fieldErrors?.targetModel;

  return (
    <FormGroup label="Target model ID" fieldId="provider-ref-target-model" isRequired>
      <TextInput
        id="provider-ref-target-model"
        data-testid="provider-ref-target-model"
        placeholder="e.g. gpt-4o, claude-sonnet-4-5-20241022"
        value={form.targetModel}
        maxLength={EXTERNAL_MODEL_FIELD_MAX_LENGTH}
        validated={targetModelError ? 'error' : 'default'}
        onChange={(_event, value) => onChange({ targetModel: value })}
      />
      {targetModelError ? (
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant="error">{targetModelError}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : (
        showHelperText && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                The provider-specific model identifier used in API requests.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        )
      )}
    </FormGroup>
  );
};

type ProviderReferencePathFieldProps = ProviderReferenceValidatedFieldProps & {
  showResetButton?: boolean;
  pathHelperVariant: ProviderReferenceHelperVariant;
};

export const ProviderReferencePathField: React.FC<ProviderReferencePathFieldProps> = ({
  form,
  onChange,
  fieldErrors,
  showResetButton = false,
  pathHelperVariant,
}) => {
  const pathError = fieldErrors?.path;
  const apiFormatConfig = PROVIDER_REFERENCE_API_FORMATS[form.apiFormat];

  return (
    <FormGroup label="Path" fieldId="provider-ref-path" isRequired isStack>
      <TextInput
        id="provider-ref-path"
        data-testid="provider-ref-path"
        value={form.path}
        maxLength={PROVIDER_REFERENCE_PATH_MAX_LENGTH}
        validated={pathError ? 'error' : 'default'}
        onChange={(_event, value) => onChange({ path: value })}
      />
      <FormHelperText>
        <HelperText>
          {pathError ? (
            <HelperTextItem variant="error">{pathError}</HelperTextItem>
          ) : pathHelperVariant === 'add' ? (
            <>
              <HelperTextItem>{apiFormatConfig.pathHelper}</HelperTextItem>
              <HelperTextItem>{ADD_PATH_PLACEHOLDER_HELPER}</HelperTextItem>
            </>
          ) : (
            <HelperTextItem>{EDIT_PATH_PLACEHOLDER_HELPER}</HelperTextItem>
          )}
        </HelperText>
      </FormHelperText>
      {showResetButton && form.path !== apiFormatConfig.defaultPath && (
        <Button
          variant="link"
          isInline
          style={{ textDecoration: 'underline' }}
          onClick={() => onChange({ path: apiFormatConfig.defaultPath })}
          data-testid="provider-ref-path-reset"
        >
          Reset to default
        </Button>
      )}
    </FormGroup>
  );
};

type ProviderReferenceConfigSectionProps = {
  form: ProviderReferenceFormData;
  onChange: (updates: Partial<ProviderReferenceFormData>) => void;
  selectedProvider?: ExternalProvider;
  variant: 'advanced' | 'edit';
  helperVariant?: ProviderReferenceHelperVariant;
};

export const ProviderReferenceConfigSection: React.FC<ProviderReferenceConfigSectionProps> = ({
  form,
  onChange,
  selectedProvider,
  variant,
  helperVariant = 'add',
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const inheritedConfig = selectedProvider?.config ?? {};
  const inheritedConfigCount = Object.keys(inheritedConfig).length;
  const overrideCount = form.configPairs.length;
  const overrideLabel = overrideCount === 1 ? 'override' : 'overrides';

  const inheritedConfigContent = (
    <>
      <FormHelperText>
        <HelperText>
          <HelperTextItem>
            {helperVariant === 'edit'
              ? EDIT_INHERITED_CONFIG_HELPER
              : 'These values come from the provider and are available for {key} resolution in the path. Add an override below to change a value for this model.'}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
      <InheritedProviderConfig
        config={inheritedConfig}
        previewCount={variant === 'advanced' ? INHERITED_CONFIG_PREVIEW_COUNT : undefined}
      />
    </>
  );

  const modelConfigContent = (
    <FormGroup label="Model configuration" fieldId="provider-ref-model-configuration" isStack>
      {variant === 'advanced' && (
        <FormHelperText>
          <HelperText>
            {helperVariant === 'edit' ? (
              <>
                <HelperTextItem>{EDIT_KEY_VALUE_PAIRS_DESCRIPTION}</HelperTextItem>
                <HelperTextItem>{CONFIG_EXAMPLES_HELPER}</HelperTextItem>
              </>
            ) : (
              <>
                <HelperTextItem>
                  Add key-value pairs specific to this model reference. Values are only used as{' '}
                  {'{key}'} placeholders in the path field – they do not affect other configuration.
                  Inherited values from the provider appear here and can be overridden per-model.
                </HelperTextItem>
                <HelperTextItem>{CONFIG_EXAMPLES_HELPER}</HelperTextItem>
              </>
            )}
          </HelperText>
        </FormHelperText>
      )}
      <ModelConfigPairsEditor
        pairs={form.configPairs}
        onChange={(configPairs) => onChange({ configPairs })}
      />
    </FormGroup>
  );

  const inheritedFormGroup = (
    <FormGroup
      label={
        <>
          Inherited from provider{' '}
          <Label isCompact color="grey" data-testid="inherited-provider-config-count">
            {inheritedConfigCount}
          </Label>
        </>
      }
      fieldId="inherited-provider-config"
      isStack
    >
      {variant === 'advanced' ? (
        inheritedConfigContent
      ) : (
        <ExpandableSection
          isExpanded={isExpanded}
          onToggle={(_event, expanded) => setIsExpanded(expanded)}
          hasToggleIcon={false}
          toggleContent={(expanded) => (
            <>
              {expanded ? <AngleDownIcon aria-hidden /> : <AngleRightIcon aria-hidden />}{' '}
              {expanded ? 'Hide key-value pairs' : 'Show key-value pairs'}
            </>
          )}
          data-testid="inherited-provider-config-toggle"
        >
          {inheritedConfigContent}
        </ExpandableSection>
      )}
    </FormGroup>
  );

  if (variant === 'advanced') {
    return (
      <ExpandableSection
        isExpanded={isExpanded}
        onToggle={(_event, expanded) => setIsExpanded(expanded)}
        hasToggleIcon={false}
        toggleContent={(expanded) => (
          <>
            {expanded ? <AngleDownIcon aria-hidden /> : <AngleRightIcon aria-hidden />}{' '}
            {expanded
              ? 'Hide advanced settings'
              : `Advanced settings (${inheritedConfigCount} inherited, ${overrideCount} ${overrideLabel})`}
          </>
        )}
        data-testid="provider-ref-advanced-settings"
      >
        <Stack hasGutter>
          <StackItem>{inheritedFormGroup}</StackItem>
          <StackItem>{modelConfigContent}</StackItem>
        </Stack>
      </ExpandableSection>
    );
  }

  return (
    <>
      <FormHelperText>
        <HelperText>
          <HelperTextItem>{EDIT_KEY_VALUE_PAIRS_DESCRIPTION}</HelperTextItem>
          <HelperTextItem>{CONFIG_EXAMPLES_HELPER}</HelperTextItem>
        </HelperText>
      </FormHelperText>
      <Stack hasGutter>
        <StackItem>{inheritedFormGroup}</StackItem>
        <StackItem>{modelConfigContent}</StackItem>
      </Stack>
    </>
  );
};
