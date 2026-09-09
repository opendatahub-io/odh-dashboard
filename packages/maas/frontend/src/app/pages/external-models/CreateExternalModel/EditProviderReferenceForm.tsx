import React from 'react';
import {
  ExpandableSection,
  Form,
  FormGroup,
  FormHelperText,
  FormSection,
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
  getProviderDisplayName,
  isProviderReferenceApiFormat,
  PROVIDER_REFERENCE_API_FORMAT_OPTIONS,
  PROVIDER_REFERENCE_API_FORMATS,
  ProviderReferenceApiFormat,
} from './providerReferenceUtils';

const KEY_VALUE_PAIRS_DESCRIPTION =
  'Configuration keys and values for this model reference. These can be used as {key} placeholders in the path below. Inherited values from the provider you select or create above will appear here. To change provider-level key-value pairs, update them in the provider section above. Use model configuration to override inherited values or add new ones.';

const PATH_PLACEHOLDER_HELPER =
  'Wrap any key from the key-value pairs section in curly braces to insert its value — for example, /v1/projects/{project}/locations/{location}/chat/completions.';

type EditProviderReferenceFormProps = {
  form: ProviderReferenceFormData;
  providerName: string;
  selectedProvider?: ExternalProvider;
  onChange: (updates: Partial<ProviderReferenceFormData>) => void;
  validationError?: string;
};

const EditProviderReferenceForm: React.FC<EditProviderReferenceFormProps> = ({
  form,
  providerName,
  selectedProvider,
  onChange,
  validationError,
}) => {
  const [isInheritedExpanded, setIsInheritedExpanded] = React.useState(false);
  const inheritedConfig = selectedProvider?.config ?? {};
  const inheritedConfigCount = Object.keys(inheritedConfig).length;
  const providerDisplayName = getProviderDisplayName(providerName, selectedProvider);

  const handleApiFormatChange = (key: string) => {
    if (!isProviderReferenceApiFormat(key)) {
      return;
    }
    onChange({
      apiFormat: key as ProviderReferenceApiFormat,
      path: PROVIDER_REFERENCE_API_FORMATS[key as ProviderReferenceApiFormat].defaultPath,
    });
  };

  return (
    <Form>
      <FormSection title="External provider" titleElement="h3">
        <FormGroup label="External provider" fieldId="edit-provider-ref-external-provider">
          <TextInput
            id="edit-provider-ref-external-provider"
            data-testid="edit-provider-ref-external-provider"
            value={providerDisplayName}
            isDisabled
          />
        </FormGroup>
      </FormSection>

      <FormSection title="Provider reference configuration" titleElement="h3">
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
        </FormGroup>

        <FormGroup label="Target model ID" fieldId="provider-ref-target-model" isRequired>
          <TextInput
            id="provider-ref-target-model"
            data-testid="provider-ref-target-model"
            placeholder="e.g. gpt-4o, claude-sonnet-4-5-20241022"
            value={form.targetModel}
            onChange={(_event, value) => onChange({ targetModel: value })}
          />
        </FormGroup>
      </FormSection>

      <FormSection title="Key-value pairs" titleElement="h3">
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{KEY_VALUE_PAIRS_DESCRIPTION}</HelperTextItem>
            <HelperTextItem>
              For example, Vertex AI providers typically need <strong>project</strong> and{' '}
              <strong>location</strong> keys (e.g., project=my-gcp-project, location=us-central1). AWS
              Bedrock may need <strong>region</strong>.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>

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
              <ExpandableSection
                isExpanded={isInheritedExpanded}
                onToggle={(_event, expanded) => setIsInheritedExpanded(expanded)}
                hasToggleIcon={false}
                toggleContent={(expanded) => (
                  <>
                    {expanded ? <AngleDownIcon aria-hidden /> : <AngleRightIcon aria-hidden />}
                    {' '}
                    {expanded ? 'Hide key-value pairs' : 'Show key-value pairs'}
                  </>
                )}
                data-testid="inherited-provider-config-toggle"
              >
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      These values come from the provider and are available for {'{key}'} resolution
                      in the path. Add an override below to change a value for this model.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
                <InheritedProviderConfig config={inheritedConfig} />
              </ExpandableSection>
            </FormGroup>
          </StackItem>

          <StackItem>
            <FormGroup label="Model configuration" fieldId="provider-ref-model-configuration" isStack>
              <ModelConfigPairsEditor
                pairs={form.configPairs}
                onChange={(configPairs) => onChange({ configPairs })}
              />
            </FormGroup>
          </StackItem>
        </Stack>
      </FormSection>

      <FormSection title="Path configuration" titleElement="h3">
        <FormGroup label="Path" fieldId="provider-ref-path" isRequired isStack>
          <TextInput
            id="provider-ref-path"
            data-testid="provider-ref-path"
            value={form.path}
            onChange={(_event, value) => onChange({ path: value })}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{PATH_PLACEHOLDER_HELPER}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </FormSection>

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

export default EditProviderReferenceForm;
