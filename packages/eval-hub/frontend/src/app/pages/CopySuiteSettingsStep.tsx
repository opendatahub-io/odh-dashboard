import * as React from 'react';
import {
  ActionGroup,
  Button,
  Form,
  FormGroup,
  Label,
  LabelGroup,
  MenuSearch,
  MenuSearchInput,
  MenuToggle,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { Controller, useFormContext } from 'react-hook-form';
import BenchmarkThresholdField from '~/app/components/BenchmarkThresholdField';
import { formatCollectionMetadataValue } from '~/app/components/benchmarkUtils';
import { COLLECTION_METADATA_OPTIONS, SUITE_EVALUATES_OPTIONS } from '~/app/pages/const';
import type { CopySuiteFormValues } from '~/app/schemas/copySuite.schema';

type CopySuiteSettingsStepProps = {
  onNext: () => void;
  onCancel: () => void;
};

type CollectionMetadataFieldName =
  'suiteEvaluates' | 'suiteDomains' | 'suiteTasks' | 'suiteModalities' | 'suiteIndustries';

type CollectionMetadataFieldProps = {
  name: CollectionMetadataFieldName;
  label: string;
  selectionLabels: {
    singular: string;
    plural: string;
  };
  fieldId: string;
  testId: string;
  options: readonly string[];
};

const CollectionMetadataField: React.FC<CollectionMetadataFieldProps> = ({
  name,
  label,
  selectionLabels,
  fieldId,
  testId,
  options,
}) => {
  const { control } = useFormContext<CopySuiteFormValues>();
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const filteredOptions = React.useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return options.filter((option) => option.toLowerCase().includes(normalizedSearch));
  }, [options, search]);

  return (
    <FormGroup label={label} fieldId={fieldId}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const selected = field.value;

          return (
            <>
              <Select
                id={`${fieldId}-menu`}
                role="menu"
                data-testid={`${testId}-select`}
                isOpen={isOpen}
                selected={selected}
                onSelect={(_event, value) => {
                  if (typeof value === 'string') {
                    field.onChange(
                      selected.some((item) => item === value)
                        ? selected.filter((item) => item !== value)
                        : [...selected, value],
                    );
                  }
                }}
                onOpenChange={(open) => {
                  setIsOpen(open);
                  if (!open) {
                    setSearch('');
                  }
                }}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    id={fieldId}
                    onClick={() => setIsOpen((previous) => !previous)}
                    isExpanded={isOpen}
                    isFullWidth
                    data-testid={`${testId}-toggle`}
                  >
                    {selected.length > 0
                      ? `${selected.length} ${
                          selected.length === 1 ? selectionLabels.singular : selectionLabels.plural
                        } selected`
                      : `Select ${label.toLowerCase()}`}
                  </MenuToggle>
                )}
                maxMenuHeight="400px"
              >
                <MenuSearch>
                  <MenuSearchInput>
                    <SearchInput
                      aria-label={`Search ${label.toLowerCase()}`}
                      placeholder={`Search ${label.toLowerCase()}`}
                      value={search}
                      onChange={(_event, value) => setSearch(value)}
                      onClear={() => setSearch('')}
                      data-testid={`${testId}-search-input`}
                    />
                  </MenuSearchInput>
                </MenuSearch>
                <SelectList>
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((option) => (
                      <SelectOption
                        key={option}
                        value={option}
                        hasCheckbox
                        isSelected={selected.some((item) => item === option)}
                        data-testid={`${testId}-option-${option}`}
                      >
                        {formatCollectionMetadataValue(option)}
                      </SelectOption>
                    ))
                  ) : (
                    <SelectOption isDisabled>No results found</SelectOption>
                  )}
                </SelectList>
              </Select>

              {selected.length > 0 ? (
                <LabelGroup isCompact className="pf-v6-u-mt-sm" data-testid={`${testId}-tags`}>
                  {selected.map((value) => (
                    <Label
                      key={value}
                      variant="outline"
                      data-testid={`${testId}-tag-${value}`}
                      onClose={() => field.onChange(selected.filter((item) => item !== value))}
                    >
                      {formatCollectionMetadataValue(value)}
                    </Label>
                  ))}
                </LabelGroup>
              ) : null}
            </>
          );
        }}
      />
    </FormGroup>
  );
};

const CopySuiteSettingsStep: React.FC<CopySuiteSettingsStepProps> = ({ onNext, onCancel }) => {
  const { control, watch } = useFormContext<CopySuiteFormValues>();
  const suiteName = watch('suiteName');
  const isSettingsValid = suiteName.trim() !== '';

  return (
    <div id="copy-suite-step-content-settings" data-testid="copy-suite-step-settings">
      <Form id="copy-suite-form" style={{ maxWidth: 840 }} data-testid="copy-suite-form">
        <FormGroup label="Suite name" isRequired fieldId="suite-name">
          <Controller
            name="suiteName"
            control={control}
            render={({ field }) => (
              <TextInput
                id="suite-name"
                data-testid="suite-name-input"
                value={field.value}
                onChange={(_event, value) => field.onChange(value)}
                onBlur={field.onBlur}
                isRequired
              />
            )}
          />
        </FormGroup>

        <FormGroup label="Description" fieldId="suite-description">
          <Controller
            name="suiteDescription"
            control={control}
            render={({ field }) => (
              <TextArea
                id="suite-description"
                data-testid="suite-description-input"
                value={field.value}
                onChange={(_event, value) => field.onChange(value)}
                onBlur={field.onBlur}
                resizeOrientation="vertical"
              />
            )}
          />
        </FormGroup>

        <CollectionMetadataField
          name="suiteEvaluates"
          label="Evaluates"
          selectionLabels={{ singular: 'target', plural: 'targets' }}
          fieldId="suite-evaluates"
          testId="suite-evaluates"
          options={SUITE_EVALUATES_OPTIONS}
        />

        <CollectionMetadataField
          name="suiteDomains"
          label="Category"
          selectionLabels={{ singular: 'category', plural: 'categories' }}
          fieldId="suite-domains"
          testId="suite-domains"
          options={COLLECTION_METADATA_OPTIONS.domains}
        />

        <CollectionMetadataField
          name="suiteTasks"
          label="Tasks"
          selectionLabels={{ singular: 'task', plural: 'tasks' }}
          fieldId="suite-tasks"
          testId="suite-tasks"
          options={COLLECTION_METADATA_OPTIONS.tasks}
        />

        <CollectionMetadataField
          name="suiteModalities"
          label="Modalities"
          selectionLabels={{ singular: 'modality', plural: 'modalities' }}
          fieldId="suite-modalities"
          testId="suite-modalities"
          options={COLLECTION_METADATA_OPTIONS.modalities}
        />

        <CollectionMetadataField
          name="suiteIndustries"
          label="Industries"
          selectionLabels={{ singular: 'industry', plural: 'industries' }}
          fieldId="suite-industries"
          testId="suite-industries"
          options={COLLECTION_METADATA_OPTIONS.industries}
        />

        <Controller
          name="suiteThreshold"
          control={control}
          render={({ field }) => (
            <BenchmarkThresholdField
              value={field.value}
              onChange={field.onChange}
              label="Suite threshold"
              description="Set the minimum passing score for this suite. Results below this threshold are marked as failing."
              fieldId="suite-threshold"
            />
          )}
        />

        <ActionGroup>
          <Button
            variant="primary"
            data-testid="copy-suite-next"
            onClick={onNext}
            isDisabled={!isSettingsValid}
          >
            Next
          </Button>
          <Button variant="link" data-testid="copy-suite-cancel" onClick={onCancel}>
            Cancel
          </Button>
        </ActionGroup>
      </Form>
    </div>
  );
};

export default CopySuiteSettingsStep;
