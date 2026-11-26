/* eslint-disable camelcase */
import * as React from 'react';
import {
  Content,
  Divider,
  ExpandableSection,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuSearch,
  MenuSearchInput,
  MenuToggle,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Slider,
  Title,
} from '@patternfly/react-core';
import { useFormContext, useWatch } from 'react-hook-form';
import GeneratorModelFields from '~/app/components/collectionBuilder/GeneratorModelFields';
import type {
  CollectionBuilderFormValues,
  GeneratorModelSelection,
} from '~/app/schemas/collectionBuilder.schema';
import type { InferenceServiceItem, Provider } from '~/app/types';
import { getGeneratorModelEndpoint } from '~/app/utils/generatorModelUtils';
import './GenerationSettingsFields.scss';

const EXTERNAL_ENDPOINT_VALUE = '__external__';

const MATCH_STEPS = [
  { value: 0, label: 'Include related areas' },
  { value: 50, label: 'Balanced' },
  { value: 100, label: 'Direct matches' },
];

const DEPTH_STEPS = [
  { value: 0, label: 'Quick review' },
  { value: 50, label: 'Balanced' },
  { value: 100, label: 'Thorough review' },
];

type GenerationSettingsFieldsProps = {
  inferenceServices: InferenceServiceItem[];
  inferenceServicesLoaded: boolean;
  inferenceServicesError: Error | undefined;
  selectedModelIsAvailable: boolean;
  providers: Provider[];
  providersLoaded: boolean;
  providersError: Error | undefined;
};

type ModelOption = {
  value: string;
  name: string;
  selection?: GeneratorModelSelection;
  disabledReason?: string;
};

const getModelOptions = (inferenceServices: InferenceServiceItem[]): ModelOption[] =>
  inferenceServices.map((service) => {
    const url = getGeneratorModelEndpoint(service);
    if (!url) {
      return {
        value: service.name,
        name: service.name,
        disabledReason: !service.ready
          ? 'This model is unavailable. Check the model’s deployment status.'
          : service.url?.trim()
            ? 'This model has an invalid endpoint URL.'
            : 'This model does not have an endpoint URL.',
      };
    }
    return {
      value: service.name,
      name: service.name,
      selection: { source: 'cluster', name: service.name, url },
    };
  });

const GenerationSettingsFields: React.FC<GenerationSettingsFieldsProps> = ({
  inferenceServices,
  inferenceServicesLoaded,
  inferenceServicesError,
  selectedModelIsAvailable,
  providers,
  providersLoaded,
  providersError,
}) => {
  const { control, setValue } = useFormContext<CollectionBuilderFormValues>();
  const [isModelSelectOpen, setIsModelSelectOpen] = React.useState(false);
  const [isFrameworkSelectOpen, setIsFrameworkSelectOpen] = React.useState(false);
  const [frameworkSearch, setFrameworkSearch] = React.useState('');
  const [showAdvancedSettings, setShowAdvancedSettings] = React.useState(false);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const selectedModel = useWatch({ control, name: 'generatorModel' });
  const selectedStrictness = useWatch({ control, name: 'strictness' });
  const selectedGenerationEffort = useWatch({ control, name: 'generationEffort' });
  const selectedFrameworks = useWatch({ control, name: 'frameworkFilter' });
  const modelOptions = React.useMemo(() => getModelOptions(inferenceServices), [inferenceServices]);
  const selectedModelValue =
    selectedModel?.source === 'external' ? EXTERNAL_ENDPOINT_VALUE : selectedModel?.name;
  const isExternal = selectedModel?.source === 'external';
  const filteredProviders = React.useMemo(() => {
    const term = frameworkSearch.trim().toLowerCase();
    const filtered = providers.filter((provider) =>
      (provider.title ?? provider.name).toLowerCase().includes(term),
    );
    return filtered.toSorted((left, right) =>
      (left.title ?? left.name).localeCompare(right.title ?? right.name, undefined, {
        sensitivity: 'base',
      }),
    );
  }, [frameworkSearch, providers]);
  const selectedFrameworkLabels = selectedFrameworks.map((providerId) => {
    const provider = providers.find((item) => item.resource.id === providerId);
    return provider?.title ?? provider?.name ?? providerId;
  });

  const handleModelSelect = (
    _event: React.MouseEvent | undefined,
    value: string | number | undefined,
  ) => {
    if (value === EXTERNAL_ENDPOINT_VALUE) {
      setValue(
        'generatorModel',
        { source: 'external', name: '', url: '', auth: { secret_ref: '' } },
        { shouldDirty: true, shouldTouch: true, shouldValidate: true },
      );
    } else if (typeof value === 'string') {
      const option = modelOptions.find((candidate) => candidate.value === value);
      if (option?.selection) {
        setValue('generatorModel', option.selection, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }
    }
    setTouched({});
    setIsModelSelectOpen(false);
  };

  const updateExternalModel = (field: 'name' | 'url' | 'secret_ref', value: string) => {
    if (!isExternal) {
      return;
    }
    const updatedModel: GeneratorModelSelection =
      field === 'secret_ref'
        ? { ...selectedModel, auth: { secret_ref: value } }
        : { ...selectedModel, [field]: value };
    setValue('generatorModel', updatedModel, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const toggleFramework = (providerId: string) => {
    const next = selectedFrameworks.includes(providerId)
      ? selectedFrameworks.filter((id) => id !== providerId)
      : [...selectedFrameworks, providerId];
    setValue('frameworkFilter', next, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <section
      aria-labelledby="generation-settings-title"
      className="evalhub-collection-generation-settings"
    >
      <Title headingLevel="h3" size="lg" id="generation-settings-title" className="pf-v6-u-mb-sm">
        Generation settings
      </Title>
      <Content component="p" className="pf-v6-u-mb-lg">
        This model suggests benchmarks for your goal. It is not the model being evaluated.
      </Content>
      <div className="evalhub-collection-generation-settings__fields">
        <div className="evalhub-collection-generation-settings__model-settings">
          <FormGroup label="Recommendation model" fieldId="recommendation-model-toggle" isRequired>
            <Select
              id="recommendation-model-select"
              isOpen={isModelSelectOpen}
              selected={selectedModelValue}
              onSelect={handleModelSelect}
              onOpenChange={setIsModelSelectOpen}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  id="recommendation-model-toggle"
                  onClick={() => setIsModelSelectOpen((open) => !open)}
                  isExpanded={isModelSelectOpen}
                  isFullWidth
                  className="evalhub-collection-generation-settings__model-toggle"
                  data-testid="recommendation-model-toggle"
                >
                  {selectedModel?.source === 'external'
                    ? 'Other (External endpoint)'
                    : selectedModel?.name || 'Select a model'}
                </MenuToggle>
              )}
              data-testid="recommendation-model-select"
            >
              <SelectList>
                {inferenceServicesLoaded
                  ? modelOptions.map((option) => (
                      <SelectOption
                        key={option.value}
                        value={option.value}
                        isDisabled={!!option.disabledReason}
                        isSelected={
                          selectedModel?.source === 'cluster' && selectedModel.name === option.name
                        }
                        description={option.disabledReason}
                        data-testid={`recommendation-model-option-${option.value}`}
                      >
                        {option.name}
                      </SelectOption>
                    ))
                  : null}
                {inferenceServicesLoaded && modelOptions.length > 0 ? <Divider /> : null}
                <SelectOption
                  value={EXTERNAL_ENDPOINT_VALUE}
                  isSelected={selectedModel?.source === 'external'}
                  data-testid="recommendation-model-option-external"
                >
                  Other (External endpoint)
                </SelectOption>
              </SelectList>
            </Select>
            {inferenceServicesError ? (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="warning">
                    Could not load project models. You can still use an external endpoint.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            ) : null}
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Required model used to suggest benchmarks, not the model being evaluated.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          {isExternal ? (
            <GeneratorModelFields
              modelName={selectedModel.name}
              onModelNameChange={(name) => updateExternalModel('name', name)}
              endpointUrl={selectedModel.url}
              onEndpointUrlChange={(url) => updateExternalModel('url', url)}
              apiKeySecretRef={selectedModel.auth?.secret_ref ?? ''}
              onApiKeyChange={(value) => updateExternalModel('secret_ref', value)}
              touched={touched}
              markTouched={(field) => setTouched((previous) => ({ ...previous, [field]: true }))}
            />
          ) : null}
          {selectedModel?.source === 'cluster' && !selectedModelIsAvailable ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="warning" data-testid="selected-recommendation-model-stale">
                  {inferenceServicesError || !inferenceServicesLoaded
                    ? 'Could not confirm this project model is available. Choose another model or use an external endpoint.'
                    : 'This project model is no longer available or its endpoint has changed. Choose another model or use an external endpoint.'}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : null}
        </div>

        <ExpandableSection
          toggleText={showAdvancedSettings ? 'Hide advanced settings' : 'Show advanced settings'}
          isExpanded={showAdvancedSettings}
          onToggle={(_event, expanded) => setShowAdvancedSettings(expanded)}
          data-testid="generation-advanced-settings"
          className="evalhub-collection-generation-settings__advanced"
        >
          <div className="evalhub-collection-generation-settings__advanced-fields pf-v6-u-pb-md">
            <FormGroup label="Recommendation strictness" fieldId="goal-suite-strictness">
              <Slider
                id="goal-suite-strictness"
                min={0}
                max={100}
                step={1}
                value={
                  selectedStrictness === 'lenient' ? 0 : selectedStrictness === 'strict' ? 100 : 50
                }
                customSteps={MATCH_STEPS}
                onChange={(_event, value) =>
                  setValue(
                    'strictness',
                    value === 0 ? 'lenient' : value === 100 ? 'strict' : 'moderate',
                    { shouldDirty: true, shouldValidate: true },
                  )
                }
                thumbAriaLabel="Recommendation strictness"
                data-testid="goal-suite-strictness"
              />
            </FormGroup>
            <FormGroup label="Recommendation depth" fieldId="goal-suite-generation-effort">
              <Slider
                id="goal-suite-generation-effort"
                min={0}
                max={100}
                step={1}
                value={
                  selectedGenerationEffort === 'low'
                    ? 0
                    : selectedGenerationEffort === 'high'
                      ? 100
                      : 50
                }
                customSteps={DEPTH_STEPS}
                onChange={(_event, value) =>
                  setValue(
                    'generationEffort',
                    value === 0 ? 'low' : value === 100 ? 'high' : 'standard',
                    { shouldDirty: true, shouldValidate: true },
                  )
                }
                thumbAriaLabel="Recommendation depth"
                data-testid="goal-suite-generation-effort"
              />
            </FormGroup>
            <FormGroup label="Framework" fieldId="framework-filter-toggle">
              <Select
                id="framework-filter-select"
                isOpen={isFrameworkSelectOpen}
                selected={selectedFrameworks}
                onSelect={(_event, value) => {
                  if (typeof value === 'string') {
                    toggleFramework(value);
                  }
                }}
                onOpenChange={(open) => {
                  setIsFrameworkSelectOpen(open);
                  if (!open) {
                    setFrameworkSearch('');
                  }
                }}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    id="framework-filter-toggle"
                    onClick={() => setIsFrameworkSelectOpen((open) => !open)}
                    isExpanded={isFrameworkSelectOpen}
                    isFullWidth
                    className="evalhub-collection-generation-settings__framework-toggle"
                    data-testid="framework-filter-toggle"
                  >
                    {selectedFrameworkLabels.length > 0
                      ? selectedFrameworkLabels.join(', ')
                      : 'Select frameworks'}
                  </MenuToggle>
                )}
                data-testid="framework-filter-select"
              >
                <MenuSearch>
                  <MenuSearchInput>
                    <SearchInput
                      aria-label="Search frameworks"
                      placeholder="Search frameworks"
                      value={frameworkSearch}
                      onChange={(_event, value) => setFrameworkSearch(value)}
                      onClear={() => setFrameworkSearch('')}
                      data-testid="framework-filter-search"
                    />
                  </MenuSearchInput>
                </MenuSearch>
                <SelectList>
                  {filteredProviders.map((provider) => (
                    <SelectOption
                      key={provider.resource.id}
                      value={provider.resource.id}
                      hasCheckbox
                      isSelected={selectedFrameworks.includes(provider.resource.id)}
                      data-testid={`framework-filter-option-${provider.resource.id}`}
                    >
                      {provider.title ?? provider.name}
                    </SelectOption>
                  ))}
                  {providersLoaded && filteredProviders.length === 0 ? (
                    <SelectOption isDisabled>No frameworks found</SelectOption>
                  ) : null}
                </SelectList>
              </Select>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem data-testid="framework-filter-helper">
                    {providersError
                      ? selectedFrameworks.length > 0
                        ? 'Framework names could not be loaded. Selected framework IDs will still be used.'
                        : 'Frameworks could not be loaded. Leave the selection empty to search all frameworks.'
                      : 'Select frameworks to limit recommendations; leave empty to include them all.'}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </div>
        </ExpandableSection>
      </div>
    </section>
  );
};

export default GenerationSettingsFields;
/* eslint-enable camelcase */
