import React from 'react';
import {
  Button,
  ExpandableSection,
  Form,
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
import { ProviderReferenceFormData } from './providerReferenceFormTypes';
import {
  EXTERNAL_MODEL_FIELD_MAX_LENGTH,
  isProviderReferenceApiFormat,
  PROVIDER_REFERENCE_API_FORMAT_OPTIONS,
  PROVIDER_REFERENCE_API_FORMATS,
} from './providerReferenceUtils';

type AddProviderReferenceConfigureStepProps = {
  form: ProviderReferenceFormData;
  selectedProvider?: ExternalProvider;
  onChange: (updates: Partial<ProviderReferenceFormData>) => void;
  validationError?: string;
};

const INHERITED_CONFIG_PREVIEW_COUNT = 5;

const ADD_PATH_PLACEHOLDER_HELPER =
  'Only the path uses {key} placeholders. {model} is filled automatically from the Target model ID. Other keys come from provider configuration — add a model override in Advanced settings only if this model needs a different value.';

const AddProviderReferenceConfigureStep: React.FC<AddProviderReferenceConfigureStepProps> = ({
  form,
  selectedProvider,
  onChange,
  validationError,
}) => {
  const [isAdvancedExpanded, setIsAdvancedExpanded] = React.useState(false);
  const apiFormatConfig = PROVIDER_REFERENCE_API_FORMATS[form.apiFormat];
  const inheritedConfig = selectedProvider?.config ?? {};
  const inheritedConfigCount = Object.keys(inheritedConfig).length;
  const overrideCount = form.configPairs.length;
  const overrideLabel = overrideCount === 1 ? 'override' : 'overrides';

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
    <Form>
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
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              Determines how requests and responses are translated for this provider.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>

      <FormGroup label="Target model ID" fieldId="provider-ref-target-model" isRequired>
        <TextInput
          id="provider-ref-target-model"
          data-testid="provider-ref-target-model"
          placeholder="e.g. gpt-4o, claude-sonnet-4-5-20241022"
          value={form.targetModel}
          maxLength={EXTERNAL_MODEL_FIELD_MAX_LENGTH}
          onChange={(_event, value) => onChange({ targetModel: value })}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              The provider-specific model identifier used in API requests.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>

      <FormGroup label="Path" fieldId="provider-ref-path" isRequired isStack>
        <TextInput
          id="provider-ref-path"
          data-testid="provider-ref-path"
          value={form.path}
          onChange={(_event, value) => onChange({ path: value })}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{apiFormatConfig.pathHelper}</HelperTextItem>
            <HelperTextItem>{ADD_PATH_PLACEHOLDER_HELPER}</HelperTextItem>
          </HelperText>
        </FormHelperText>
        {form.path !== apiFormatConfig.defaultPath && (
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

      <ExpandableSection
        isExpanded={isAdvancedExpanded}
        onToggle={(_event, expanded) => setIsAdvancedExpanded(expanded)}
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
          <StackItem>
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
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    These values come from the provider and are available for {'{key}'} resolution
                    in the path. Add an override below to change a value for this model.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
              <InheritedProviderConfig
                config={inheritedConfig}
                previewCount={INHERITED_CONFIG_PREVIEW_COUNT}
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup
              label="Model configuration"
              fieldId="provider-ref-model-configuration"
              isStack
            >
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Add key-value pairs specific to this model reference. Values are only used as{' '}
                    {'{key}'} placeholders in the path field – they do not affect other
                    configuration. Inherited values from the provider appear here and can be
                    overridden per-model.
                  </HelperTextItem>
                  <HelperTextItem>
                    For example, Vertex AI providers typically need <strong>project</strong> and{' '}
                    <strong>location</strong> keys (e.g., project=my-gcp-project,
                    location=us-central1). AWS Bedrock may need <strong>region</strong>.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
              <ModelConfigPairsEditor
                pairs={form.configPairs}
                onChange={(configPairs) => onChange({ configPairs })}
              />
            </FormGroup>
          </StackItem>
        </Stack>
      </ExpandableSection>

      {validationError && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant="error">{validationError}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </Form>
  );
};

export default AddProviderReferenceConfigureStep;
